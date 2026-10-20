import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { attachUser, csrfGuard } from './middleware/auth.js';
import { servePhoto } from './controllers/photos.controller.js';
import { paymentWebhook } from './controllers/payments.controller.js';

const app = express();
app.disable('x-powered-by');
if (env.nodeEnv === 'production') app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: env.clientOrigin, credentials: true }));
if (env.nodeEnv !== 'test') app.use(morgan('dev'));
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json', limit: '100kb' }),
  paymentWebhook,
);
app.use(express.json({ limit: '100kb' }));
app.get('/api/photos/:owner/:file', servePhoto);
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
