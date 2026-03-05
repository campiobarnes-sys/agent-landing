import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { level, goal, time, background, style } = req.body;

  if (!level || !goal || !time || !background || !style) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const prompt = `You are Campio, an expert AI learning path generator. Based on the user's profile below, generate a highly personalized AI learning curriculum.

USER PROFILE:
- Current AI level: ${level}
- Primary goal: ${goal}
- Time available per week: ${time}
- Background: ${background}
- Preferred learning style: ${style}

Generate a complete learning path as a JSON object. Return ONLY valid JSON, no markdown, no explanation, just the JSON object.

The JSON must follow this exact structure:
{
  "headline": "A short personalized headline (e.g. 'Your AI Builder Path')",
  "summary": "2 sentence summary tailored to this specific user",
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
      "projects": ["Project 1 description", "Project 2 description"],
      "resources": [
        { "name": "Resource name", "type": "course|video|docs|article" },
        { "name": "Resource name", "type": "course|video|docs|article" }
      ]
    }
  ]
}

Rules:
- Generate exactly 5 modules
- Tailor module titles, content, and projects specifically to the user's goal and background
- Match the depth/pace to their time availability (${time}/week)
- If they are a beginner, start from fundamentals; if advanced, skip basics
- Projects should be real, buildable things — not vague exercises
- Resources should be real, well-known resources (fast.ai, deeplearning.ai, OpenAI docs, Anthropic docs, Andrej Karpathy, Hugging Face, LangChain docs, etc.)
- First 2 modules are always unlocked (free tier), modules 3-5 are premium
- Total weeks should be realistic given ${time}/week availability`;

  try {
    const model = process.env.CAMPIO_MODEL || "claude-opus-4-5";
    const message = await client.messages.create({
      model,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].text.trim();

    // Strip markdown code fences if present
    const jsonStr = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    const path = JSON.parse(jsonStr);

    return res.status(200).json({ success: true, path });
  } catch (err) {
    console.error("Generation error:", err);
    return res.status(500).json({ error: "Failed to generate path", detail: err.message });
  }
}
