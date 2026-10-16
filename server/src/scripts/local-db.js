import { spawn } from 'node:child_process';
import { mkdir, readdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import mongoose from 'mongoose';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const data = fileURLToPath(new URL('../../.mongodb/', import.meta.url));
const uri = 'mongodb://127.0.0.1:27017/restuarantwebsite';
async function ping() {
  const connection = mongoose.createConnection(uri, { serverSelectionTimeoutMS: 1000 });
  try {
    await connection.asPromise();
    await connection.db.admin().ping();
    return true;
  } catch {
    return false;
  } finally {
    await connection.close().catch(() => {});
  }
}
try {
  if (await ping()) {
    console.log('Local MongoDB is already available on port 27017.');
  } else {
    const tools = join(root, '.tools', 'mongodb');
    const candidates = process.env.MONGOD_PATH ? [process.env.MONGOD_PATH] : [];
    const directories = await readdir(tools, { withFileTypes: true }).catch(() => []);
    for (const item of directories)
      if (item.isDirectory()) candidates.push(join(tools, item.name, 'bin', 'mongod.exe'));
    const installed = 'C:/Program Files/MongoDB/Server';
    const versions = await readdir(installed, { withFileTypes: true }).catch(() => []);
    for (const version of versions.reverse())
      if (version.isDirectory())
        candidates.push(join(installed, version.name, 'bin', 'mongod.exe'));
    let binary;
    for (const candidate of candidates) {
      try {
        await access(candidate);
        binary = candidate;
        break;
      } catch {
        /* Try next known installation. */
      }
    }
    if (!binary)
      throw new Error(
        'MongoDB server was not found. Extract the official Windows zip into .tools/mongodb, or set MONGOD_PATH to mongod.exe. See README.',
      );
    await mkdir(data, { recursive: true });
    const child = spawn(
      binary,
      [
        '--dbpath',
        data,
        '--bind_ip',
        '127.0.0.1',
        '--port',
        '27017',
        '--logpath',
        join(data, 'mongod.log'),
        '--logappend',
      ],
      { detached: true, stdio: 'ignore', windowsHide: true },
    );
    await new Promise((resolve, reject) => {
      child.once('spawn', resolve);
      child.once('error', reject);
    });
    child.unref();
    let ready = false;
    for (let i = 0; i < 20; i++) {
      if (await ping()) {
        ready = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    if (!ready) throw new Error('MongoDB did not become ready. Check server/.mongodb/mongod.log.');
    console.log('Local MongoDB is running on 127.0.0.1:27017. Data: server/.mongodb/.');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
