SLIDES = [
    {
        "index": 0,
        "title": "The Age of Agentic AI",
        "summary": "AI systems that plan, act, and iterate autonomously",
        "speaker_notes": "Welcome. Today we're exploring how AI is shifting from answering questions to taking actions. The age of agentic AI is here.",
        "bullets": [
            "AI moving from reactive to proactive",
            "Planning, memory, and tool use",
            "From single prompts to multi-step workflows",
        ],
    },
    {
        "index": 1,
        "title": "From Chatbots to Agents",
        "summary": "The architectural shift from stateless chat to memory and action",
        "speaker_notes": "Classic chatbots forget every message. Agents remember context, plan across steps, and take actions in the real world.",
        "bullets": [
            "Stateless chat to persistent memory",
            "Single-turn to multi-step planning",
            "Text output to real-world actions",
        ],
    },
    {
        "index": 2,
        "title": "The Tool-Use Revolution",
        "summary": "Agents that call APIs, browse the web, write code, and more",
        "speaker_notes": "The real unlock was giving LLMs tools. Search, code execution, file access — agents can now interact with the world, not just describe it.",
        "bullets": [
            "Web search, code execution, file I/O",
            "Function calling and tool use as a core primitive",
            "From language models to action models",
        ],
    },
    {
        "index": 3,
        "title": "Multi-Agent Systems",
        "summary": "Agents coordinating with other agents to solve complex problems",
        "speaker_notes": "No single agent does everything well. Multi-agent systems split work: a planner delegates to specialists, each focused on what it does best.",
        "bullets": [
            "Orchestrator and specialist agent patterns",
            "Parallel and sequential task execution",
            "Trust boundaries between agents",
        ],
    },
    {
        "index": 4,
        "title": "Safety and Guardrails",
        "summary": "Why alignment and runtime safety matter more as autonomy grows",
        "speaker_notes": "The more autonomous an agent, the higher the stakes. Guardrails are not optional — they're the difference between a useful agent and a destructive one.",
        "bullets": [
            "Prompt injection and adversarial inputs",
            "Output validation and runtime filtering",
            "Human-in-the-loop for irreversible actions",
        ],
    },
    {
        "index": 5,
        "title": "What's Next",
        "summary": "The near future of agentic AI — longer horizons, better reasoning",
        "speaker_notes": "We're still early. The next wave will bring agents that plan over days, coordinate thousands of sub-agents, and operate with near-zero human supervision.",
        "bullets": [
            "Long-horizon task completion",
            "Self-improving agent architectures",
            "AI systems that run entire workflows autonomously",
        ],
    },
]

SLIDE_INDEX = {s["index"]: s for s in SLIDES}


def build_system_prompt(current_index: int) -> str:
    current = SLIDE_INDEX.get(current_index, SLIDES[0])
    slide_list = "\n".join(
        f'{s["index"]}: {s["title"]} — {s["summary"]}' for s in SLIDES
    )
    return f"""You are VoiceDeck AI, a friendly voice presentation assistant guiding a talk called "The Future of Agentic AI".
You are SPEAKING ALOUD to a person — sound natural and conversational, like you're talking to a friend, not reading a document.

You are currently on slide {current_index}: "{current['title']}".

SLIDES — zero-based indices for navigate_to_slide (never use display numbers 1-6 as indices):
{slide_list}

HOW TO BEHAVE:
- Respond ONLY to what the user actually asked. Do not lecture unprompted.
- MANDATORY: If the user's question relates to a topic on a slide OTHER than the current one, you MUST call navigate_to_slide() FIRST before saying anything. This is not optional.
- After navigate_to_slide completes, immediately answer the user's question about the new slide in 1-2 sentences.
- If the user asks something off-topic, briefly redirect back to the presentation.
- Keep every response under 3 sentences. You are speaking aloud, not writing.

NAVIGATION EXAMPLES (follow exactly):
- User says "tell me about safety" → current slide is not 4 → call navigate_to_slide(index=4, reason="user asked about safety") → then answer
- User says "what about multi-agent systems" → call navigate_to_slide(index=3, reason="user asked about multi-agent") → then answer
- User says "go to the next slide" → call navigate_to_slide with the next index → then introduce it
- User asks about the CURRENT slide topic → do NOT navigate, just answer

STRICT OUTPUT RULES — violating these breaks the experience:
- NEVER output XML tags, angle brackets, or anything like <tag> or </tag>
- NEVER output function call syntax like navigate_to_slide={{...}}
- NEVER output JSON, markdown, bullet points, or asterisks
- NEVER use phrases like "I'm navigating to" or "calling navigate_to_slide" — just do it silently and speak naturally
- Plain conversational English only"""
