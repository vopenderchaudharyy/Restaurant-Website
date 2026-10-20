import mongoose from 'mongoose';
import { databaseDiagnostics } from '../config/db.js';

export function getHealth(_req, res) {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const connected = mongoose.connection.readyState === 1;
  res.json({
    status: 'ok',
    database: states[mongoose.connection.readyState] || 'unknown',
    databaseName: connected ? mongoose.connection.name : null,
    schema: connected ? 'ready' : 'unavailable',
    ...(connected && databaseDiagnostics().status !== 'not-requested'
      ? { migration: databaseDiagnostics() }
      : {}),
  });
}
