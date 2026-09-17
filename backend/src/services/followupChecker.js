import { FOLLOWUP_CHECK_SYSTEM_PROMPT } from "../prompts/followupCheckPrompt.js";
import { callGroqStructured } from "./groqClient.js";
import {
  getOpenFollowupsForAnalysis,
  resolveFollowup,
} from "../db/critiqueFollowupRepository.js";

const MODEL = "openai/gpt-oss-120b";

const FOLLOWUP_JSON_SCHEMA = {
  name: "rawtake_followup_check",
  strict: true,
  schema: {
    type: "object",
    properties: {
      status: { type: "string", enum: ["resolved", "partially_resolved", "unresolved"] },
      note: { type: "string" },
    },
    required: ["status", "note"],
    additionalProperties: false,
  },
};

function buildUserMessage(critique, newEvidenceText) {
  return `The original critique from a past analysis:
Dimension: ${critique.dimension || "(none)"}
Claim: ${critique.claim}
Original citation: ${critique.citation}

New evidence from the latest submission:
"""
${newEvidenceText.slice(0, 8000)}
"""

Determine whether this specific critique was fixed, partially fixed, or is still unresolved, and return only the JSON object.`;
}

async function checkOneFollowup(critique, newEvidenceText) {
  return callGroqStructured({
    model: MODEL,
    systemPrompt: FOLLOWUP_CHECK_SYSTEM_PROMPT,
    userMessage: buildUserMessage(critique, newEvidenceText),
    jsonSchema: FOLLOWUP_JSON_SCHEMA,
    maxTokens: 500,
  });
}

// Finds every open followup tied to `priorAnalysisId` in this module,
// checks each against the new evidence, and updates its row. Returns the
// checked items (with the original critique's content) for the response
// summary — an empty array if the prior analysis had no open critiques left,
// which is meaningfully different from "not a re-check at all".
export async function runFollowupChecks({ priorAnalysisId, module, newEvidenceText, newAnalysisId }) {
  const openFollowups = getOpenFollowupsForAnalysis(priorAnalysisId, module);
  const results = [];
  for (const f of openFollowups) {
    const { status, note } = await checkOneFollowup(f, newEvidenceText);
    resolveFollowup({
      followupId: f.followup_id,
      status,
      resolvedInAnalysisId: newAnalysisId,
      resolutionNote: note,
    });
    results.push({
      dimension: f.dimension,
      claim: f.claim,
      originalCitation: f.citation,
      status,
      note,
    });
  }
  return results;
}

// Shapes checker results into the "since your last check" summary the
// frontend renders at the top of a re-check's result.
export function summarizeTrackRecord(results) {
  if (!results) return { isRecheck: false };
  return {
    isRecheck: true,
    resolved: results.filter((r) => r.status === "resolved").length,
    partiallyResolved: results.filter((r) => r.status === "partially_resolved").length,
    unresolved: results.filter((r) => r.status === "unresolved").length,
    items: results,
  };
}
