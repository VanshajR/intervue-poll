import { useEffect, useState } from 'react';

function format(seconds) {
  const safe = Math.max(0, seconds || 0);
  const m = Math.floor(safe / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(safe % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

export function usePollTimer(serverSeconds) {
  const [remaining, setRemaining] = useState(serverSeconds || 0);

  useEffect(() => {
    setRemaining(serverSeconds || 0);
  }, [serverSeconds]);

  return {
    remaining,
    isExpired: remaining <= 0,
    label: format(remaining)
  };
}
