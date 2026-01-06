import { getActivePoll, completePoll, getPollById } from './pollService.js';
import { remainingSeconds } from '../utils/time.js';

export class PollTimerManager {
  constructor(io) {
    this.io = io;
    this.tickInterval = null;
    this.currentPollId = null;
  }

  stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.currentPollId = null;
  }

  start(poll) {
    this.stop();
    this.currentPollId = poll._id.toString();

    const emitTick = () => {
      const remaining = remainingSeconds(poll.expiresAt);
      this.io.emit('poll:timer', {
        pollId: this.currentPollId,
        remainingSeconds: remaining
      });
      if (remaining === 0) {
        this.finish(poll._id);
      }
    };

    emitTick();
    this.tickInterval = setInterval(emitTick, 1000);
  }

  async finish(pollId) {
    if (!pollId) return;
    const completed = await completePoll(pollId);
    if (completed) {
      this.io.emit('poll:ended', { poll: completed.toObject() });
    }
    this.stop();
  }

  async restoreFromDatabase() {
    try {
      const active = await getActivePoll();
      if (active) {
        this.start(active);
      }
    } catch (err) {
      // Likely DB unavailable; caller will retry when DB is back.
      throw err;
    }
  }
}
