import { db } from "./index.js";

const insertFollowupStmt = db.prepare(`
  INSERT INTO critique_followups (evidence_id, status)
  VALUES (?, 'open')
`);

// Every open followup for a given analysis, joined back to the original
// critique's content so the checker prompt has something to evaluate.
const getOpenFollowupsForAnalysisStmt = db.prepare(`
  SELECT f.id AS followup_id, e.id AS evidence_id, e.dimension, e.claim, e.citation, e.severity, e.confidence
  FROM critique_followups f
  JOIN evidence e ON e.id = f.evidence_id
  WHERE f.status = 'open' AND e.analysis_id = ? AND e.module = ? AND e.kind = 'critique'
`);

const updateFollowupStmt = db.prepare(`
  UPDATE critique_followups
  SET status = @status,
      resolved_in_analysis_id = @resolvedInAnalysisId,
      resolution_note = @resolutionNote,
      checked_at = datetime('now')
  WHERE id = @followupId
`);

// Creates a fresh 'open' followup row for every critique-kind evidence row
// belonging to this analysis — called right after evidence rows are
// inserted for any new analysis, in any module.
export function createFollowupsForAnalysis(evidenceIds) {
  for (const evidenceId of evidenceIds) {
    insertFollowupStmt.run(evidenceId);
  }
}

export function getOpenFollowupsForAnalysis(analysisId, module) {
  return getOpenFollowupsForAnalysisStmt.all(analysisId, module);
}

export function resolveFollowup({ followupId, status, resolvedInAnalysisId, resolutionNote }) {
  updateFollowupStmt.run({
    followupId,
    status,
    resolvedInAnalysisId,
    resolutionNote,
  });
}
