import { PITCH_ANALYSIS_SYSTEM_PROMPT } from "../prompts/pitchPrompt.js";
import { callGroqStructured, normalizeStringArray } from "./groqClient.js";

const MODEL = "openai/gpt-oss-120b";

const CONFIDENCE_ENUM = ["high", "medium", "low"];
const DIMENSION_ENUM = [
  "genericness",
  "missing-decisions",
  "no-outcome",
  "ownership-ambiguity",
  "buzzword-padding",
  "depth-mismatch",
];

const CRITIQUE_SCHEMA = {
  type: "object",
  properties: {
    dimension: { type: "string", enum: DIMENSION_ENUM },
    claim: { type: "string" },
    citation: { type: "string" },
    severity: { type: "string" },
    confidence: { type: "string", enum: CONFIDENCE_ENUM },
  },
  required: ["dimension", "claim", "citation", "severity", "confidence"],
  additionalProperties: false,
};

const POSITIVE_SCHEMA = {
  type: "object",
  properties: {
    claim: { type: "string" },
    citation: { type: "string" },
    confidence: { type: "string", enum: CONFIDENCE_ENUM },
  },
  required: ["claim", "citation", "confidence"],
  additionalProperties: false,
};

const PITCH_JSON_SCHEMA = {
  name: "rawtake_pitch_verdict",
  strict: true,
  schema: {
    type: "object",
    properties: {
      weakestPoint: { type: "string" },
      verdict: {
        type: "object",
        properties: {
          summary: { type: "string" },
          wouldImpressInterviewer: { type: "boolean" },
          confidence: { type: "string", enum: CONFIDENCE_ENUM },
        },
        required: ["summary", "wouldImpressInterviewer", "confidence"],
        additionalProperties: false,
      },
      critiques: { type: "array", items: CRITIQUE_SCHEMA },
      positives: { type: "array", items: POSITIVE_SCHEMA },
      comprehensionQuestions: { type: "array", items: { type: "string" } },
    },
    required: ["weakestPoint", "verdict", "critiques", "positives", "comprehensionQuestions"],
    additionalProperties: false,
  },
};

function buildUserMessage(pitchText) {
  return `Project pitch text:
"""
${pitchText.slice(0, 6000)}
"""

Analyze this per your instructions and return only the JSON object.`;
}

export async function generatePitchVerdict(pitchText) {
  const raw = await callGroqStructured({
    model: MODEL,
    systemPrompt: PITCH_ANALYSIS_SYSTEM_PROMPT,
    userMessage: buildUserMessage(pitchText),
    jsonSchema: PITCH_JSON_SCHEMA,
  });
  raw.comprehensionQuestions = normalizeStringArray(raw.comprehensionQuestions);
  return raw;
}
