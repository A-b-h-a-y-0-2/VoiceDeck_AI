export const SLIDES = [
  {
    index: 0,
    title: "The Age of Agentic AI",
    summary: "AI systems that plan, act, and iterate autonomously",
    speakerNotes:
      "Welcome. Today we're exploring how AI is shifting from answering questions to taking actions. The age of agentic AI is here.",
    bullets: [
      "AI moving from reactive to proactive",
      "Planning, memory, and tool use",
      "From single prompts to multi-step workflows",
    ],
  },
  {
    index: 1,
    title: "From Chatbots to Agents",
    summary: "The architectural shift from stateless chat to memory and action",
    speakerNotes:
      "Classic chatbots forget every message. Agents remember context, plan across steps, and take actions in the real world.",
    bullets: [
      "Stateless chat to persistent memory",
      "Single-turn to multi-step planning",
      "Text output to real-world actions",
    ],
  },
  {
    index: 2,
    title: "The Tool-Use Revolution",
    summary: "Agents that call APIs, browse the web, write code, and more",
    speakerNotes:
      "The real unlock was giving LLMs tools. Search, code execution, file access — agents can now interact with the world, not just describe it.",
    bullets: [
      "Web search, code execution, file I/O",
      "Function calling and tool use as a core primitive",
      "From language models to action models",
    ],
  },
  {
    index: 3,
    title: "Multi-Agent Systems",
    summary: "Agents coordinating with other agents to solve complex problems",
    speakerNotes:
      "No single agent does everything well. Multi-agent systems split work: a planner delegates to specialists, each focused on what it does best.",
    bullets: [
      "Orchestrator and specialist agent patterns",
      "Parallel and sequential task execution",
      "Trust boundaries between agents",
    ],
  },
  {
    index: 4,
    title: "Safety and Guardrails",
    summary: "Why alignment and runtime safety matter more as autonomy grows",
    speakerNotes:
      "The more autonomous an agent, the higher the stakes. Guardrails are not optional — they're the difference between a useful agent and a destructive one.",
    bullets: [
      "Prompt injection and adversarial inputs",
      "Output validation and runtime filtering",
      "Human-in-the-loop for irreversible actions",
    ],
  },
  {
    index: 5,
    title: "What's Next",
    summary: "The near future of agentic AI — longer horizons, better reasoning",
    speakerNotes:
      "We're still early. The next wave will bring agents that plan over days, coordinate thousands of sub-agents, and operate with near-zero human supervision.",
    bullets: [
      "Long-horizon task completion",
      "Self-improving agent architectures",
      "AI systems that run entire workflows autonomously",
    ],
  },
];
