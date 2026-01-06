import 'dotenv/config';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import { connectDatabase } from './config/db.js';
import { createApp } from './app.js';
import { registerSocketHandlers } from './sockets/index.js';
import { PollTimerManager } from './services/timerService.js';

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN?.split(',').map(v => v.trim()) || '*';
const RETRY_MS = Number(process.env.DB_RETRY_MS || 5000);

let dbReady = false;
let retryTimer = null;
const dbReadyCallbacks = [];

function scheduleReconnect(uri) {
  if (retryTimer) return;
  retryTimer = setTimeout(async () => {
    retryTimer = null;
    await connectWithRetry(uri);
  }, RETRY_MS);
}

async function connectWithRetry(uri) {
  try {
    await connectDatabase(uri);
    dbReady = true;
    console.log('Database connected');
    dbReadyCallbacks.splice(0).forEach(fn => {
      try { fn(); } catch (err) { console.warn('dbReady callback failed', err.message); }
    });
  } catch (err) {
    dbReady = false;
    console.error('Database connection failed, will retry:', err.message);
    scheduleReconnect(uri);
  }
}

function watchDb(uri) {
  mongoose.connection.on('disconnected', () => {
    dbReady = false;
    console.warn('Database disconnected, retrying...');
    scheduleReconnect(uri);
  });
  mongoose.connection.on('error', err => {
    dbReady = false;
    console.warn('Database error, retrying...', err.message);
    scheduleReconnect(uri);
  });
}

async function bootstrap() {
  const mongoUri = process.env.MONGO_URI;
  await connectWithRetry(mongoUri);
  watchDb(mongoUri);

  const app = createApp({ clientOrigin: CLIENT_ORIGIN, isDbReady: () => dbReady });
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: {
      origin: CLIENT_ORIGIN,
      methods: ['GET', 'POST']
    }
  });

  const timerManager = new PollTimerManager(io);
  registerSocketHandlers(io, timerManager, () => dbReady);
  const safeRestore = async () => {
    if (!dbReady) return;
    try {
      await timerManager.restoreFromDatabase();
    } catch (err) {
      console.warn('Timer restore skipped (DB not ready):', err.message);
    }
  };
  dbReadyCallbacks.push(safeRestore);
  await safeRestore();

  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

bootstrap();
