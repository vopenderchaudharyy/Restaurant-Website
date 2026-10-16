import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execute = promisify(execFile);
const accounts = new URL('../src/services/accounts.js', import.meta.url).href;
const storage = new URL('../src/services/localStore.js', import.meta.url).href;

test('local storage survives fresh processes; owner promotion revokes sessions; concurrent writes retain changes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'menumate-persistence-'));
  const options = {
    env: { ...process.env, NODE_ENV: 'development', MONGODB_URI: '', MENUMATE_DATA_DIR: directory },
    windowsHide: true,
  };
  const run = (code) => execute(process.execPath, ['--input-type=module', '-e', code], options);
  try {
    await run(`
      import { createUser, hashPassword, createSession } from ${JSON.stringify(accounts)};
      const user = await createUser({ id: 'persistence-fixture', email: 'owner@example.test', name: 'Owner', phone: '', role: 'customer', authVersion: 0, createdAt: new Date().toISOString(), passwordHash: await hashPassword('local-test-password-42') });
      await createSession(user);
    `);
    await run(`
      import assert from 'node:assert/strict';
      import { findUser, verifyPassword } from ${JSON.stringify(accounts)};
      const user = await findUser({ id: 'persistence-fixture' });
      assert.equal(user.role, 'customer');
      assert.equal(await verifyPassword('local-test-password-42', user.passwordHash), true);
    `);
    const before = JSON.parse(await readFile(join(directory, 'store.json'), 'utf8'));
    assert.equal(Object.keys(before.sessions).length, 1);
    const promotion = fileURLToPath(new URL('../src/scripts/promote-admin.js', import.meta.url));
    await execute(process.execPath, [promotion, 'owner@example.test'], options);
    await run(`
      import assert from 'node:assert/strict';
      import { findUser } from ${JSON.stringify(accounts)};
      const user = await findUser({ id: 'persistence-fixture' });
      assert.equal(user.role, 'admin');
      assert.equal(user.authVersion, 1);
    `);
    const increment = `import { writeLocal } from ${JSON.stringify(storage)}; for (let i = 0; i < 10; i++) await writeLocal(data => { data.counter = (data.counter || 0) + 1; });`;
    await Promise.all([run(increment), run(increment)]);
    const after = JSON.parse(await readFile(join(directory, 'store.json'), 'utf8'));
    assert.equal(Object.keys(after.sessions).length, 0);
    assert.equal(after.counter, 20);
  } finally {
    const target = resolve(directory);
    assert.ok(target.startsWith(resolve(tmpdir()) + sep));
    assert.ok(target.split(sep).at(-1).startsWith('menumate-persistence-'));
    await rm(target, { recursive: true, force: true });
  }
});
