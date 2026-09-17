import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import * as sqliteVec from "sqlite-vec";
import { EMBEDDING_DIMENSION } from "../services/voyage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "../../data");
fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, "rawtake.sqlite"), {
  allowExtension: true,
});
db.loadExtension(sqliteVec.getLoadablePath());

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

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding BLOB,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Separate vec0 virtual table for KNN search, keyed by messages.id as rowid.
// (messages.embedding stores the same vector for reference/backup, but only
// a vec0 table supports the MATCH/KNN operator sqlite-vec provides.)
db.exec(`
  CREATE VIRTUAL TABLE IF NOT EXISTS vec_messages USING vec0(
    embedding float[${EMBEDDING_DIMENSION}]
  );
`);
