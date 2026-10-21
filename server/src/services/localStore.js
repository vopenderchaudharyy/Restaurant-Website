import { mkdir, readFile, writeFile, rename, open, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { fail } from '../utils/errors.js';

const directory = process.env.MENUMATE_DATA_DIR
  ? resolve(process.env.MENUMATE_DATA_DIR)
  : fileURLToPath(new URL('../../.data/', import.meta.url));
const filename = join(directory, 'store.json');
const lockfile = join(directory, 'store.lock');
const empty = () => ({
  users: {},
  sessions: {},
  passwordResets: {},
  records: {},
  availability: {},
});
let testStore = empty();
let queue = Promise.resolve();

async function load() {
  if (env.nodeEnv === 'test') return structuredClone(testStore);
  try {
    const data = JSON.parse(await readFile(filename, 'utf8'));
    if (!data.users || !data.sessions || !data.records || !data.availability)
      throw new Error('Invalid store');
    data.passwordResets ||= {};
    return data;
  } catch (error) {
    if (error.code === 'ENOENT') return empty();
    fail('Local storage could not be read. Restore server/.data/store.json from a backup.', 503);
  }
}
export async function readLocal(select) {
  if (env.mongodbUri || env.nodeEnv === 'production')
    fail('Database unavailable. Please try again.', 503);
  await queue;
  return structuredClone(select(await load()));
}
export function writeLocal(change) {
  if (env.mongodbUri || env.nodeEnv === 'production')
    fail('Database unavailable. Please try again.', 503);
  const operation = queue.then(async () => {
    if (env.nodeEnv === 'test') {
      const draft = structuredClone(testStore);
      const result = change(draft);
      testStore = draft;
      return structuredClone(result);
    }
    await mkdir(directory, { recursive: true });
    let lock;
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        lock = await open(lockfile, 'wx', 0o600);
        break;
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    if (!lock)
      fail(
        'Local storage is busy. Try again, or check server/.data/store.lock after stopping the API.',
        503,
      );
    const temporary = join(directory, `store-${randomUUID()}.tmp`);
    try {
      const draft = await load();
      const result = change(draft);
      await writeFile(temporary, JSON.stringify(draft), { mode: 0o600 });
      await rename(temporary, filename);
      return structuredClone(result);
    } finally {
      await lock.close();
      await unlink(lockfile);
      await unlink(temporary).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
  });
  queue = operation.catch(() => {});
  return operation;
}
