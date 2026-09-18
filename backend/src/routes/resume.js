import { Router } from "express";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import { generateResumeVerdict, PERSONA_ENUM } from "../services/resumeAnalysis.js";
import { generateSecondOpinion } from "../services/secondOpinionAnalysis.js";
import { insertResumeAnalysis, getResumeAnalysis, listResumeAnalyses } from "../db/resumeRepository.js";
import { insertSecondOpinion } from "../db/secondOpinionRepository.js";
import { runFollowupChecks, summarizeTrackRecord } from "../services/followupChecker.js";

export const resumeRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

resumeRouter.post("/extract", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }
  if (req.file.mimetype !== "application/pdf") {
    return res.status(400).json({ error: "Only PDF files are supported." });
  }

  const parser = new PDFParse({ data: req.file.buffer });
  try {
    const parsed = await parser.getText();
    const text = parsed.text.replace(/^--\s*\d+\s*of\s*\d+\s*--$/gm, "").trim();
    if (!text) {
      return res.status(422).json({
        error: "Couldn't extract any text from that PDF (it may be scanned/image-based). Paste the text manually instead.",
      });
    }
    res.json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to read that PDF." });
  } finally {
    await parser.destroy();
  }
});

resumeRouter.get("/", (_req, res) => {
  const analyses = listResumeAnalyses().map((a) => ({
    id: a.id,
    label: a.targetRole ? `${a.targetRole} — ${a.snippet}...` : `${a.snippet}...`,
    createdAt: a.createdAt,
  }));
  res.json({ analyses });
});

resumeRouter.post("/", async (req, res) => {
  const { resumeText, targetRole, compareToAnalysisId, persona = "technical" } = req.body || {};
  if (!resumeText || typeof resumeText !== "string" || !resumeText.trim()) {
    return res.status(400).json({ error: "resumeText is required." });
  }
  if (!PERSONA_ENUM.includes(persona)) {
    return res.status(400).json({ error: `persona must be one of: ${PERSONA_ENUM.join(", ")}` });
  }

  try {
    const verdict = await generateResumeVerdict(resumeText, targetRole, persona);
    const analysisId = insertResumeAnalysis({ resumeText, targetRole, verdict });

    let trackRecord = { isRecheck: false };
    if (compareToAnalysisId) {
      const results = await runFollowupChecks({
        priorAnalysisId: Number(compareToAnalysisId),
        module: "resume",
        newEvidenceText: resumeText,
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

resumeRouter.post("/:id/second-opinion", async (req, res) => {
  const analysisId = Number(req.params.id);
  const { pastedResponse } = req.body || {};

  if (!Number.isInteger(analysisId)) {
    return res.status(400).json({ error: "Invalid analysis id." });
  }
  if (!pastedResponse || typeof pastedResponse !== "string" || !pastedResponse.trim()) {
    return res.status(400).json({ error: "pastedResponse is required." });
  }

  const analysis = getResumeAnalysis(analysisId);
  if (!analysis) {
    return res.status(404).json({ error: "Analysis not found." });
  }

  try {
    const verdict = await generateSecondOpinion(analysis.resume_text, pastedResponse);
    insertSecondOpinion({
      module: "resume",
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
