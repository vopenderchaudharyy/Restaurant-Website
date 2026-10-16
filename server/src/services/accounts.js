import mongoose from 'mongoose';
import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import User from '../models/User.js';
import Session from '../models/Session.js';
import { readLocal, writeLocal } from './localStore.js';
import { fail } from '../utils/errors.js';

const derive = promisify(scrypt);
const online = () => mongoose.connection.readyState === 1;
export const hashToken = (value) => createHash('sha256').update(value).digest('hex');
export const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  createdAt: user.createdAt,
});
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 });
  return `scrypt:${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  const [, salt, hex] = (stored || '').split(':');
  // Perform the same expensive operation for unknown accounts to avoid a cheap timing oracle.
  const key = await derive(password, salt || '00000000000000000000000000000000', 64, {
    N: 32768,
    r: 8,
    p: 3,
    maxmem: 64 * 1024 * 1024,
  });
  return !!hex && hex.length === 128 && timingSafeEqual(key, Buffer.from(hex, 'hex'));
}
export async function findUser(filter) {
  if (online()) return User.findOne(filter).lean();
  return readLocal(
    (data) =>
      Object.values(data.users).find((user) =>
        Object.entries(filter).every(([key, value]) => user[key] === value),
      ) || null,
  );
}
export async function createUser(user) {
  if (online()) {
    try {
      return (await User.create(user)).toObject();
    } catch (error) {
      if (error.code === 11000) fail('An account with this email already exists.', 409);
      throw error;
    }
  }
  return writeLocal((data) => {
    if (Object.values(data.users).some((existing) => existing.email === user.email))
      fail('An account with this email already exists.', 409);
    data.users[user.id] = user;
    return user;
  });
}
export async function updateUser(id, changes, expectedVersion) {
  if (online())
    return User.findOneAndUpdate(
      { id, ...(expectedVersion !== undefined ? { authVersion: expectedVersion } : {}) },
      { $set: changes },
      { returnDocument: 'after' },
    ).lean();
  return writeLocal((data) => {
    const user = data.users[id];
    if (!user || (expectedVersion !== undefined && user.authVersion !== expectedVersion))
      return null;
    Object.assign(user, changes);
    return user;
  });
}
export async function createSession(user) {
  const token = randomBytes(32).toString('hex');
  const session = {
    id: hashToken(token),
    userId: user.id,
    version: user.authVersion,
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  };
  if (online()) await Session.create(session);
  else
    await writeLocal((data) => {
      for (const [id, item] of Object.entries(data.sessions))
        if (new Date(item.expiresAt) <= new Date()) delete data.sessions[id];
      data.sessions[session.id] = session;
    });
  return token;
}
export async function findSession(id) {
  return online() ? Session.findOne({ id }).lean() : readLocal((data) => data.sessions[id] || null);
}
export async function deleteSession(id) {
  if (online()) await Session.deleteOne({ id });
  else
    await writeLocal((data) => {
      delete data.sessions[id];
    });
}
export async function revokeSessions(userId) {
  if (online()) await Session.deleteMany({ userId });
  else
    await writeLocal((data) => {
      for (const [id, item] of Object.entries(data.sessions))
        if (item.userId === userId) delete data.sessions[id];
    });
}
