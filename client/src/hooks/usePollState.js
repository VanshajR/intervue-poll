import { useCallback, useEffect, useState } from 'react';

export function usePollState(socket, sessionId, name) {
  const [poll, setPoll] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedOptionId, setVotedOptionId] = useState(null);
  const [lastError, setLastError] = useState(null);

  const handleState = useCallback(state => {
    if (!state) return;
    setPoll(state.poll);
    setRemainingSeconds(state.remainingSeconds || 0);
    setHasVoted(Boolean(state.hasVoted));
    setVotedOptionId(state.votedOptionId || null);
  }, []);

  useEffect(() => {
    if (!socket) return undefined;

    const onState = payload => handleState(payload);
    const onCreated = ({ poll: nextPoll, remainingSeconds: rem }) => {
      setPoll(nextPoll);
      setRemainingSeconds(rem || 0);
      setHasVoted(false);
      setVotedOptionId(null);
    };
    const onUpdate = ({ poll: updatedPoll }) => {
      setPoll(updatedPoll);
    };
    const onTimer = ({ remainingSeconds: rem }) => setRemainingSeconds(rem || 0);
    const onEnded = ({ poll: completed }) => {
      setPoll(completed);
      setRemainingSeconds(0);
    };

    socket.on('poll:state', onState);
    socket.on('poll:created', onCreated);
    socket.on('poll:update', onUpdate);
    socket.on('poll:timer', onTimer);
    socket.on('poll:ended', onEnded);

    return () => {
      socket.off('poll:state', onState);
      socket.off('poll:created', onCreated);
      socket.off('poll:update', onUpdate);
      socket.off('poll:timer', onTimer);
      socket.off('poll:ended', onEnded);
    };
  }, [socket, handleState]);

  const requestState = useCallback(() => {
    if (!socket || !sessionId) return;
    socket.emit('request:state', { sessionId }, res => {
      if (res?.ok) handleState(res.state);
    });
  }, [socket, sessionId, handleState]);

  const createPoll = useCallback(
    async payload =>
      new Promise(resolve => {
        if (!socket) return resolve({ ok: false, message: 'Socket not ready' });
        socket.emit('teacher:createPoll', { ...payload, sessionId }, ack => {
          if (!ack?.ok) setLastError(ack?.message || 'Unable to create poll');
          resolve(ack);
        });
      }),
    [socket, sessionId]
  );

  const vote = useCallback(
    async optionId =>
      new Promise(resolve => {
        if (!socket || !poll) return resolve({ ok: false, message: 'No poll' });
        socket.emit(
          'student:vote',
          { pollId: poll._id, optionId, sessionId, voterName: name },
          ack => {
            if (ack?.ok) {
              setHasVoted(true);
              setVotedOptionId(optionId);
            } else {
              setLastError(ack?.message || 'Vote failed');
            }
            resolve(ack);
          }
        );
      }),
    [socket, poll, sessionId, name]
  );

  return {
    poll,
    remainingSeconds,
    hasVoted,
    votedOptionId,
    lastError,
    requestState,
    createPoll,
    vote
  };
}
