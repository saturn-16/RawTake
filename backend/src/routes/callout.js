import { Router } from "express";
import {
  createConversation,
  getConversation,
  listConversations,
  getMessagesForConversation,
} from "../db/calloutRepository.js";
import { sendCalloutMessage } from "../services/callout.js";
import { generateSecondOpinion } from "../services/secondOpinionAnalysis.js";
import { insertSecondOpinion } from "../db/secondOpinionRepository.js";

export const calloutRouter = Router();

calloutRouter.post("/conversations", (req, res) => {
  const { title } = req.body || {};
  const id = createConversation(title || null);
  res.json({ conversationId: id });
});

calloutRouter.get("/conversations", (_req, res) => {
  const conversations = listConversations().map((c) => ({
    id: c.id,
    title: c.title,
    createdAt: c.created_at,
  }));
  res.json({ conversations });
});

calloutRouter.get("/conversations/:id", (req, res) => {
  const id = Number(req.params.id);
  const conversation = getConversation(id);
  if (!conversation) {
    return res.status(404).json({ error: "Conversation not found." });
  }
  const messages = getMessagesForConversation(id).map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.created_at,
  }));
  res.json({ conversation: { id: conversation.id, title: conversation.title }, messages });
});

calloutRouter.post("/conversations/:id/messages", async (req, res) => {
  const id = Number(req.params.id);
  const { message } = req.body || {};

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid conversation id." });
  }
  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message is required." });
  }

  const conversation = getConversation(id);
  if (!conversation) {
    return res.status(404).json({ error: "Conversation not found." });
  }

  try {
    const result = await sendCalloutMessage(id, message);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

calloutRouter.post("/conversations/:id/second-opinion", async (req, res) => {
  const id = Number(req.params.id);
  const { pastedResponse } = req.body || {};

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid conversation id." });
  }
  if (!pastedResponse || typeof pastedResponse !== "string" || !pastedResponse.trim()) {
    return res.status(400).json({ error: "pastedResponse is required." });
  }

  const conversation = getConversation(id);
  if (!conversation) {
    return res.status(404).json({ error: "Conversation not found." });
  }

  try {
    const recentMessages = getMessagesForConversation(id).slice(-20);
    const evidenceText = recentMessages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n\n");
    const verdict = await generateSecondOpinion(evidenceText, pastedResponse);
    insertSecondOpinion({
      module: "callout",
      conversationId: id,
      pastedResponse,
      verdict,
    });
    res.json({ verdict });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
