import { Router } from "express";
import { analyzeRepoData } from "../services/github.js";
import { generateVerdict, buildRepoContextMessage } from "../services/groq.js";
import { classifyPushback, reevaluateVerdict } from "../services/dispute.js";
import { generateSecondOpinion } from "../services/secondOpinionAnalysis.js";
import { insertSecondOpinion } from "../db/secondOpinionRepository.js";
import { runFollowupChecks, summarizeTrackRecord } from "../services/followupChecker.js";
import {
  insertAnalysis,
  getLatestAnalysis,
  supersedeAnalysis,
  insertDispute,
  getDisputeHistory,
  listActiveAnalyses,
  findMostRecentAnalysisByRepoUrl,
} from "../db/repository.js";

export const analyzeRouter = Router();

analyzeRouter.post("/repo", async (req, res) => {
  const { repoUrl } = req.body || {};
  if (!repoUrl || typeof repoUrl !== "string") {
    return res.status(400).json({ error: "repoUrl is required." });
  }

  try {
    const priorAnalysis = findMostRecentAnalysisByRepoUrl(repoUrl);

    const repoData = await analyzeRepoData(repoUrl);
    const verdict = await generateVerdict(repoData);
    const analysisId = insertAnalysis({
      repoUrl,
      owner: repoData.owner,
      repo: repoData.repo,
      verdict,
    });

    let trackRecord = { isRecheck: false };
    if (priorAnalysis) {
      const results = await runFollowupChecks({
        priorAnalysisId: priorAnalysis.id,
        module: "repo",
        newEvidenceText: buildRepoContextMessage(repoData),
        newAnalysisId: analysisId,
      });
      trackRecord = summarizeTrackRecord(results);
    }

    res.json({ analysisId, repo: `${repoData.owner}/${repoData.repo}`, verdict, trackRecord });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

analyzeRouter.get("/repo", (_req, res) => {
  const analyses = listActiveAnalyses().map((a) => ({
    id: a.id,
    label: `${a.owner}/${a.repo}`,
    createdAt: a.created_at,
  }));
  res.json({ analyses });
});

analyzeRouter.get("/repo/:id/disputes", (req, res) => {
  const analysisId = Number(req.params.id);
  if (!Number.isInteger(analysisId)) {
    return res.status(400).json({ error: "Invalid analysis id." });
  }

  const latest = getLatestAnalysis(analysisId);
  if (!latest) {
    return res.status(404).json({ error: "Analysis not found." });
  }

  const history = getDisputeHistory(analysisId).map((d) => ({
    id: d.id,
    userMessage: d.user_message,
    classification: d.classification,
    reasoning: d.reasoning,
    verdictHeld: !!d.verdict_held,
    resultingAnalysisId: d.resulting_analysis_id,
    createdAt: d.created_at,
  }));

  res.json({ analysisId: latest.row.id, verdict: latest.verdict, disputes: history });
});

analyzeRouter.post("/repo/:id/second-opinion", async (req, res) => {
  const analysisId = Number(req.params.id);
  const { pastedResponse } = req.body || {};

  if (!Number.isInteger(analysisId)) {
    return res.status(400).json({ error: "Invalid analysis id." });
  }
  if (!pastedResponse || typeof pastedResponse !== "string" || !pastedResponse.trim()) {
    return res.status(400).json({ error: "pastedResponse is required." });
  }

  const latest = getLatestAnalysis(analysisId);
  if (!latest) {
    return res.status(404).json({ error: "Analysis not found." });
  }

  try {
    // Re-fetch live from GitHub rather than relying on stored critique rows,
    // so the fact-check is against the actual repo, not RawTake's own past
    // interpretation of it.
    const repoData = await analyzeRepoData(latest.row.repo_url);
    const evidenceText = buildRepoContextMessage(repoData);
    const verdict = await generateSecondOpinion(evidenceText, pastedResponse);
    insertSecondOpinion({
      module: "repo",
      analysisId: latest.row.id,
      pastedResponse,
      verdict,
    });
    res.json({ verdict });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

function verdictSignature(verdict) {
  return JSON.stringify({
    weakestPoint: verdict.weakestPoint,
    verdict: verdict.verdict,
    critiques: verdict.critiques,
    positives: verdict.positives,
  });
}

analyzeRouter.post("/repo/:id/dispute", async (req, res) => {
  const analysisId = Number(req.params.id);
  const { message } = req.body || {};

  if (!Number.isInteger(analysisId)) {
    return res.status(400).json({ error: "Invalid analysis id." });
  }
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "message is required." });
  }

  try {
    const latest = getLatestAnalysis(analysisId);
    if (!latest) {
      return res.status(404).json({ error: "Analysis not found." });
    }

    const classification = await classifyPushback(latest.verdict, message);

    if (classification.classification !== "new_evidence") {
      insertDispute({
        analysisId: latest.row.id,
        userMessage: message,
        classification: classification.classification,
        reasoning: classification.reasoning,
        verdictHeld: true,
        resultingAnalysisId: null,
      });
      return res.json({
        classification: classification.classification,
        reasoning: classification.reasoning,
        verdictHeld: true,
        analysisId: latest.row.id,
        verdict: latest.verdict,
      });
    }

    // Classified as new evidence: re-fetch the repo fresh and re-evaluate.
    const repoData = await analyzeRepoData(latest.row.repo_url);
    const { revisedVerdict, changeExplanation } = await reevaluateVerdict(
      repoData,
      latest.verdict,
      message,
      classification.extractedClaim
    );

    const verdictActuallyChanged =
      verdictSignature(revisedVerdict) !== verdictSignature(latest.verdict);

    if (!verdictActuallyChanged) {
      // New evidence was real, but on fair review it didn't move the needle —
      // hold firm rather than inventing a change to look responsive.
      insertDispute({
        analysisId: latest.row.id,
        userMessage: message,
        classification: "new_evidence",
        reasoning: `${classification.reasoning} ${changeExplanation}`.trim(),
        verdictHeld: true,
        resultingAnalysisId: null,
      });
      return res.json({
        classification: "new_evidence",
        reasoning: classification.reasoning,
        changeExplanation,
        verdictHeld: true,
        analysisId: latest.row.id,
        verdict: latest.verdict,
      });
    }

    const newAnalysisId = insertAnalysis({
      repoUrl: latest.row.repo_url,
      owner: latest.row.owner,
      repo: latest.row.repo,
      verdict: revisedVerdict,
    });
    supersedeAnalysis(latest.row.id, newAnalysisId);
    insertDispute({
      analysisId: latest.row.id,
      userMessage: message,
      classification: "new_evidence",
      reasoning: `${classification.reasoning} ${changeExplanation}`.trim(),
      verdictHeld: false,
      resultingAnalysisId: newAnalysisId,
    });

    res.json({
      classification: "new_evidence",
      reasoning: classification.reasoning,
      changeExplanation,
      verdictHeld: false,
      analysisId: newAnalysisId,
      supersedes: latest.row.id,
      verdict: revisedVerdict,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
