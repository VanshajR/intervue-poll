import { ChatMessage } from '../models/ChatMessage.js';

const MAX_MESSAGES = 50;

export async function appendMessage({ sender, sessionId, text }) {
  if (!sender || !sessionId || !text) {
    const err = new Error('Invalid chat payload');
    err.code = 'CHAT_INVALID';
    throw err;
  }
  const saved = await ChatMessage.create({ sender, sessionId, text });
  // Trim collection to last MAX_MESSAGES (most recent kept)
  const excess = await ChatMessage.countDocuments();
  if (excess > MAX_MESSAGES) {
    const toDelete = excess - MAX_MESSAGES;
    await ChatMessage.find({})
      .sort({ createdAt: 1 })
      .limit(toDelete)
      .deleteMany();
  }
  return saved;
}

export async function getRecentMessages(limit = MAX_MESSAGES) {
  const docs = await ChatMessage.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return docs.reverse(); // oldest first
}

export async function clearAllMessages() {
  await ChatMessage.deleteMany({});
}
