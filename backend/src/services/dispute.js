import { DISPUTE_CLASSIFIER_SYSTEM_PROMPT, REEVALUATION_SYSTEM_PROMPT } from "../prompts/disputePrompt.js";
import { callGroqStructured, normalizeStringArray } from "./groqClient.js";
import { VERDICT_SCHEMA_SHAPE, buildRepoContextMessage } from "./groq.js";

const MODEL = "openai/gpt-oss-120b";

const CLASSIFIER_JSON_SCHEMA = {
  name: "rawtake_dispute_classification",
  strict: true,
  schema: {
    type: "object",
    properties: {
      classification: { type: "string", enum: ["new_evidence", "emotional_pushback"] },
      reasoning: { type: "string" },
      extractedClaim: { type: ["string", "null"] },
    },
    required: ["classification", "reasoning", "extractedClaim"],
    additionalProperties: false,
  },
};

const REEVALUATION_JSON_SCHEMA = {
  name: "rawtake_repo_reevaluation",
  strict: true,
  schema: {
    type: "object",
    properties: {
      ...VERDICT_SCHEMA_SHAPE.properties,
      changeExplanation: { type: "string" },
    },
    required: [...VERDICT_SCHEMA_SHAPE.required, "changeExplanation"],
    additionalProperties: false,
  },
};

function buildClassifierMessage(currentVerdict, userMessage) {
  return `Original verdict (with all its citations):
${JSON.stringify(currentVerdict, null, 2)}

User's pushback message:
"""
${userMessage}
"""

Classify this pushback per your instructions and return only the JSON object.`;
}

export async function classifyPushback(currentVerdict, userMessage) {
  return callGroqStructured({
    model: MODEL,
    systemPrompt: DISPUTE_CLASSIFIER_SYSTEM_PROMPT,
    userMessage: buildClassifierMessage(currentVerdict, userMessage),
    jsonSchema: CLASSIFIER_JSON_SCHEMA,
    maxTokens: 600,
  });
}

function buildReevaluationMessage(repoData, currentVerdict, userMessage, extractedClaim) {
  return `${buildRepoContextMessage(repoData)}

Your previous verdict on this repo:
${JSON.stringify(currentVerdict, null, 2)}

The user is pushing back with what has been classified as new evidence. Their message:
"""
${userMessage}
"""

The specific new claim extracted from their pushback: ${extractedClaim || "(none extracted — re-examine the message itself)"}

Re-evaluate the repo taking this new evidence into account, per your instructions, keeping the same "persona" as the previous verdict (${currentVerdict.persona}), and return the full revised JSON object including "changeExplanation".`;
}

export async function reevaluateVerdict(repoData, currentVerdict, userMessage, extractedClaim) {
  const result = await callGroqStructured({
    model: MODEL,
    systemPrompt: REEVALUATION_SYSTEM_PROMPT,
    userMessage: buildReevaluationMessage(repoData, currentVerdict, userMessage, extractedClaim),
    jsonSchema: REEVALUATION_JSON_SCHEMA,
  });

  const { changeExplanation, ...revisedVerdict } = result;
  revisedVerdict.comprehensionQuestions = normalizeStringArray(revisedVerdict.comprehensionQuestions);
  return { revisedVerdict, changeExplanation };
}
