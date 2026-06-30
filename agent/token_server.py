import asyncio
import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from livekit import api
from livekit.api import CreateAgentDispatchRequest

load_dotenv()

logger = logging.getLogger("token-server")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

ROOM_NAME = "voicedeck-room"
AGENT_NAME = ""  # matches the worker's registered agent_name (empty = default)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

_dispatch_lock = asyncio.Lock()


async def _ensure_one_dispatch() -> None:
    livekit_url = os.environ.get("LIVEKIT_URL", "").replace("wss://", "https://")
    api_key = os.environ.get("LIVEKIT_API_KEY", "")
    api_secret = os.environ.get("LIVEKIT_API_SECRET", "")
    if not (livekit_url and api_key and api_secret):
        return

    lk = api.LiveKitAPI(livekit_url, api_key, api_secret)
    try:
        # Purge any stale dispatches from previous sessions
        try:
            existing = await lk.agent_dispatch.list_dispatch(ROOM_NAME)
            for d in existing:
                try:
                    await lk.agent_dispatch.delete_dispatch(d.id, ROOM_NAME)
                    logger.info("[DISPATCH] Deleted stale dispatch %s", d.id)
                except Exception:
                    pass
        except Exception:
            pass  # room doesn't exist yet

        result = await lk.agent_dispatch.create_dispatch(
            CreateAgentDispatchRequest(room=ROOM_NAME, agent_name=AGENT_NAME)
        )
        logger.info("[DISPATCH] Created %s", result.id)
    except Exception as e:
        logger.error("[DISPATCH] Failed: %s", e)
    finally:
        await lk.aclose()


@app.get("/get-token")
async def get_token():
    api_key = os.environ.get("LIVEKIT_API_KEY")
    api_secret = os.environ.get("LIVEKIT_API_SECRET")
    if not api_key or not api_secret:
        raise HTTPException(status_code=500, detail="Missing LiveKit credentials")

    token = (
        api.AccessToken(api_key, api_secret)
        .with_identity("user")
        .with_name("User")
        .with_grants(api.VideoGrants(room_join=True, room=ROOM_NAME))
        .to_jwt()
    )

    async with _dispatch_lock:
        await _ensure_one_dispatch()

    return {"token": token}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
