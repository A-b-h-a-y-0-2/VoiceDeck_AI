# VoiceDeck AI

**A voice-first AI presentation agent** — speak to it, and it narrates a six-slide deck on the Future of Agentic AI, routes to the right slide based on what you ask, handles barge-in, and talks back in natural speech. Built on LiveKit Agents, Groq, and Cartesia.

---

## Demo

<video src="ABHAY_CHAUDHARY_SUBMISSION.mov" controls width="100%"></video>

> If the video doesn't play inline, [download it here](ABHAY_CHAUDHARY_SUBMISSION.mov).

**What the demo shows:**

- User interrupts the AI mid-intro — Cartesia TTS stops immediately (barge-in)
- "Tell me about the tool use revolution" → agent navigates to slide 2 and answers from it
- Follow-up question stays on slide 2 — no unnecessary re-navigation
- Off-topic question about data retention → agent pivots to the Safety slide (slide 4) and answers from a relevant angle, rather than refusing
- "You can continue" → agent advances to What's Next and wraps the arc

---

## Features

- **Silero VAD** with barge-in detection that interrupts Cartesia TTS mid-stream when the user speaks
- **Groq Whisper large-v3-turbo** for low-latency STT — audio chunk to transcript in ~300ms
- **Groq LLM tool calling** (`navigate_to_slide`) for semantic slide routing — not keyword matching
- **Cartesia sonic-3** sentence-streaming TTS — first audio plays within ~1–1.5 seconds of the user finishing speaking
- **AEC-first microphone** (`getUserMedia` with `echoCancellation: true`) preventing TTS audio from re-triggering VAD
- **Data channel slide events** — the agent sends `{ "type": "navigate", "goToSlide": N }` over LiveKit's reliable data channel; the frontend updates state and animates the transition
- **Guardrails AI output validation** — `ToxicLanguage` hub validator with keyword fallback; system-prompt topic lock as the first line of defense
- **File-based process mutex** — prevents duplicate agent sessions from stale LiveKit dispatches surviving a restart
- **Spring-physics slide transitions** with Framer Motion `layoutId` for the card-to-fullscreen shared-element animation

---

## Architecture

```
User mic (browser)
    ↓
getUserMedia({ echoCancellation: true, noiseSuppression: true, sampleRate: 16000 })
    ↓
LiveKit Client SDK (frontend) → LiveKit Cloud Room
    ↓
LiveKit Agent Process (Python backend)
    ├── Silero VAD           → detects speech start/end
    ├── Groq Whisper STT     → audio chunk → transcript
    ├── Groq LLM             → transcript + slide context → response + optional goToSlide
    ├── Guardrails AI        → validate LLM output before TTS
    └── Cartesia TTS         → text → streaming audio back to LiveKit room
    ↓
LiveKit Client SDK (frontend) receives audio + data channel events
    ↓
Browser plays audio + React updates slide state
```

### Why LiveKit Agents over raw WebSockets or WebRTC

LiveKit is production voice AI infrastructure. Building the audio pipeline from scratch would mean implementing acoustic echo cancellation, voice activity detection, jitter buffers, DTLS handshakes, and opus codec handling — all solved problems. Using LiveKit Agents demonstrates platform judgment over academic reinvention. The framework handles VAD, turn detection, barge-in coordination, and audio streaming, which lets this project focus on the product layer: what the agent says, when it navigates, and how the frontend responds.

### Why LLM tool calling over semantic search for slide routing

With 6 slides, passing all slide metadata in the system prompt and letting the LLM call `navigate_to_slide(index, reason)` is faster, more reliable, and costs ~150 tokens per turn. The LLM understands the user's intent and selects the right slide even for oblique questions — "is there any safeguard to protect us from data retention?" routes to the Safety slide without any keyword matching. Semantic search makes sense at 100+ slides — see Future Work.

### Why sentence-level TTS streaming

Rather than waiting for the full LLM response before synthesizing audio, tokens are buffered until a sentence boundary, then immediately dispatched to Cartesia. This gets first audio playing within ~1–1.5 seconds of the user finishing speaking. A `_strip_artifacts` transform runs before TTS to remove any XML tags, JSON blobs, or tool call syntax that Groq occasionally leaks into the text stream.

