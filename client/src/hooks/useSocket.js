import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

function resolveSocketUrl() {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname } = window.location;
    const port = 4000;
    return `${protocol}//${hostname}:${port}`;
  }
  return 'http://localhost:4000';
}

export function useSocket(sessionId, name, role) {
  const [connected, setConnected] = useState(false);
  const [socketInstance, setSocketInstance] = useState(null);

  const socket = useMemo(() => {
    if (!sessionId) return null;
    return io(resolveSocketUrl(), {
      transports: ['websocket'],
      autoConnect: false
    });
  }, [sessionId]);

  useEffect(() => {
    if (!socket) return undefined;
    socket.connect();
    setSocketInstance(socket);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.disconnect();
      setSocketInstance(null);
    };
  }, [socket]);

  useEffect(() => {
    if (!socketInstance || !sessionId || !name || !role) return;
    socketInstance.emit('session:init', { sessionId, name, role });
  }, [socketInstance, sessionId, name, role]);

  return { socket: socketInstance, connected };
}
