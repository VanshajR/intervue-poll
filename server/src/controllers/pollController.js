import httpStatus from 'http-status';
import { getHistory, getStateForSession } from '../services/pollService.js';

export async function getActivePollState(req, res) {
  const sessionId = req.query.sessionId || req.headers['x-session-id'];
  const state = await getStateForSession(sessionId);
  res.status(httpStatus.OK).json(state);
}

export async function getPollHistory(req, res) {
  const items = await getHistory(50);
  res.status(httpStatus.OK).json({ items });
}
