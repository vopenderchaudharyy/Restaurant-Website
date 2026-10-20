import { env } from '../config/env.js';
import { hashToken, findSession, findUser, publicUser } from '../services/accounts.js';
import { fail } from '../utils/errors.js';

export const cookieName = () =>
  env.nodeEnv === 'production' ? '__Host-menumate' : 'menumate-session';
export const cookieOptions = () => ({
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 86400000,
});
export async function attachUser(req, _res, next) {
  const token = req.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName()}=`))
    ?.slice(cookieName().length + 1);
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    req.sessionId = hashToken(token);
    const session = await findSession(req.sessionId);
    if (session && new Date(session.expiresAt).getTime() > Date.now()) {
      const user = await findUser({ id: session.userId });
      if (user && user.authVersion === session.version) req.user = publicUser(user);
    }
  }
  next();
}
export function requireAuth(req, _res, next) {
  if (!req.user) fail('Please sign in to continue.', 401);
  next();
}
export function requireAdmin(req, _res, next) {
  if (!req.user) fail('Please sign in to continue.', 401);
  if (req.user.role !== 'admin') fail('Platform administrator access is required.', 403);
  next();
}
export function csrfGuard(req, _res, next) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    if (req.get('X-Requested-With') !== 'MenuMate') fail('Invalid request origin.', 403);
    const origin = req.get('Origin');
    if (origin && origin !== new URL(env.clientOrigin).origin) fail('Invalid request origin.', 403);
    if (req.get('Sec-Fetch-Site') === 'cross-site')
      fail('Cross-site requests are not permitted.', 403);
  }
  next();
}
