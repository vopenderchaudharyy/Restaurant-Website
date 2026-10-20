import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const suffix = randomUUID().replaceAll('-', '');
const sourceName = `menumate_source_${suffix}`;
const targetName = `menumate_test_${suffix}`;
const sourceUri = `mongodb://127.0.0.1:27017/${sourceName}`;
const targetUri = `mongodb://127.0.0.1:27017/${targetName}`;
const migratedEmail = `migrated-${suffix}@example.com`;
const seed = await mongoose.createConnection(sourceUri).asPromise();
await seed.collection('users').insertOne({
  id: `migrated-${suffix}`,
  email: migratedEmail,
  name: 'Migrated Guest',
  phone: '',
  passwordHash: `scrypt:${'0'.repeat(32)}:${'0'.repeat(128)}`,
  role: 'customer',
  authVersion: 0,
  createdAt: new Date().toISOString(),
});
await seed.close();
const child = spawn(
  process.execPath,
  ['--test', fileURLToPath(new URL('../../test/app.test.js', import.meta.url))],
  {
    env: {
      ...process.env,
      MENUMATE_TEST_MONGODB_URI: sourceUri,
      MENUMATE_TEST_DATABASE: targetName,
      MENUMATE_TEST_MIGRATED_EMAIL: migratedEmail,
      MONGODB_DB_NAME: targetName,
      MONGODB_MIGRATE_FROM: sourceName,
    },
    stdio: 'inherit',
    windowsHide: true,
  },
);
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', async (code) => {
  try {
    for (const uri of [sourceUri, targetUri]) {
      const connection = await mongoose.createConnection(uri).asPromise();
      await connection.dropDatabase();
      await connection.close();
    }
  } catch (error) {
    console.error(`MongoDB test cleanup failed: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
