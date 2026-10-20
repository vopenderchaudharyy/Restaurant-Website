import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

const port = Number(process.env.PORT || 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '127.0.0.1',
  port,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5173',
  mongodbUri: process.env.MONGODB_URI?.trim() || '',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID?.trim() || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET?.trim() || '',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || '',
};
