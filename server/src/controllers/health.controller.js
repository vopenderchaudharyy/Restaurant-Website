import mongoose from 'mongoose';
import { databaseDiagnostics } from '../config/db.js';
import { emailConfiguration } from '../services/email.js';

export function getHealth(_req, res) {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const connected = mongoose.connection.readyState === 1;
  const email = emailConfiguration();
  res.json({
    status: 'ok',
    database: states[mongoose.connection.readyState] || 'unknown',
    databaseName: connected ? mongoose.connection.name : null,
    schema: connected ? 'ready' : 'unavailable',
    email: email.transactional ? 'configured' : 'not-configured',
    adminNotifications: email.adminNotifications ? 'configured' : 'not-configured',
    ...(connected && databaseDiagnostics().status !== 'not-requested'
      ? { migration: databaseDiagnostics() }
      : {}),
  });
}
