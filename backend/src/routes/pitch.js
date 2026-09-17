import { Router } from "express";
import { generatePitchVerdict } from "../services/pitchAnalysis.js";

export const pitchRouter = Router();

pitchRouter.post("/", async (req, res) => {
  const { pitchText } = req.body || {};
  if (!pitchText || typeof pitchText !== "string" || !pitchText.trim()) {
    return res.status(400).json({ error: "pitchText is required." });
  }

  try {
    const verdict = await generatePitchVerdict(pitchText);
    res.json({ verdict });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