---

## Tech Stack

| Layer | Tool | Why |
|---|---|---|
| Agent framework | LiveKit Agents v1.6.4 | Production voice AI infra — VAD, barge-in, audio pipeline |
| STT | Groq Whisper large-v3-turbo | Fast, accurate, runs on Groq inference hardware |
| LLM | Groq llama-3.3-70b-versatile | Reliable tool calling — smaller models miss `navigate_to_slide` invocations |
| TTS | Cartesia sonic-3 | Low-latency streaming; sentence-level dispatch for fast first audio |
| VAD | Silero (bundled in LiveKit Agents) | Built-in, no extra config — just works |
| Output validation | Guardrails AI + ToxicLanguage | Runtime content filter on LLM output before TTS |
| Frontend framework | React 18 + Vite | Fast dev iteration; hooks-based LiveKit integration |
| Animations | Framer Motion (`motion/react`) | `layoutId` for shared-element slide transitions; spring physics throughout |
| LiveKit UI | `@livekit/components-react` | `BarVisualizer` + `useVoiceAssistant` for agent state and output waveform |
| Styling | Tailwind CSS v3 | Utility-first; no custom CSS needed for the design system |
| Token server | FastAPI + uvicorn | Minimal JWT endpoint; also manages LiveKit dispatch lifecycle |
| Deployment | Railway | Two services (agent + frontend) in one project |

---

## Setup

### Prerequisites

