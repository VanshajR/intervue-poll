import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
  {
    sender: { type: String, required: true, trim: true },
    sessionId: { type: String, required: true },
    text: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

chatMessageSchema.index({ createdAt: -1 });

export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
