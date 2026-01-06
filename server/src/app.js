import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import pollRoutes from './routes/pollRoutes.js';

export function createApp({ clientOrigin, isDbReady = () => true }) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: clientOrigin, credentials: true }));
  app.use(express.json());
  app.use(morgan('dev'));

  // If the database is down, fail fast with 503 instead of crashing the process.
  app.use((req, res, next) => {
    if (!isDbReady()) {
      return res.status(503).json({ message: 'Service unavailable. Retrying database connection.' });
    }
    return next();
  });

  app.get('/health', (req, res) => res.json({ ok: true }));
  app.use('/api/polls', pollRoutes);

  app.use((err, req, res, next) => {
    // Minimal error handler to avoid crashing the server
    const status = err.status || 400;
    res.status(status).json({ message: err.message || 'Unexpected error' });
  });

  return app;
}
