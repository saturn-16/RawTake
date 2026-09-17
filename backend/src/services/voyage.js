const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-3.5-lite";

// Default output dimension for voyage-3.5-lite. Must match the vec0 virtual
// table's declared dimension in db/index.js.
export const EMBEDDING_DIMENSION = 1024;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// inputType should be "document" for text being stored for future retrieval,
// or "query" for text used to search past messages — Voyage's asymmetric
// embeddings give better retrieval quality when these are distinguished.
//
// Voyage's free tier (no payment method on file) caps at 3 requests/minute,
// so a 429 here is routine, not exceptional — retry with backoff instead of
// failing the whole chat turn.
export async function embedText(text, inputType, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
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
      });

      if (!res.ok) {
        const body = await res.text();
        if (res.status === 429) {
          const err = new Error(`Voyage API error 429 (rate limited): ${body}`);
          err.rateLimited = true;
          throw err;
        }
        throw new Error(`Voyage API error ${res.status}: ${body}`);
      }

      const data = await res.json();
      const embedding = data.data?.[0]?.embedding;
      if (!Array.isArray(embedding)) {
        throw new Error("Voyage response contained no embedding.");
      }
      return embedding;
    } catch (err) {
      lastErr = err;
      if (err.rateLimited && i < attempts - 1) {
        await sleep(21000);
      } else if (!err.rateLimited) {
        throw err;
      }
    }
  }
  throw lastErr;
}

export function embeddingToBuffer(embedding) {
  return Buffer.from(new Float32Array(embedding).buffer);
}
