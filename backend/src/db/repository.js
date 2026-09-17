import { db } from "./index.js";

function rowToVerdict(analysisRow, evidenceRows) {
  const critiques = evidenceRows
    .filter((e) => e.kind === "critique")
    .map((e) => ({
      dimension: e.dimension,
      claim: e.claim,
      citation: e.citation,
      severity: e.severity,
      confidence: e.confidence,
    }));
  const positives = evidenceRows
    .filter((e) => e.kind === "positive")
    .map((e) => ({ claim: e.claim, citation: e.citation, confidence: e.confidence }));

  return {
    weakestPoint: analysisRow.weakest_point,
    verdict: {
      summary: analysisRow.verdict_summary,
      wouldTrustForPlacement: !!analysisRow.would_trust_for_placement,
      confidence: analysisRow.confidence,
    },
    critiques,
    positives,
    comprehensionQuestions: JSON.parse(analysisRow.comprehension_questions),
  };
}

const insertAnalysisStmt = db.prepare(`
  INSERT INTO analyses
    (repo_url, owner, repo, status, weakest_point, verdict_summary, would_trust_for_placement, confidence, comprehension_questions)
  VALUES
    (@repoUrl, @owner, @repo, @status, @weakestPoint, @verdictSummary, @wouldTrustForPlacement, @confidence, @comprehensionQuestions)
`);

const insertEvidenceStmt = db.prepare(`
  INSERT INTO evidence (analysis_id, kind, dimension, claim, citation, severity, confidence)
  VALUES (@analysisId, @kind, @dimension, @claim, @citation, @severity, @confidence)
`);

const getAnalysisByIdStmt = db.prepare(`SELECT * FROM analyses WHERE id = ?`);
const getEvidenceForAnalysisStmt = db.prepare(`SELECT * FROM evidence WHERE analysis_id = ?`);
const supersedeStmt = db.prepare(
  `UPDATE analyses SET status = 'superseded', superseded_by = ? WHERE id = ?`
);
const insertDisputeStmt = db.prepare(`
  INSERT INTO disputes (analysis_id, user_message, classification, reasoning, verdict_held, resulting_analysis_id)
  VALUES (@analysisId, @userMessage, @classification, @reasoning, @verdictHeld, @resultingAnalysisId)
`);
const getDisputesForAnalysisStmt = db.prepare(
  `SELECT * FROM disputes WHERE analysis_id = ? ORDER BY id ASC`
);

export function insertAnalysis({ repoUrl, owner, repo, verdict, status = "active" }) {
  const info = insertAnalysisStmt.run({
    repoUrl,
    owner,
    repo,
    status,
    weakestPoint: verdict.weakestPoint,
    verdictSummary: verdict.verdict.summary,
    wouldTrustForPlacement: verdict.verdict.wouldTrustForPlacement ? 1 : 0,
    confidence: verdict.verdict.confidence,
    comprehensionQuestions: JSON.stringify(verdict.comprehensionQuestions || []),
  });
  const analysisId = Number(info.lastInsertRowid);

  for (const c of verdict.critiques || []) {
    insertEvidenceStmt.run({
      analysisId,
      kind: "critique",
      dimension: c.dimension,
      claim: c.claim,
      citation: c.citation,
      severity: c.severity,
      confidence: c.confidence,
    });
  }
  for (const p of verdict.positives || []) {
    insertEvidenceStmt.run({
      analysisId,
      kind: "positive",
      dimension: null,
      claim: p.claim,
      citation: p.citation,
      severity: null,
      confidence: p.confidence,
    });
  }

  return analysisId;
}

export function getAnalysisById(id) {
  return getAnalysisByIdStmt.get(id);
}

export function getAnalysisWithVerdict(id) {
  const row = getAnalysisById(id);
  if (!row) return null;
  const evidenceRows = getEvidenceForAnalysisStmt.all(id);
  return { row, verdict: rowToVerdict(row, evidenceRows) };
}

// Follows the supersession chain to the current tip, so disputing an old
// (already-superseded) analysis id still lands on the latest verdict.
export function getLatestAnalysis(id) {
  let current = getAnalysisById(id);
  if (!current) return null;
  const seen = new Set();
  while (current.superseded_by && !seen.has(current.id)) {
    seen.add(current.id);
    const next = getAnalysisById(current.superseded_by);
    if (!next) break;
    current = next;
  }
  const evidenceRows = getEvidenceForAnalysisStmt.all(current.id);
  return { row: current, verdict: rowToVerdict(current, evidenceRows) };
}

export function supersedeAnalysis(oldId, newId) {
  supersedeStmt.run(newId, oldId);
}

// Walks the supersession chain forward from `id` (root or any link in the
// chain) to the current tip, returning every analysis id along the way.
function getChainIds(id) {
  const ids = [];
  let current = getAnalysisById(id);
  const seen = new Set();
  while (current && !seen.has(current.id)) {
    ids.push(current.id);
    seen.add(current.id);
    current = current.superseded_by ? getAnalysisById(current.superseded_by) : null;
  }
  return ids;
}

// Full dispute history for an analysis chain, oldest first, regardless of
// which link in the chain each dispute was originally filed against.
export function getDisputeHistory(id) {
  const ids = getChainIds(id);
  return ids.flatMap((chainId) => getDisputesForAnalysisStmt.all(chainId));
}

export function insertDispute({
  analysisId,
  userMessage,
  classification,
  reasoning,
  verdictHeld,
  resultingAnalysisId,
}) {
  const info = insertDisputeStmt.run({
    analysisId,
    userMessage,
    classification,
    reasoning,
    verdictHeld: verdictHeld ? 1 : 0,
    resultingAnalysisId: resultingAnalysisId ?? null,
  });
  return Number(info.lastInsertRowid);
}
