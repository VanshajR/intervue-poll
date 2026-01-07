import { createPoll, getPollById, getStateForSession, getActivePoll } from '../services/pollService.js';
import { submitVote, countVotesForPoll } from '../services/voteService.js';
import { getSession, listActiveSessions, setKicked, upsertSession, setOnline, getActiveTeacher } from '../services/sessionService.js';
import { remainingSeconds } from '../utils/time.js';

const TEACHER_GRACE_SECONDS = 60;
const TEACHER_IDLE_MINUTES = 15;

function validatePollPayload(payload) {
  const { question, options, durationSeconds } = payload || {};
  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    throw new Error('Question is required');
  }
  if (!Array.isArray(options) || options.length < 2) {
    throw new Error('At least two options are required');
  }
  options.forEach(opt => {
    const text = typeof opt === 'string' ? opt : opt?.text;
    if (typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Options must be non-empty strings');
    }
  });
  if (!durationSeconds || durationSeconds < 5 || durationSeconds > 60) {
    throw new Error('Duration must be between 5 and 60 seconds');
  }
}

function safeAck(callback, payload) {
  if (typeof callback === 'function') {
    callback(payload);
  }
}

async function emitParticipants(io) {
  const sessions = await listActiveSessions();
  io.emit('sessions:update', {
    participants: sessions.map(s => ({ sessionId: s.sessionId, name: s.name, role: s.role }))
  });
}

export function registerSocketHandlers(io, timerManager, isDbReady = () => true) {
  io.on('connection', socket => {
    const heartbeat = setInterval(() => {
      if (socket.data.sessionId) {
        setOnline(socket.data.sessionId, true);
      }
    }, 30000);

    socket.on('session:init', async (data, cb) => {
      if (!isDbReady()) return safeAck(cb, { ok: false, message: 'Database unavailable' });
      try {
        const { sessionId, name, role } = data || {};

        if (role === 'teacher') {
          const activeTeacher = await getActiveTeacher({ graceSeconds: TEACHER_GRACE_SECONDS, idleMinutes: TEACHER_IDLE_MINUTES });
          if (activeTeacher && activeTeacher.sessionId !== sessionId) {
            const lastSeen = activeTeacher.lastSeen || activeTeacher.updatedAt || new Date();
            const ageSeconds = Math.max(0, (Date.now() - new Date(lastSeen).getTime()) / 1000);
            const waitSeconds = Math.max(0, Math.ceil(TEACHER_GRACE_SECONDS - ageSeconds));
            safeAck(cb, {
              ok: false,
              code: 'TEACHER_EXISTS',
              message: 'Another teacher session is active.',
              waitSeconds
            });
            return;
          }
        }

        const session = await upsertSession(sessionId, name, role);
        if (session.isKicked) {
          safeAck(cb, { ok: false, code: 'SESSION_BLOCKED', message: 'You were removed' });
          socket.emit('session:kicked', { sessionId });
          return;
        }
        socket.data.sessionId = sessionId;
        const state = await getStateForSession(sessionId);
        safeAck(cb, { ok: true, state });
        socket.emit('poll:state', state);
        emitParticipants(io);
      } catch (err) {
        safeAck(cb, { ok: false, message: err.message });
      }
    });

    socket.on('request:state', async (data, cb) => {
      if (!isDbReady()) return safeAck(cb, { ok: false, message: 'Database unavailable' });
      const sessionId = data?.sessionId;
      const state = await getStateForSession(sessionId);
      if (state?.kicked) {
        safeAck(cb, { ok: false, code: 'SESSION_BLOCKED', message: 'You were removed' });
        socket.emit('session:kicked', { sessionId });
        return;
      }
      safeAck(cb, { ok: true, state });
      socket.emit('poll:state', state);
    });

    socket.on('teacher:createPoll', async (payload, cb) => {
      if (!isDbReady()) return safeAck(cb, { ok: false, message: 'Database unavailable' });
      try {
        const { sessionId } = payload || {};
        const session = await getSession(sessionId);
        if (!session || session.role !== 'teacher' || session.isKicked) {
          throw new Error('Not authorized to create polls');
        }

        // Enforce: only allow new poll if none active OR all students answered the previous.
        const active = await getActivePoll();
        if (active) {
          const remaining = remainingSeconds(active.expiresAt);
          if (remaining > 0) {
            const votesCount = await countVotesForPoll(active._id);
            const students = (await listActiveSessions()).filter(s => s.role === 'student').length;
            if (votesCount < students) {
              const err = new Error('Wait for all students to answer or let the timer finish.');
              err.code = 'ACTIVE_POLL_WAITING';
              throw err;
            }
            // All students answered before timer end; finish the poll early.
            await timerManager.finish(active._id);
          }
        }

        validatePollPayload(payload);
        const poll = await createPoll(payload);
        const remaining = remainingSeconds(poll.expiresAt);
        io.emit('poll:created', { poll, remainingSeconds: remaining });
        timerManager.start(poll);
        safeAck(cb, { ok: true, poll });
      } catch (err) {
        safeAck(cb, { ok: false, message: err.message, code: err.code });
      }
    });

    socket.on('student:vote', async (payload, cb) => {
      if (!isDbReady()) return safeAck(cb, { ok: false, message: 'Database unavailable' });
      try {
        const { pollId, optionId, sessionId, voterName } = payload || {};
        await submitVote({ pollId, optionId, sessionId, voterName });
        const poll = await getPollById(pollId);
        io.emit('poll:update', { poll });
        safeAck(cb, { ok: true });
      } catch (err) {
        safeAck(cb, { ok: false, message: err.message, code: err.code });
      }
    });

    socket.on('teacher:kick', async (payload, cb) => {
      if (!isDbReady()) return safeAck(cb, { ok: false, message: 'Database unavailable' });
      try {
        const { targetSessionId, actorSessionId } = payload || {};
        const actor = await getSession(actorSessionId);
        if (!actor || actor.role !== 'teacher' || actor.isKicked) {
          throw new Error('Not authorized');
        }
        const updated = await setKicked(targetSessionId, true);
        if (updated) {
          io.emit('session:kicked', { sessionId: targetSessionId });
          emitParticipants(io);
        }
        safeAck(cb, { ok: true });
      } catch (err) {
        safeAck(cb, { ok: false, message: err.message });
      }
    });

    socket.on('sessions:request', async cb => {
      await emitParticipants(io);
      safeAck(cb, { ok: true });
    });

    socket.on('chat:message', async (payload, cb) => {
      try {
        const { sessionId, text } = payload || {};
        if (!text || !sessionId) throw new Error('Invalid message');
        const session = await getSession(sessionId);
        if (!session || session.isKicked) throw new Error('Not allowed');
        const message = { sender: session.name, sessionId, text };
        io.emit('chat:message', message);
        safeAck(cb, { ok: true });
      } catch (err) {
        safeAck(cb, { ok: false, message: err.message });
      }
    });

    socket.on('disconnect', async () => {
      const sessionId = socket.data.sessionId;
      clearInterval(heartbeat);
      if (sessionId) {
        await setOnline(sessionId, false);
        emitParticipants(io);
      }
    });
  });
}
