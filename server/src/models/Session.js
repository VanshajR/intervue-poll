import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, unique: true, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['teacher', 'student'], required: true },
    isKicked: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: true },
    lastSeen: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const Session = mongoose.model('Session', sessionSchema);
