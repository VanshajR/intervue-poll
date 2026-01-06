import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema(
  {
    pollId: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll', required: true },
    optionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    sessionId: { type: String, required: true, index: true },
    voterName: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

voteSchema.index({ pollId: 1, sessionId: 1 }, { unique: true });

export const Vote = mongoose.model('Vote', voteSchema);
