import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "../../data");
fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, "rawtake.sqlite"));

db.exec(`
  CREATE TABLE IF NOT EXISTS analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_url TEXT NOT NULL,
    owner TEXT NOT NULL,
    repo TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    weakest_point TEXT NOT NULL,
    verdict_summary TEXT NOT NULL,
    would_trust_for_placement INTEGER NOT NULL,
    confidence TEXT NOT NULL,
    comprehension_questions TEXT NOT NULL,
    superseded_by INTEGER REFERENCES analyses(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id INTEGER NOT NULL REFERENCES analyses(id),
    kind TEXT NOT NULL,
    dimension TEXT,
    claim TEXT NOT NULL,
    citation TEXT NOT NULL,
    severity TEXT,
    confidence TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS disputes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id INTEGER NOT NULL REFERENCES analyses(id),
    user_message TEXT NOT NULL,
    classification TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    verdict_held INTEGER NOT NULL,
    resulting_analysis_id INTEGER REFERENCES analyses(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
