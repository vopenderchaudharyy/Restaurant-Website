import { env } from '../config/env.js';

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );
}

export function passwordResetUrl(token) {
  const url = new URL('/reset-password', env.publicAppUrl);
  url.searchParams.set('token', token);
  return url.toString();
}

export async function sendPasswordResetEmail(user, token) {
  const url = passwordResetUrl(token);
  if (env.nodeEnv === 'test') return { delivered: false, previewUrl: url };
  if (!env.resendApiKey || !env.emailFrom)
    throw new Error('Password recovery email is not configured');
  const name = escapeHtml(user.name || 'there');
  const safeUrl = escapeHtml(url);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.emailFrom,
      to: [user.email],
      subject: 'Reset your MenuMate password',
      text: `Hello ${user.name || 'there'},\n\nOpen this secure link to create a new MenuMate password:\n${url}\n\nThis link expires in 30 minutes and can be used once. If you did not request it, you can ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#17251e"><h1 style="font-size:24px">Reset your MenuMate password</h1><p>Hello ${name},</p><p>We received a request to create a new password for your account.</p><p style="margin:28px 0"><a href="${safeUrl}" style="background:#ef4b23;color:#fff;text-decoration:none;padding:13px 22px;border-radius:8px;font-weight:700">Create new password</a></p><p>This link expires in 30 minutes and can be used once.</p><p style="color:#667069;font-size:13px">If you did not request this, you can safely ignore this email.</p></div>`,
    }),
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Email provider rejected the request (${response.status}): ${details.slice(0, 200)}`,
    );
  }
  return { delivered: true };
}
