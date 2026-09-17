import "dotenv/config";
import express from "express";
import cors from "cors";
import { analyzeRouter } from "./routes/analyze.js";
import { resumeRouter } from "./routes/resume.js";
import { pitchRouter } from "./routes/pitch.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.use("/api/analyze", analyzeRouter);
app.use("/api/analyze/resume", resumeRouter);
app.use("/api/analyze/pitch", pitchRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`RawTake backend listening on http://localhost:${port}`);
});
