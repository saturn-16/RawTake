import { RESUME_ANALYSIS_SYSTEM_PROMPT } from "../prompts/resumePrompt.js";
import { callGroqStructured, normalizeStringArray } from "./groqClient.js";

const MODEL = "openai/gpt-oss-120b";

export const PERSONA_ENUM = ["recruiter", "technical", "decision_maker"];
const CONFIDENCE_ENUM = ["high", "medium", "low"];
const DIMENSION_ENUM = [
  "buzzwords",
  "impact-framing",
  "headline-summary",
  "vague-scope",
  "formatting",
  "redundancy",
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

const RESUME_JSON_SCHEMA = {
  name: "rawtake_resume_verdict",
  strict: true,
  schema: {
    type: "object",
    properties: {
      persona: { type: "string", enum: PERSONA_ENUM },
      weakestPoint: { type: "string" },
      verdict: {
        type: "object",
        properties: {
          summary: { type: "string" },
          wouldAdvanceToInterview: { type: "boolean" },
          confidence: { type: "string", enum: CONFIDENCE_ENUM },
        },
        required: ["summary", "wouldAdvanceToInterview", "confidence"],
        additionalProperties: false,
      },
      critiques: { type: "array", items: CRITIQUE_SCHEMA },
      positives: { type: "array", items: POSITIVE_SCHEMA },
      comprehensionQuestions: { type: "array", items: { type: "string" } },
    },
    required: ["persona", "weakestPoint", "verdict", "critiques", "positives", "comprehensionQuestions"],
    additionalProperties: false,
  },
};

function buildUserMessage(resumeText, targetRole, persona) {
  return `Target role: ${targetRole || "(not specified)"}

Resume / LinkedIn profile text:
"""
${resumeText.slice(0, 8000)}
"""

Active persona for this analysis: ${persona}

Analyze this per your instructions and return only the JSON object.`;
}

export async function generateResumeVerdict(resumeText, targetRole, persona = "technical") {
  const raw = await callGroqStructured({
    model: MODEL,
    systemPrompt: RESUME_ANALYSIS_SYSTEM_PROMPT,
    userMessage: buildUserMessage(resumeText, targetRole, persona),
    jsonSchema: RESUME_JSON_SCHEMA,
  });
  raw.comprehensionQuestions = normalizeStringArray(raw.comprehensionQuestions);
  return raw;
}
