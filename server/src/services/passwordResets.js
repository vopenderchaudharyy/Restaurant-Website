import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import PasswordReset from '../models/PasswordReset.js';
import { hashToken } from './accounts.js';
import { writeLocal } from './localStore.js';

const lifetimeMs = 30 * 60 * 1000;
const online = () => mongoose.connection.readyState === 1;

export async function issuePasswordReset(userId) {
  const token = randomBytes(32).toString('base64url');
  const reset = {
    id: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + lifetimeMs).toISOString(),
    createdAt: new Date().toISOString(),
  };
  if (online()) {
    await PasswordReset.deleteMany({ userId });
    await PasswordReset.create(reset);
  } else {
    await writeLocal((data) => {
      for (const [id, item] of Object.entries(data.passwordResets))
        if (item.userId === userId || new Date(item.expiresAt) <= new Date())
          delete data.passwordResets[id];
      data.passwordResets[reset.id] = reset;
    });
  }
  return token;
}

export async function consumePasswordReset(token) {
  const id = hashToken(token);
  if (online())
    return PasswordReset.findOneAndDelete({ id, expiresAt: { $gt: new Date() } }).lean();
  return writeLocal((data) => {
    const reset = data.passwordResets[id];
    delete data.passwordResets[id];
    if (!reset || new Date(reset.expiresAt) <= new Date()) return null;
    return reset;
  });
}

export async function clearPasswordResets(userId) {
  if (online()) await PasswordReset.deleteMany({ userId });
  else
    await writeLocal((data) => {
      for (const [id, item] of Object.entries(data.passwordResets))
        if (item.userId === userId) delete data.passwordResets[id];
    });
}
