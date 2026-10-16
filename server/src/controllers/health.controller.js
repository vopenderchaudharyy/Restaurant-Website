import mongoose from 'mongoose';

export function getHealth(_req, res) {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({ status: 'ok', database: states[mongoose.connection.readyState] || 'unknown' });
}
