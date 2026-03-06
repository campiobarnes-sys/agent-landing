import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Static system prompt — cached by Anthropic to reduce input token costs
const SYSTEM_PROMPT = `You are Campio, an expert AI learning path generator. Generate highly personalized AI learning curricula as valid JSON only.

Output a JSON object with this exact structure:
{
  "headline": "Short personalized headline",
  "summary": "2 sentence summary tailored to the user",
  "totalWeeks": <number>,
  "totalProjects": <number>,
  "totalResources": <number>,
  "modules": [
    {
      "number": 1,
      "title": "Module title",
      "weeks": <number>,
      "hours": <number>,
      "description": "1-2 sentences on what they'll learn",
      "projects": ["Project 1", "Project 2"],
      "resources": [
        { "name": "Resource name", "type": "course|video|docs|article" }
      ]
    }
  ]
}

Rules:
- Exactly 5 modules
- Tailor content and projects to the user's goal and background
- Match depth/pace to time availability
- Beginners start from fundamentals; advanced users skip basics
- Projects must be real and buildable
- Use real resources: fast.ai, deeplearning.ai, OpenAI docs, Anthropic docs, Andrej Karpathy, Hugging Face, LangChain docs
- Modules 1-2 are unlocked (free tier); modules 3-5 are premium
- Return ONLY valid JSON — no markdown, no explanation`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { level, goal, time, background, style } = req.body;

  if (!level || !goal || !time || !background || !style) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const userPrompt = `USER PROFILE:
- AI level: ${level}
- Goal: ${goal}
- Time per week: ${time}
- Background: ${background}
- Learning style: ${style}

Generate the learning path JSON.`;

  try {
    const model = process.env.CAMPIO_MODEL || "claude-haiku-3-5";
    const message = await client.messages.create({
      model,
      max_tokens: 1500,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = message.content[0].text.trim();
    const jsonStr = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    const path = JSON.parse(jsonStr);

    return res.status(200).json({ success: true, path });
  } catch (err) {
    console.error("Generation error:", err);
    return res.status(500).json({ error: "Failed to generate path", detail: err.message });
  }
}
