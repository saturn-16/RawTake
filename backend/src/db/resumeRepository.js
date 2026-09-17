import { db } from "./index.js";
import { insertCritiqueEvidence } from "./evidenceRepository.js";

const insertStmt = db.prepare(`
  INSERT INTO resume_analyses (resume_text, target_role, verdict_json)
  VALUES (@resumeText, @targetRole, @verdictJson)
`);
const getByIdStmt = db.prepare(`SELECT * FROM resume_analyses WHERE id = ?`);
const listStmt = db.prepare(
  `SELECT id, resume_text, target_role, created_at FROM resume_analyses ORDER BY created_at DESC`
);

export function insertResumeAnalysis({ resumeText, targetRole, verdict }) {
  const info = insertStmt.run({
    resumeText,
    targetRole: targetRole || null,
    verdictJson: JSON.stringify(verdict),
  });
  const analysisId = Number(info.lastInsertRowid);
  insertCritiqueEvidence("resume", analysisId, verdict.critiques);
  return analysisId;
}

export function getResumeAnalysis(id) {
  const row = getByIdStmt.get(id);
  if (!row) return null;
  return { ...row, verdict: JSON.parse(row.verdict_json) };
}

export function listResumeAnalyses() {
  return listStmt.all().map((r) => ({
    id: r.id,
    targetRole: r.target_role,
    snippet: r.resume_text.slice(0, 60),
    createdAt: r.created_at,
  }));
}
