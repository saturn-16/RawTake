import { SECOND_OPINION_SYSTEM_PROMPT } from "../prompts/secondOpinionPrompt.js";
import { callGroqStructured } from "./groqClient.js";

const MODEL = "openai/gpt-oss-120b";

const CONFIDENCE_ENUM = ["high", "medium", "low"];
const DIMENSION_ENUM = [
  "factual-inaccuracy",
  "sycophancy",
  "hedging",
  "vagueness-disguised-as-thoroughness",
];

// evidenceCheck is required for "factual-inaccuracy" but optional for the
// tone-based dimensions — in strict JSON-schema mode every field must still
// be present, so it's nullable rather than absent.
const CRITIQUE_SCHEMA = {
  type: "object",
  properties: {
    dimension: { type: "string", enum: DIMENSION_ENUM },
    claim: { type: "string" },
    evidenceCheck: { type: ["string", "null"] },
    confidence: { type: "string", enum: CONFIDENCE_ENUM },
  },
  required: ["dimension", "claim", "evidenceCheck", "confidence"],
  additionalProperties: false,
};

const GOT_RIGHT_SCHEMA = {
  type: "object",
  properties: {
    claim: { type: "string" },
    evidenceCheck: { type: "string" },
  },
  required: ["claim", "evidenceCheck"],
  additionalProperties: false,
};

const COMPARISON_JSON_SCHEMA = {
  name: "rawtake_second_opinion_comparison",
  strict: true,
  schema: {
    type: "object",
    properties: {
      verdict: {
        type: "object",
        properties: {
          summary: { type: "string" },
          accurateAgainstEvidence: { type: "boolean" },
          wasHonestInDelivery: { type: "boolean" },
          confidence: { type: "string", enum: CONFIDENCE_ENUM },
        },
        required: ["summary", "accurateAgainstEvidence", "wasHonestInDelivery", "confidence"],
        additionalProperties: false,
      },
      critiques: { type: "array", items: CRITIQUE_SCHEMA },
      whatItGotRight: { type: "array", items: GOT_RIGHT_SCHEMA },
    },
    required: ["verdict", "critiques", "whatItGotRight"],
    additionalProperties: false,
  },
};

function buildUserMessage(evidenceText, pastedResponse) {
  return `Original evidence RawTake's analysis was based on:
"""
${evidenceText.slice(0, 8000)}
"""

The other AI's pasted response about this same subject:
"""
${pastedResponse.slice(0, 8000)}
"""

Evaluate this per your instructions and return only the JSON object.`;
}

export async function generateSecondOpinion(evidenceText, pastedResponse) {
  return callGroqStructured({
    model: MODEL,
    systemPrompt: SECOND_OPINION_SYSTEM_PROMPT,
    userMessage: buildUserMessage(evidenceText, pastedResponse),
    jsonSchema: COMPARISON_JSON_SCHEMA,
  });
}
