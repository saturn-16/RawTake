import { db } from "./index.js";
import { createFollowupsForAnalysis } from "./critiqueFollowupRepository.js";

const insertEvidenceStmt = db.prepare(`
  INSERT INTO evidence (analysis_id, module, kind, dimension, claim, citation, severity, confidence)
  VALUES (@analysisId, @module, @kind, @dimension, @claim, @citation, @severity, @confidence)
`);

// Writes critique evidence rows for a non-repo module (resume/pitch) and
// creates an 'open' critique_followups row for each, so it becomes
// trackable the same way repo critiques already are.
export function insertCritiqueEvidence(module, analysisId, critiques) {
  const evidenceIds = [];
  for (const c of critiques || []) {
    const info = insertEvidenceStmt.run({
      analysisId,
      module,
      kind: "critique",
      dimension: c.dimension,
      claim: c.claim,
      citation: c.citation,
      severity: c.severity ?? null,
      confidence: c.confidence,
    });
    evidenceIds.push(Number(info.lastInsertRowid));
  }
  createFollowupsForAnalysis(evidenceIds);
  return evidenceIds;
}