- Node.js 18+
- Python 3.11 — **not 3.14** (see note below)
- API keys: [LiveKit Cloud](https://livekit.io), [Groq](https://console.groq.com), [Cartesia](https://cartesia.ai)

**Python 3.14 note:** Python 3.14 has a `libexpat` symbol conflict that breaks pip when installing C-extension packages (`av`, `sounddevice`, numpy wheels). Use 3.11:

```bash
pyenv install 3.11.9
pyenv local 3.11.9
```

### Clone and configure

```bash
git clone https://github.com/A-b-h-a-y-0-2/VoiceSlider-AI
cd VoiceSlider-AI

cp agent/.env.example agent/.env
cp frontend/.env.example frontend/.env
```

Fill in `agent/.env`:

| Variable | Description |
|---|---|
| `LIVEKIT_URL` | Your LiveKit Cloud WebSocket URL (`wss://...`) |
| `LIVEKIT_API_KEY` | LiveKit API key |
| `LIVEKIT_API_SECRET` | LiveKit API secret |
| `GROQ_API_KEY` | Groq API key |
| `CARTESIA_API_KEY` | Cartesia API key |
| `GROQ_MODEL` | LLM model name (default: `llama-3.3-70b-versatile`) |
| `CARTESIA_VOICE_ID` | Cartesia voice ID (default: `f786b574-daa5-4673-aa0c-cbe3e8534c02`) |

Fill in `frontend/.env`:

| Variable | Description |
|---|---|
| `VITE_LIVEKIT_URL` | Same LiveKit URL as above |
| `VITE_TOKEN_ENDPOINT` | `http://localhost:8080/get-token` (local) or Railway URL (deployed) |

### Install

```bash
# Backend
cd agent
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
guardrails hub install hub://guardrails/toxic_language  # optional, falls back to keyword filter

# Frontend
cd ../frontend
npm install
```

### Run

Three terminals:

```bash
# Terminal 1 — LiveKit agent
cd agent && source .venv/bin/activate && python main.py dev

# Terminal 2 — Token server
cd agent && source .venv/bin/activate && python token_server.py

# Terminal 3 — Frontend
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173), click the mic button, and start talking.

---

## Guardrails

**What's implemented:** Two layers. The system prompt is the first — it's topic-locked to the presentation content, with explicit instructions that the agent only answers questions about the 6 slides and redirects anything off-topic. The second layer is `guardrails-ai` with the `ToxicLanguage` hub validator, which runs on every LLM output string before it reaches Cartesia. If the validator flags content, the agent substitutes `"Let me redirect us back to the presentation."` The hub install is optional — if it fails (network issue, offline), the config falls back to a keyword-based filter so the validation layer never silently disappears.

**What production requires:** `guardrails-ai` catches output-level toxicity, but it doesn't enforce conversation-level policies (e.g., "never answer more than 3 consecutive off-topic questions"). That's what NeMo Guardrails does — Colang-defined rails that operate at the dialogue management layer, not the string level. For hallucination monitoring and agentic trajectory auditing (was the right tool called? did the LLM reason correctly across turns?), Galileo provides per-turn scoring. I didn't add these for this prototype because the scope is a 2-day demo, not because they're optional in a shipped product.

---

## Future Work

### Semantic slide routing at scale

For 6 slides, LLM routing via the system prompt is the right call — fast, zero infra, reliable. At 100+ slides (a real conference deck, a product training course), this breaks down: the system prompt gets bloated and the LLM loses routing precision. The right architecture is to embed slide titles and summaries using a text embedding model (`text-embedding-3-small` or equivalent), index them in a vector store, embed the user query at runtime, retrieve top-k semantically similar slides, and pass only those to the LLM for final routing. This keeps context lean and scales to any deck size without degrading accuracy.

### Mid-word interruption

The current implementation stops TTS at sentence boundaries when the user speaks. A better experience cancels audio mid-word — the user speaks, the AI stops exactly there, no trailing syllable finishes. This requires tracking which audio chunks have been dispatched versus confirmed played, maintaining a flush queue on the TTS side, and coordinating LLM stream cancellation with the Cartesia buffer. LiveKit's RTMS makes the audio tracking addressable; it's an afternoon of work with the right primitives already in place.

### Open-source self-hosted TTS

Cartesia sonic-3 is fast and high quality, but it's cloud-dependent and billed per character. For a self-hosted stack, Kokoro TTS is an open-source alternative worth evaluating — though its streaming latency characteristics in a WebRTC context need validation before committing to it. A hybrid would use Cartesia for primary delivery and fall back to a self-hosted model for cost control at scale, with the TTS plugin abstracted behind an interface that both implementations satisfy.

### Multi-language support

Groq Whisper detects the speaker's language automatically. Cartesia sonic-3 supports EN, ES, FR, DE, PT, ZH, and JA. Wiring these together — detect language from STT output, pass it to the TTS plugin, update the system prompt to respond in kind — is straightforward. The missing piece is the slide content itself: the system prompt currently contains English slide text, so the agent would respond in the detected language but its grounding content would remain English. The clean solution is pre-translated slide variants per language, selected at session start.

### Production guardrails

Guardrails AI with keyword fallback is sufficient for a demo. Production requires three layers that this prototype only partially covers: NeMo Guardrails for Colang-defined conversation policies that prevent topic drift at the rail level (not just the prompt level), Galileo for per-turn hallucination scoring and agentic trajectory auditing, and input-side validation to catch prompt injection attempts before they reach the LLM. The system prompt guardrail is the first line; runtime output validators are the second; monitoring and alerting is the third.

### Slide thumbnail navigation strip

A horizontal strip below the main slide showing all 6 as thumbnails, with the active one highlighted. Clicking any thumbnail jumps directly to that slide and the agent narrates the new content. This makes the app feel like a real presentation tool rather than a linear demo. Framer Motion `layoutId` already handles the shared-element transition between the thumbnail and the main card — it's a layout addition, not a new animation system.

---

## Deployment

Two Railway services in the same project:

**Service 1: `agent`**
- Root directory: `agent/`
- Build: `pip install -r requirements.txt`
- Start: see `agent/Dockerfile` (runs agent process + uvicorn token server)
- Env vars: all 7 from `agent/.env.example`

**Service 2: `frontend`**
- Root directory: `frontend/`
- Build: `npm run build`
- Start: `npx serve dist`
- Env vars: `VITE_LIVEKIT_URL`, `VITE_TOKEN_ENDPOINT` (set to the Service 1 Railway URL + `/get-token`)
