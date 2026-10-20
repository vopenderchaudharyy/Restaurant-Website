import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { fail } from '../utils/errors.js';

export function paymentConfig() {
  const key = env.razorpayKeyId;
  return {
    provider: 'razorpay',
    mode: 'test',
    enabled: !!(key?.startsWith('rzp_test_') && env.razorpayKeySecret),
    demoAvailable: env.nodeEnv !== 'production',
  };
}
export function requirePayments() {
  if (!paymentConfig().enabled)
    fail('Razorpay test checkout is not configured yet. Add the server test keys first.', 503);
}
export function validSignature(value, signature, secret) {
  if (!secret || typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(value).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}
export async function razorpay(path, { method = 'GET', body, headers = {} } = {}) {
  requirePayments();
  let response;
  try {
    response = await fetch(`https://api.razorpay.com/v1${path}`, {
      method,
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Basic ${Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    fail('Payment service did not respond. Check payment status before trying again.', 503);
  }
  const result = await response.json().catch(() => null);
  if (!response.ok || !result)
    fail('Payment service could not complete the request. Check its status before retrying.', 502);
  return result;
}
