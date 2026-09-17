import "dotenv/config";
import express from "express";
import cors from "cors";
import { analyzeRouter } from "./routes/analyze.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.use("/api/analyze", analyzeRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`RawTake backend listening on http://localhost:${port}`);
});
