import { REPO_ANALYSIS_SYSTEM_PROMPT } from "../prompts/systemPrompt.js";
import { callGroqStructured, normalizeStringArray } from "./groqClient.js";

const MODEL = "openai/gpt-oss-120b";

export const PERSONA_ENUM = ["recruiter", "technical", "decision_maker"];
export const CONFIDENCE_ENUM = ["high", "low"];
export const DIMENSION_ENUM = ["readme", "structure", "commits", "testing"];

export const CRITIQUE_SCHEMA = {
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

export const POSITIVE_SCHEMA = {
  type: "object",
  properties: {
    claim: { type: "string" },
    citation: { type: "string" },
    confidence: { type: "string", enum: CONFIDENCE_ENUM },
  },
  required: ["claim", "citation", "confidence"],
  additionalProperties: false,
};

// Exported unwrapped so the dispute re-evaluation schema can extend it
// (e.g. add a "changeExplanation" field) without duplicating the shape.
export const VERDICT_SCHEMA_SHAPE = {
  type: "object",
  properties: {
    persona: { type: "string", enum: PERSONA_ENUM },
    weakestPoint: { type: "string" },
    verdict: {
      type: "object",
      properties: {
        summary: { type: "string" },
        wouldTrustForPlacement: { type: "boolean" },
        confidence: { type: "string", enum: CONFIDENCE_ENUM },
      },
      required: ["summary", "wouldTrustForPlacement", "confidence"],
      additionalProperties: false,
    },
    critiques: { type: "array", items: CRITIQUE_SCHEMA },
    positives: { type: "array", items: POSITIVE_SCHEMA },
    comprehensionQuestions: { type: "array", items: { type: "string" } },
  },
  required: ["persona", "weakestPoint", "verdict", "critiques", "positives", "comprehensionQuestions"],
  additionalProperties: false,
};

const VERDICT_JSON_SCHEMA = {
  name: "rawtake_repo_verdict",
  strict: true,
  schema: VERDICT_SCHEMA_SHAPE,
};

export function buildRepoContextMessage(repoData) {
  const truncatedReadme = repoData.readme
    ? repoData.readme.slice(0, 2500)
    : "(no README found)";
  const truncatedPaths = repoData.filePaths.slice(0, 150);
  const truncatedCommits = repoData.commits.slice(0, 15);

  return `Repo: ${repoData.owner}/${repoData.repo}
Description: ${repoData.description || "(none)"}
Languages: ${JSON.stringify(repoData.languages)}

README content:
"""
${truncatedReadme}
"""

File/folder structure (${repoData.filePaths.length} files total, showing first ${truncatedPaths.length}):
${truncatedPaths.join("\n")}

Recent commits (hash: message):
${truncatedCommits.map((c) => `${c.sha}: ${c.message}`).join("\n")}`;
}

function buildAnalysisUserMessage(repoData, persona) {
  return `${buildRepoContextMessage(repoData)}

Active persona for this analysis: ${persona}

Analyze this repo per your instructions and return only the JSON object.`;
}

export async function generateVerdict(repoData, persona = "technical") {
  const raw = await callGroqStructured({
    model: MODEL,
    systemPrompt: REPO_ANALYSIS_SYSTEM_PROMPT,
    userMessage: buildAnalysisUserMessage(repoData, persona),
    jsonSchema: VERDICT_JSON_SCHEMA,
  });
  raw.comprehensionQuestions = normalizeStringArray(raw.comprehensionQuestions);
  return raw;
}
