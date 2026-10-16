import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { attachUser, csrfGuard } from './middleware/auth.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.clientOrigin, credentials: true }));
if (env.nodeEnv !== 'test') app.use(morgan('dev'));
app.use(express.json({ limit: '100kb' }));
app.use(
  '/api',
  (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  },
  csrfGuard,
  attachUser,
);
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

export default app;
