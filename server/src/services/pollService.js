import { Poll } from '../models/Poll.js';
import { Vote } from '../models/Vote.js';
import { remainingSeconds } from '../utils/time.js';
import { getSession } from './sessionService.js';

function assertActiveSlotFree(activePoll) {
  if (activePoll) {
    const stillRunning = remainingSeconds(activePoll.expiresAt) > 0;
    if (stillRunning) {
      const err = new Error('A poll is already active');
      err.code = 'ACTIVE_POLL_EXISTS';
      throw err;
    }
  }
}

export async function createPoll({ question, options, durationSeconds, createdBy }) {
  const existing = await Poll.findOne({ status: 'active' });
  assertActiveSlotFree(existing);

  const now = new Date();
  const poll = await Poll.create({
    question,
    options: options.map(opt => {
      if (typeof opt === 'string') return { text: opt };
      return { text: opt.text, isCorrect: Boolean(opt.isCorrect) };
    }),
    durationSeconds,
    status: 'active',
    startTime: now,
    expiresAt: new Date(now.getTime() + durationSeconds * 1000),
    createdBy
  });

  return poll;
}

export async function getActivePoll() {
  const poll = await Poll.findOne({ status: 'active' });
  if (!poll) return null;

  // If expired but not marked completed, flip status for consistency.
  if (remainingSeconds(poll.expiresAt) === 0) {
    poll.status = 'completed';
    poll.completedAt = poll.completedAt || new Date();
    await poll.save();
    return null;
  }
  return poll;
}

export async function completePoll(pollId) {
  if (!pollId) return null;
  const poll = await Poll.findById(pollId);
  if (!poll) return null;
  if (poll.status === 'completed') return poll;

  poll.status = 'completed';
  poll.completedAt = new Date();
  await poll.save();
  return poll;
}

export async function recordVote(pollId, optionId) {
  await Poll.updateOne({ _id: pollId, 'options._id': optionId }, { $inc: { 'options.$.votes': 1 } });
}

export async function getHistory(limit = 20) {
  const items = await Poll.find({ status: 'completed' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return items;
}

export async function getStateForSession(sessionId) {
  const session = await getSession(sessionId);
  if (!session || session.isKicked) {
    return { poll: null, remainingSeconds: 0, hasVoted: false, kicked: true };
  }

  const poll = await getActivePoll();
  if (!poll) return { poll: null, remainingSeconds: 0, hasVoted: false };

  const vote = await Vote.findOne({ pollId: poll._id, sessionId }).lean();
  return {
    poll,
    remainingSeconds: remainingSeconds(poll.expiresAt),
    hasVoted: Boolean(vote),
    votedOptionId: vote?.optionId?.toString()
  };
}

export async function getPollById(pollId) {
  return Poll.findById(pollId);
}
