import json
import logging
import os
import re

# File-based mutex: only one agent session can run at a time across all forked processes
_AGENT_LOCK_PATH = "/tmp/voicedeck-agent.lock"

from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    RunContext,
    cli,
    get_job_context,
)
from livekit.agents.llm import function_tool
from livekit.plugins import cartesia, groq

from slides import SLIDES, build_system_prompt

load_dotenv()

# Structured logging — emit JSON to stdout so the log tail is grep-friendly
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("voicedeck-agent")

_DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant"


async def _strip_artifacts(text_stream):
    """Buffer full TTS chunk and strip XML tags / tool call syntax before Cartesia speaks it."""
    full = ""
    async for chunk in text_stream:
        full += chunk
    # Remove XML/HTML tags: <agent_shifting>, <output>, etc.
    full = re.sub(r"<[^>]+>", " ", full)
    # Remove function call notation: navigate_to_slide={"index": 2}
    full = re.sub(r"\w+=\{[^}]*\}", " ", full)
    # Remove leaked JSON blobs
    full = re.sub(r"\{[^}]{0,300}\}", " ", full)
    # Remove markdown bold/italic asterisks
    full = re.sub(r"\*+([^*]*)\*+", r"\1", full)
    # Collapse whitespace
    full = re.sub(r" {2,}", " ", full).strip()
    if full:
        yield full
_DEFAULT_CARTESIA_VOICE = "f786b574-daa5-4673-aa0c-cbe3e8534c02"


class PresentationAgent(Agent):
    def __init__(self, current_slide_index: int = 0) -> None:
        self._current_slide_index = current_slide_index
        logger.info(
            "[AGENT] PresentationAgent.__init__  slide=%d", current_slide_index
        )
        super().__init__(
            instructions=build_system_prompt(current_slide_index),
        )

    async def on_enter(self) -> None:
        logger.info("[AGENT] on_enter — using say() to bypass LLM for fixed intro")
        intro = (
            "Hi, I'm VoiceDeck AI, your voice-powered presentation assistant. "
            "I can guide you through a six-slide talk called The Future of Agentic AI, "
            "covering topics from how AI became agentic all the way to what's coming next. "
            "Would you like me to walk through it from the beginning, "
            "or is there a specific topic you'd like to jump to?"
        )
        try:
            await self.session.say(intro)
            logger.info("[AGENT] on_enter: say() returned")
        except AttributeError:
            # Fallback for older SDK versions without say()
            logger.warning("[AGENT] session.say() unavailable, falling back to generate_reply")
            await self.session.generate_reply(
                instructions=(
                    "Say this exactly, with no changes and no tool calls: " + intro
                )
            )

    @function_tool
    async def navigate_to_slide(
        self, _context: RunContext, index: int, reason: str
    ) -> str:
        """Navigate the presentation to a specific slide.

        Args:
            index: The zero-based index of the slide to navigate to (0-5)
            reason: Brief explanation of why this slide is relevant to the user's question
        """
        clamped = max(0, min(index, len(SLIDES) - 1))
        logger.info(
            "[TOOL] navigate_to_slide  requested=%d  clamped=%d  reason=%r",
            index,
            clamped,
            reason,
        )

        # Guard: already on this slide — don't re-navigate, just talk about it
        if clamped == self._current_slide_index:
            slide = SLIDES[clamped]
            logger.info("[TOOL] navigate_to_slide: already on slide %d, no navigation needed", clamped)
            return (
                f"Already on slide {clamped}: '{slide['title']}'. "
                f"Continue talking about it. Speaker notes: {slide['speaker_notes']}"
            )

        try:
            payload = json.dumps({"type": "navigate", "goToSlide": clamped}).encode()
            await get_job_context().room.local_participant.publish_data(
                payload, reliable=True
            )
            logger.info("[TOOL] navigate_to_slide: data published to room")
        except Exception as e:
            logger.error("[TOOL] navigate_to_slide: publish_data failed: %s", e, exc_info=True)

        self._current_slide_index = clamped
        slide = SLIDES[clamped]
        self.update_instructions(build_system_prompt(clamped))
        return (
            f"Navigation complete. Now on slide {clamped}: '{slide['title']}'. "
            f"Introduce this slide now. Speaker notes: {slide['speaker_notes']}"
        )


def _make_session() -> AgentSession:
    groq_model = os.environ.get("GROQ_MODEL", _DEFAULT_GROQ_MODEL)
    cartesia_voice = os.environ.get("CARTESIA_VOICE_ID", _DEFAULT_CARTESIA_VOICE)
    logger.info(
        "[SESSION] Creating AgentSession  groq_model=%r  cartesia_voice=%r",
        groq_model,
        cartesia_voice,
    )
    return AgentSession(
        stt=groq.STT(model="whisper-large-v3-turbo"),
        llm=groq.LLM(model=groq_model),
        tts=cartesia.TTS(model="sonic-3", voice=cartesia_voice),
        tts_text_transforms=[_strip_artifacts],
    )


