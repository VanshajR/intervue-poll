import { Session } from '../models/Session.js';

export async function upsertSession(sessionId, name, role) {
  if (!sessionId || !name || !role) {
    const err = new Error('Session info missing');
    err.code = 'SESSION_INVALID';
    throw err;
  }
  const session = await Session.findOneAndUpdate(
    { sessionId },
    { name, role, isOnline: true, lastSeen: new Date() },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return session;
}

export async function getSession(sessionId) {
  if (!sessionId) return null;
  return Session.findOne({ sessionId });
}

export async function getActiveTeacher(graceSeconds = 60) {
  const cutoff = new Date(Date.now() - graceSeconds * 1000);
  return Session.findOne({
    role: 'teacher',
    isKicked: { $ne: true },
    $or: [
      { isOnline: true },
      { isOnline: { $exists: false } }
    ],
    $or: [
      { lastSeen: { $gte: cutoff } },
      { lastSeen: { $exists: false } }
    ]
  });
}

export async function setKicked(sessionId, value = true) {
  if (!sessionId) return null;
  return Session.findOneAndUpdate({ sessionId }, { isKicked: value }, { new: true });
}

export async function listActiveSessions(graceSeconds = 120) {
  const cutoff = new Date(Date.now() - graceSeconds * 1000);
  return Session.find({
    isKicked: { $ne: true },
    $and: [
      { $or: [{ isOnline: { $ne: false } }, { isOnline: { $exists: false } }] },
      { $or: [{ lastSeen: { $gte: cutoff } }, { lastSeen: { $exists: false } }] }
    ]
  }).lean();
}

export async function setOnline(sessionId, isOnline) {
  if (!sessionId) return null;
  return Session.findOneAndUpdate(
    { sessionId },
    { isOnline, lastSeen: new Date() },
    { new: true }
  );
}
