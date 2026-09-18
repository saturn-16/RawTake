import { Router } from "express";
import { generatePitchVerdict, PERSONA_ENUM } from "../services/pitchAnalysis.js";
import { generateSecondOpinion } from "../services/secondOpinionAnalysis.js";
import { insertPitchAnalysis, getPitchAnalysis, listPitchAnalyses } from "../db/pitchRepository.js";
import { insertSecondOpinion } from "../db/secondOpinionRepository.js";
import { runFollowupChecks, summarizeTrackRecord } from "../services/followupChecker.js";

export const pitchRouter = Router();

pitchRouter.get("/", (_req, res) => {
  const analyses = listPitchAnalyses().map((a) => ({
    id: a.id,
    label: `${a.snippet}...`,
    createdAt: a.createdAt,
  }));
  res.json({ analyses });
});

pitchRouter.post("/", async (req, res) => {
  const { pitchText, compareToAnalysisId, persona = "technical" } = req.body || {};
  if (!pitchText || typeof pitchText !== "string" || !pitchText.trim()) {
    return res.status(400).json({ error: "pitchText is required." });
  }
  if (!PERSONA_ENUM.includes(persona)) {
    return res.status(400).json({ error: `persona must be one of: ${PERSONA_ENUM.join(", ")}` });
  }

  try {
    const verdict = await generatePitchVerdict(pitchText, persona);
    const analysisId = insertPitchAnalysis({ pitchText, verdict });

    let trackRecord = { isRecheck: false };
    if (compareToAnalysisId) {
      const results = await runFollowupChecks({
        priorAnalysisId: Number(compareToAnalysisId),
        module: "pitch",
        newEvidenceText: pitchText,
        newAnalysisId: analysisId,
      });
      trackRecord = summarizeTrackRecord(results);
    }

    res.json({ analysisId, verdict, trackRecord });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

pitchRouter.post("/:id/second-opinion", async (req, res) => {
  const analysisId = Number(req.params.id);
  const { pastedResponse } = req.body || {};

  if (!Number.isInteger(analysisId)) {
    return res.status(400).json({ error: "Invalid analysis id." });
  }
  if (!pastedResponse || typeof pastedResponse !== "string" || !pastedResponse.trim()) {
    return res.status(400).json({ error: "pastedResponse is required." });
  }

  const analysis = getPitchAnalysis(analysisId);
  if (!analysis) {
    return res.status(404).json({ error: "Analysis not found." });
  }

  try {
    const verdict = await generateSecondOpinion(analysis.pitch_text, pastedResponse);
    insertSecondOpinion({
      module: "pitch",
      analysisId,
      pastedResponse,
      verdict,
    });
    res.json({ verdict });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
