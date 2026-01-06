import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    isCorrect: { type: Boolean, default: false },
    votes: { type: Number, default: 0 }
  },
  { _id: true }
);

const pollSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    options: { type: [optionSchema], validate: v => v.length >= 2 },
    durationSeconds: { type: Number, required: true, min: 5, max: 60 },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    startTime: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    completedAt: { type: Date },
    createdBy: { type: String, default: 'teacher' }
  },
  { timestamps: true }
);

export const Poll = mongoose.model('Poll', pollSchema);
