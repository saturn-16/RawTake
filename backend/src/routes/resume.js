import { Router } from "express";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import { generateResumeVerdict } from "../services/resumeAnalysis.js";

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

resumeRouter.post("/", async (req, res) => {
  const { resumeText, targetRole } = req.body || {};
  if (!resumeText || typeof resumeText !== "string" || !resumeText.trim()) {
    return res.status(400).json({ error: "resumeText is required." });
  }

  try {
    const verdict = await generateResumeVerdict(resumeText, targetRole);
    res.json({ verdict });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
