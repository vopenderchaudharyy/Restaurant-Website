import mongoose from 'mongoose';
import app from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';

try {
  await connectDatabase();
  const server = app.listen(env.port, env.host, () => {
    console.log(`MenuMate API: http://${env.host}:${env.port}/api/health`);
  });
  server.on('error', () => {
    console.error('API could not start. Check HOST and PORT, and whether the port is in use.');
    process.exit(1);
  });
  let shuttingDown = false;
  function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    const timeout = setTimeout(() => process.exit(1), 10000);
    timeout.unref();
    server.close(async () => {
      await mongoose.disconnect();
      clearTimeout(timeout);
      process.exit(0);
    });
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch {
  console.error('Startup failed. Check server/.env and MongoDB availability.');
  process.exit(1);
}
