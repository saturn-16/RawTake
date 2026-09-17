import { db } from "./index.js";
import { insertCritiqueEvidence } from "./evidenceRepository.js";

const insertStmt = db.prepare(`
  INSERT INTO pitch_analyses (pitch_text, verdict_json)
  VALUES (@pitchText, @verdictJson)
`);
const getByIdStmt = db.prepare(`SELECT * FROM pitch_analyses WHERE id = ?`);
const listStmt = db.prepare(
  `SELECT id, pitch_text, created_at FROM pitch_analyses ORDER BY created_at DESC`
);

export function insertPitchAnalysis({ pitchText, verdict }) {
  const info = insertStmt.run({
    pitchText,
    verdictJson: JSON.stringify(verdict),
  });
  const analysisId = Number(info.lastInsertRowid);
  insertCritiqueEvidence("pitch", analysisId, verdict.critiques);
  return analysisId;
}

export function getPitchAnalysis(id) {
  const row = getByIdStmt.get(id);
  if (!row) return null;
  return { ...row, verdict: JSON.parse(row.verdict_json) };
}

export function listPitchAnalyses() {
  return listStmt.all().map((r) => ({
    id: r.id,
    snippet: r.pitch_text.slice(0, 60),
    createdAt: r.created_at,
  }));
}
