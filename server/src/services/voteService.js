import mongoose from 'mongoose';
import { Vote } from '../models/Vote.js';
import { getActivePoll, recordVote, completePoll } from './pollService.js';
import { remainingSeconds } from '../utils/time.js';
import { getSession } from './sessionService.js';

function ensureValidObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('Invalid identifier');
    err.code = 'INVALID_ID';
    throw err;
  }
}

export async function submitVote({ pollId, optionId, sessionId, voterName }) {
  ensureValidObjectId(pollId);
  ensureValidObjectId(optionId);

  const session = await getSession(sessionId);
  if (!session || session.isKicked) {
    const err = new Error('Not allowed to vote');
    err.code = 'SESSION_BLOCKED';
    throw err;
  }

  const poll = await getActivePoll();
  if (!poll || poll._id.toString() !== pollId) {
    const err = new Error('Poll is not active');
    err.code = 'POLL_INACTIVE';
    throw err;
  }

  if (remainingSeconds(poll.expiresAt) === 0) {
    await completePoll(poll._id);
    const err = new Error('Poll has ended');
    err.code = 'POLL_ENDED';
    throw err;
  }

  const optionExists = poll.options.some(opt => opt._id.toString() === optionId);
  if (!optionExists) {
    const err = new Error('Option not found');
    err.code = 'OPTION_NOT_FOUND';
    throw err;
  }

  try {
    await Vote.create({ pollId, optionId, sessionId, voterName });
    await recordVote(pollId, optionId);
  } catch (err) {
    if (err.code === 11000) {
      const duplicateErr = new Error('Duplicate vote');
      duplicateErr.code = 'ALREADY_VOTED';
      throw duplicateErr;
    }
    throw err;
  }

  return {
    pollId,
    optionId,
    sessionId
  };
}

export async function countVotesForPoll(pollId) {
  if (!pollId) return 0;
  return Vote.countDocuments({ pollId });
}
