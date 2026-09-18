import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import * as sqliteVec from "sqlite-vec";
import { EMBEDDING_DIMENSION } from "../services/voyage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || path.join(__dirname, "../../data");
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
    persona TEXT NOT NULL DEFAULT 'technical',
    weakest_point TEXT NOT NULL,
    verdict_summary TEXT NOT NULL,
    would_trust_for_placement INTEGER NOT NULL,
    confidence TEXT NOT NULL,
    comprehension_questions TEXT NOT NULL,
    superseded_by INTEGER REFERENCES analyses(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- module tags which analyses table analysis_id points into ('repo',
  -- 'resume', or 'pitch') so critique_followups can reference evidence rows
  -- uniformly regardless of module, even though those three analysis kinds
  -- live in separate tables.
  CREATE TABLE IF NOT EXISTS evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id INTEGER NOT NULL,
    module TEXT NOT NULL DEFAULT 'repo',
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

  CREATE TABLE IF NOT EXISTS resume_analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_text TEXT NOT NULL,
    target_role TEXT,
    verdict_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pitch_analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pitch_text TEXT NOT NULL,
    verdict_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- module disambiguates which table analysis_id points into, since repo/
  -- resume/pitch analyses live in separate tables rather than one unified
  -- table. conversation_id is used instead of analysis_id for callout.
  CREATE TABLE IF NOT EXISTS second_opinions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module TEXT NOT NULL,
    analysis_id INTEGER,
    conversation_id INTEGER REFERENCES conversations(id),
    pasted_response TEXT NOT NULL,
    verdict_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migration: the `analyses` table predates the `persona` column. Plain
// ALTER TABLE ADD COLUMN is fine here (no FK involved, unlike evidence below).
const analysesColumns = db.prepare(`PRAGMA table_info(analyses)`).all();
if (!analysesColumns.some((c) => c.name === "persona")) {
  db.exec(`ALTER TABLE analyses ADD COLUMN persona TEXT NOT NULL DEFAULT 'technical'`);
}

// Migration: the `evidence` table predates the `module` column AND used to
// declare `analysis_id INTEGER NOT NULL REFERENCES analyses(id)`. That FK is
// now wrong — resume/pitch evidence rows point into resume_analyses/
// pitch_analyses, not analyses — and node:sqlite enforces foreign_keys by
// default, so simply ADDing the module column (which is all a plain
// ALTER TABLE can do here) still leaves the stale FK breaking every
// resume/pitch evidence insert. Rebuild the table instead.
const evidenceTableSql = db
  .prepare(`SELECT sql FROM sqlite_master WHERE name = 'evidence'`)
  .get();
if (evidenceTableSql && evidenceTableSql.sql.includes("REFERENCES analyses(id)")) {
  db.exec("PRAGMA foreign_keys = OFF");
  db.exec(`
    CREATE TABLE evidence_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_id INTEGER NOT NULL,
      module TEXT NOT NULL DEFAULT 'repo',
      kind TEXT NOT NULL,
      dimension TEXT,
      claim TEXT NOT NULL,
      citation TEXT NOT NULL,
      severity TEXT,
      confidence TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO evidence_new (id, analysis_id, module, kind, dimension, claim, citation, severity, confidence, created_at)
      SELECT id, analysis_id, 'repo', kind, dimension, claim, citation, severity, confidence, created_at FROM evidence;
    DROP TABLE evidence;
    ALTER TABLE evidence_new RENAME TO evidence;
  `);
  db.exec("PRAGMA foreign_keys = ON");
} else {
  const evidenceColumns = db.prepare(`PRAGMA table_info(evidence)`).all();
  if (!evidenceColumns.some((c) => c.name === "module")) {
    db.exec(`ALTER TABLE evidence ADD COLUMN module TEXT NOT NULL DEFAULT 'repo'`);
  }
}

db.exec(`
  -- Tracks a single critique's status across later re-checks of the same
  -- work. resolved_in_analysis_id points into whichever analyses table the
  -- evidence row's module implies (analyses/resume_analyses/pitch_analyses).
  CREATE TABLE IF NOT EXISTS critique_followups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evidence_id INTEGER NOT NULL REFERENCES evidence(id),
    status TEXT NOT NULL DEFAULT 'open',
    resolved_in_analysis_id INTEGER,
    resolution_note TEXT,
    checked_at TEXT,
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