def _attach_session_logging(session: AgentSession) -> None:
    """Wire up every observable AgentSession event to the logger."""

    # ---- STT events ----
    try:
        from livekit.agents import stt as stt_mod

        @session.on("user_input_transcribed")
        def on_user_input_transcribed(ev) -> None:
            logger.info(
                "[STT] user_input_transcribed  is_final=%s  text=%r",
                getattr(ev, "is_final", "?"),
                getattr(ev, "transcript", ""),
            )

    except Exception:
        pass

    # ---- Agent state changes ----
    try:
        @session.on("agent_state_changed")
        def on_agent_state_changed(ev) -> None:
            logger.info(
                "[AGENT] agent_state_changed  old=%s  new=%s",
                getattr(ev, "old_state", "?"),
                getattr(ev, "new_state", "?"),
            )

    except Exception:
        pass

    # ---- Conversation item added (LLM input/output) ----
    try:
        @session.on("conversation_item_added")
        def on_conversation_item_added(ev) -> None:
            item = getattr(ev, "item", None)
            if item is None:
                return
            role = getattr(item, "role", "?")
            content = getattr(item, "content", None)
            text = ""
            if content:
                if isinstance(content, str):
                    text = content[:200]
                elif hasattr(content, "__iter__"):
                    parts = []
                    for part in content:
                        if hasattr(part, "text"):
                            parts.append(part.text)
                    text = " ".join(parts)[:200]
            logger.info("[LLM] conversation_item_added  role=%s  text=%r", role, text)

    except Exception:
        pass

    # ---- TTS events ----
    try:
        @session.on("agent_speech_committed")
        def on_agent_speech_committed(ev) -> None:
            logger.info(
                "[TTS] agent_speech_committed  text=%r",
                str(getattr(ev, "user_msg", ev))[:200],
            )

    except Exception:
        pass

    try:
        @session.on("agent_speech_interrupted")
        def on_agent_speech_interrupted(_ev) -> None:
            logger.info("[TTS] agent_speech_interrupted (barge-in)")

    except Exception:
        pass

    # ---- Catch-all for debugging: log ALL emitted event names ----
    original_emit = getattr(session, "emit", None)
    if original_emit and callable(original_emit):
        def patched_emit(event_name, *args, **kwargs):
            logger.debug("[SESSION.emit] %s", event_name)
            return original_emit(event_name, *args, **kwargs)
        session.emit = patched_emit


server = AgentServer()


@server.rtc_session()
async def entrypoint(ctx: JobContext) -> None:
    logger.info("[ENTRYPOINT] Job received  room=%s  job_id=%s", ctx.room.name, getattr(ctx, 'job_id', '?'))

    # Process-safe mutex: O_CREAT|O_EXCL is atomic across forked processes.
    # The first job to arrive creates the lock file and runs; every subsequent
    # job finds the file already exists and exits immediately.
    try:
        fd = os.open(_AGENT_LOCK_PATH, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.close(fd)
        logger.info("[ENTRYPOINT] Acquired agent lock — proceeding")
    except FileExistsError:
        logger.warning("[ENTRYPOINT] Lock held by another job — exiting duplicate")
        return

    session = _make_session()
    _attach_session_logging(session)

    agent = PresentationAgent(current_slide_index=0)

    # Listen for frontend → agent data channel messages
    # NOTE: livekit-python requires a SYNC callback on .on() — use asyncio.create_task for async work
    import asyncio as _asyncio

    @ctx.room.on("data_received")
    def on_data_received(data_packet) -> None:
        async def _handle():
            try:
                raw_bytes = data_packet.data if hasattr(data_packet, "data") else bytes(data_packet)
                msg = json.loads(raw_bytes.decode())
                logger.info("[DATA] received from frontend: %s", msg)
            except Exception as e:
                logger.error("[DATA] data_received handler error: %s", e, exc_info=True)
        _asyncio.create_task(_handle())

    try:
        logger.info("[ENTRYPOINT] Calling session.start()...")
        await session.start(agent=agent, room=ctx.room)
        logger.info("[ENTRYPOINT] session.start() returned — agent is live")
    finally:
        try:
            os.unlink(_AGENT_LOCK_PATH)
            logger.info("[ENTRYPOINT] Released agent lock")
        except OSError:
            pass


async def _purge_stale_dispatches() -> None:
    """Delete all pending LiveKit dispatches for voicedeck-room before startup.

    Without this, stale dispatches from a previous crashed agent are picked up
    by the new worker and cause duplicate sessions.
    """
    import asyncio as _aio
    livekit_url = os.environ.get("LIVEKIT_URL", "").replace("wss://", "https://")
    api_key = os.environ.get("LIVEKIT_API_KEY", "")
    api_secret = os.environ.get("LIVEKIT_API_SECRET", "")
    if not (livekit_url and api_key and api_secret):
        return
    try:
        from livekit import api as lk_api
        lk = lk_api.LiveKitAPI(livekit_url, api_key, api_secret)
        dispatches = await lk.agent_dispatch.list_dispatch("voicedeck-room")
        for d in dispatches:
            try:
                await lk.agent_dispatch.delete_dispatch(d.id, "voicedeck-room")
                logger.info("[STARTUP] Deleted stale dispatch %s", d.id)
            except Exception as e:
                logger.debug("[STARTUP] Could not delete dispatch %s: %s", d.id, e)
        await lk.aclose()
    except Exception as e:
        logger.debug("[STARTUP] Stale dispatch cleanup skipped: %s", e)


if __name__ == "__main__":
    # Clean up stale lock from a previous crash
    try:
        os.unlink(_AGENT_LOCK_PATH)
        logger.info("[STARTUP] Removed stale agent lock")
    except OSError:
        pass
    import asyncio as _startup_asyncio
    _startup_asyncio.run(_purge_stale_dispatches())
    cli.run_app(server)
