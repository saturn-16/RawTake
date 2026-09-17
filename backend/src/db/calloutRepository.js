import { db } from "./index.js";
import { embeddingToBuffer } from "../services/voyage.js";

const insertConversationStmt = db.prepare(
  `INSERT INTO conversations (title) VALUES (?)`
);
const getConversationStmt = db.prepare(`SELECT * FROM conversations WHERE id = ?`);
const listConversationsStmt = db.prepare(
  `SELECT * FROM conversations ORDER BY created_at DESC`
);
const setConversationTitleStmt = db.prepare(
  `UPDATE conversations SET title = ? WHERE id = ?`
);

const insertMessageStmt = db.prepare(`
  INSERT INTO messages (conversation_id, role, content, embedding)
  VALUES (@conversationId, @role, @content, @embedding)
`);
const insertVecStmt = db.prepare(
  `INSERT INTO vec_messages (rowid, embedding) VALUES (?, ?)`
);
const getMessagesForConversationStmt = db.prepare(
  `SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC`
);

// Top-K nearest messages by embedding, joined back to their conversation and
// excluding one message id (the one just inserted for the current turn).
const searchSimilarStmt = db.prepare(`
  SELECT m.id, m.conversation_id, m.role, m.content, m.created_at, v.distance
  FROM vec_messages v
  JOIN messages m ON m.id = v.rowid
  WHERE v.embedding MATCH ? AND k = ? AND m.id != ?
  ORDER BY v.distance
`);

// L2 distance cutoff above which a match is unrelated noise rather than
// genuine recall. Calibrated empirically on voyage-3.5-lite embeddings: a
// literal restatement of a topic matched around 0.87-0.90, but a natural
// recall phrasing ("what did you tell me about X before") on a genuinely
// relevant topic scored weaker, around 1.04-1.11 — while a totally unrelated
// message scored 1.15-1.23. 1.15 catches real recall phrasing without
// pulling in the clearly unrelated case; the system prompt itself is what
// handles the remaining "only loosely related" cases honestly.
const MAX_RELEVANT_DISTANCE = 1.15;

export function createConversation(title = null) {
  const info = insertConversationStmt.run(title);
  return Number(info.lastInsertRowid);
}

export function getConversation(id) {
  return getConversationStmt.get(id);
}

export function listConversations() {
  return listConversationsStmt.all();
}

export function setConversationTitle(id, title) {
  setConversationTitleStmt.run(title, id);
}

export function insertMessage({ conversationId, role, content, embedding }) {
  const buf = embeddingToBuffer(embedding);
  const info = insertMessageStmt.run({
    conversationId,
    role,
    content,
    embedding: buf,
  });
  const messageId = Number(info.lastInsertRowid);
  insertVecStmt.run(BigInt(messageId), buf);
  return messageId;
}

export function getMessagesForConversation(conversationId) {
  return getMessagesForConversationStmt.all(conversationId);
}

// Searches across ALL conversations (cross-conversation recall is the point
// of this feature), excluding only the message that triggered the search.
export function searchSimilarMessages(queryEmbedding, { limit = 8, excludeMessageId = -1 } = {}) {
  const buf = embeddingToBuffer(queryEmbedding);
  const results = searchSimilarStmt.all(buf, limit, excludeMessageId);
  return results.filter((r) => r.distance <= MAX_RELEVANT_DISTANCE);
}
