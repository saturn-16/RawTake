import { jsonrepair } from "jsonrepair";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

function parseModelJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    // fall through to repair
  }
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  try {
    return JSON.parse(candidate.trim());
  } catch {
    // fall through to repair
  }
  return JSON.parse(jsonrepair(candidate.trim()));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callOnce({ model, systemPrompt, userMessage, jsonSchema, maxTokens }) {
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      response_format: { type: "json_schema", json_schema: jsonSchema },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
    } catch {
      // body wasn't JSON, nothing to recover
    }
    // Groq still hands back the model's generation even when it fails its own
    // schema check (e.g. a bad escape). Try to salvage it before giving up.
    const failedGeneration = parsedBody?.error?.failed_generation;
    if (failedGeneration) {
      try {
        return parseModelJson(failedGeneration);
      } catch {
        // fall through to hard failure below
      }
    }
    if (res.status === 429) {
      const err = new Error(`Groq API error 429 (rate limited): ${body}`);
      err.rateLimited = true;
      throw err;
    }
    throw new Error(`Groq API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("Groq response contained no message content.");
  }
  return parseModelJson(text);
}

export async function callGroqStructured({
  model = "openai/gpt-oss-120b",
  systemPrompt,
  userMessage,
  jsonSchema,
  maxTokens = 2000,
  attempts = 3,
}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await callOnce({ model, systemPrompt, userMessage, jsonSchema, maxTokens });
    } catch (err) {
      lastErr = err;
      if (err.rateLimited && i < attempts - 1) {
        await sleep(15000);
      }
    }
  }
  throw new Error(`Groq structured call failed after ${attempts} attempts: ${lastErr.message}`);
}

// Occasionally the model tries to close one array string and open the next
// (`"...?","...?"`) but drops the array comma, fusing both items into one
// string. Split on that pattern to recover the intended items.
export function normalizeStringArray(items) {
  if (!Array.isArray(items)) return [];
  return items
    .flatMap((q) => String(q).split(/"\s*,\s*"/))
    .map((q) => q.replace(/^["\s]+|["\s]+$/g, ""))
    .filter(Boolean);
}
