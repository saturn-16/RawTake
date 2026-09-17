import { db } from "./index.js";

const insertStmt = db.prepare(`
  INSERT INTO second_opinions (module, analysis_id, conversation_id, pasted_response, verdict_json)
  VALUES (@module, @analysisId, @conversationId, @pastedResponse, @verdictJson)
`);

export function insertSecondOpinion({
  module,
  analysisId = null,
  conversationId = null,
  pastedResponse,
  verdict,
}) {
  const info = insertStmt.run({
    module,
    analysisId,
    conversationId,
    pastedResponse,
    verdictJson: JSON.stringify(verdict),
  });
  return Number(info.lastInsertRowid);
}
