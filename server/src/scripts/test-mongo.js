import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const name = `menumate_test_${randomUUID().replaceAll('-', '')}`;
const child = spawn(
  process.execPath,
  ['--test', fileURLToPath(new URL('../../test/app.test.js', import.meta.url))],
  {
    env: { ...process.env, MENUMATE_TEST_MONGODB_URI: `mongodb://127.0.0.1:27017/${name}` },
    stdio: 'inherit',
    windowsHide: true,
  },
);
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
