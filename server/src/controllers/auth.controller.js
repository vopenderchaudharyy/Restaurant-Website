import { randomUUID } from 'node:crypto';
import { fail, requiredText } from '../utils/errors.js';
import {
  hashPassword,
  verifyPassword,
  createUser,
  findUser,
  publicUser,
  createSession,
  deleteSession,
  revokeSessions,
  updateUser,
} from '../services/accounts.js';
import { cookieName, cookieOptions } from '../middleware/auth.js';

function email(value) {
  const result = requiredText(value, 'email address', 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) fail('Please enter a valid email address.');
  return result;
}
function password(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128)
    fail('Use a password between 12 and 128 characters.');
  return value;
}
async function signIn(req, res, user) {
  if (req.sessionId) await deleteSession(req.sessionId);
  res.cookie(cookieName(), await createSession(user), cookieOptions());
  res.json({ user: publicUser(user) });
}
export async function register(req, res) {
  const body = req.body || {};
  const user = await createUser({
    id: randomUUID(),
    email: email(body.email),
    name: requiredText(body.name, 'name', 80),
    passwordHash: await hashPassword(password(body.password)),
    phone: '',
    role: 'customer',
    authVersion: 0,
    createdAt: new Date().toISOString(),
  });
  res.status(201);
  await signIn(req, res, user);
}
export async function login(req, res) {
  const address = email(req.body?.email);
  const secret = req.body?.password;
  if (typeof secret !== 'string' || !secret.length || secret.length > 128)
    fail('Email or password is incorrect.', 401);
  const user = await findUser({ email: address });
  if (!(await verifyPassword(secret, user?.passwordHash)))
    fail('Email or password is incorrect.', 401);
  await signIn(req, res, user);
}
export function me(req, res) {
  res.set('Cache-Control', 'no-store');
  res.json({ user: req.user || null });
}
export async function logout(req, res) {
  if (req.sessionId) await deleteSession(req.sessionId);
  const options = cookieOptions();
  delete options.maxAge;
  res.clearCookie(cookieName(), options);
  res.json({ user: null });
}
export async function profile(req, res) {
  const body = req.body || {};
  const name = requiredText(body.name, 'name', 80);
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  if (phone && !/^[+\d\s()-]{7,20}$/.test(phone)) fail('Please enter a valid phone number.');
  const user = await updateUser(req.user.id, { name, phone });
  res.json({ user: publicUser(user) });
}
export async function changePassword(req, res) {
  const user = await findUser({ id: req.user.id });
  if (
    typeof req.body?.currentPassword !== 'string' ||
    req.body.currentPassword.length > 128 ||
    !(await verifyPassword(req.body.currentPassword, user.passwordHash))
  )
    fail('Current password is incorrect.', 400);
  const passwordHash = await hashPassword(password(req.body?.newPassword));
  const updated = await updateUser(
    user.id,
    { passwordHash, authVersion: user.authVersion + 1 },
    user.authVersion,
  );
  if (!updated) fail('Your account changed. Please sign in again.', 409);
  await revokeSessions(user.id);
  await signIn(req, res, updated);
}
