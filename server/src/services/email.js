import { env } from '../config/env.js';

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );
}

const testOutbox = [];
const emailReady = () => !!(env.resendApiKey && env.emailFrom);

async function sendEmail({ to, subject, text, html }) {
  if (env.nodeEnv === 'test') {
    testOutbox.push({ to, subject, text, html });
    return { delivered: false, test: true };
  }
  if (!emailReady()) throw new Error('Transactional email is not configured');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: env.emailFrom, to: [to], subject, text, html }),
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Email provider rejected the request (${response.status}): ${details.slice(0, 200)}`,
    );
  }
  return { delivered: true };
}

function actionUrl(path) {
  return new URL(path, env.publicAppUrl).toString();
}

export function emailConfiguration() {
  return {
    transactional: emailReady(),
    adminNotifications: emailReady() && !!env.adminNotificationEmail,
  };
}

export function readTestEmailOutbox() {
  return env.nodeEnv === 'test' ? structuredClone(testOutbox) : [];
}

export function clearTestEmailOutbox() {
  if (env.nodeEnv === 'test') testOutbox.length = 0;
}

export function passwordResetUrl(token) {
  const url = new URL('/reset-password', env.publicAppUrl);
  url.searchParams.set('token', token);
  return url.toString();
}

export async function sendPasswordResetEmail(user, token) {
  const url = passwordResetUrl(token);
  const name = escapeHtml(user.name || 'there');
  const safeUrl = escapeHtml(url);
  return sendEmail({
    to: user.email,
    subject: 'Reset your MenuMate password',
    text: `Hello ${user.name || 'there'},\n\nOpen this secure link to create a new MenuMate password:\n${url}\n\nThis link expires in 30 minutes and can be used once. If you did not request it, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#17251e"><h1 style="font-size:24px">Reset your MenuMate password</h1><p>Hello ${name},</p><p>We received a request to create a new password for your account.</p><p style="margin:28px 0"><a href="${safeUrl}" style="background:#ef4b23;color:#fff;text-decoration:none;padding:13px 22px;border-radius:8px;font-weight:700">Create new password</a></p><p>This link expires in 30 minutes and can be used once.</p><p style="color:#667069;font-size:13px">If you did not request this, you can safely ignore this email.</p></div>`,
  });
}

export async function sendWelcomeEmail(user) {
  if (env.nodeEnv !== 'test' && !emailReady()) return { delivered: false, skipped: true };
  const name = escapeHtml(user.name || 'there');
  const url = actionUrl('/restaurants');
  return sendEmail({
    to: user.email,
    subject: 'Welcome to MenuMate',
    text: `Hello ${user.name || 'there'},\n\nWelcome to MenuMate. Your account is ready. Discover restaurants and order your next meal at ${url}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#17251e"><p style="color:#ef4b23;font-weight:700;letter-spacing:.12em">WELCOME TO MENUMATE</p><h1 style="font-size:28px">Good food is now closer.</h1><p>Hello ${name},</p><p>Your MenuMate account is ready. Discover local restaurants, save favourites and keep every order in one place.</p><p style="margin:28px 0"><a href="${escapeHtml(url)}" style="background:#ef4b23;color:#fff;text-decoration:none;padding:13px 22px;border-radius:8px;font-weight:700">Explore restaurants</a></p><p style="color:#667069;font-size:13px">If you did not create this account, contact MenuMate support.</p></div>`,
  });
}

export async function sendAdminLoginNotification(user, signedInAt = new Date().toISOString()) {
  if (env.nodeEnv !== 'test' && (!emailReady() || !env.adminNotificationEmail))
    return { delivered: false, skipped: true };
  if (!env.adminNotificationEmail) return { delivered: false, skipped: true };
  const name = escapeHtml(user.name || 'Unknown user');
  const address = escapeHtml(user.email);
  const time = escapeHtml(
    new Date(signedInAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
  );
  return sendEmail({
    to: env.adminNotificationEmail,
    subject: `MenuMate sign-in: ${user.email}`,
    text: `${user.name || 'A user'} (${user.email}) signed in to MenuMate at ${time} IST.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#17251e"><p style="color:#ef4b23;font-weight:700;letter-spacing:.12em">ACCOUNT ACTIVITY</p><h1 style="font-size:24px">A user signed in</h1><p><strong>${name}</strong><br>${address}</p><p>Signed in at ${time} IST.</p><p style="color:#667069;font-size:13px">This operational notification never contains the user’s password or session token.</p></div>`,
  });
}
