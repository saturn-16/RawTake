const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-3.5-lite";

// Default output dimension for voyage-3.5-lite. Must match the vec0 virtual
// table's declared dimension in db/index.js.
export const EMBEDDING_DIMENSION = 1024;

// inputType should be "document" for text being stored for future retrieval,
// or "query" for text used to search past messages — Voyage's asymmetric
// embeddings give better retrieval quality when these are distinguished.
export async function embedText(text, inputType) {
  const res = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      input: text,
      model: MODEL,
      input_type: inputType,
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Voyage API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const embedding = data.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) {
    throw new Error("Voyage response contained no embedding.");
  }
  return embedding;
}

// Embeddings only power recall of past conversations, so a failure here (most
// often a 429 — Voyage's free tier without billing is capped at 3 requests/
// minute) should degrade recall, not fail the chat turn. Returns null instead
// of throwing, and does not retry: waiting out the per-minute window would
// stall the response past the hosting proxies' request timeouts.
export async function tryEmbedText(text, inputType) {
  try {
    return await embedText(text, inputType);
  } catch (err) {
    console.warn(`Embedding skipped (${inputType}): ${err.message.slice(0, 120)}`);
    return null;
  }
}

export function embeddingToBuffer(embedding) {
  return Buffer.from(new Float32Array(embedding).buffer);
}
