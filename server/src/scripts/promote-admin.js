import mongoose from 'mongoose';
import { connectDatabase } from '../config/db.js';
import { findUser, updateUser, revokeSessions } from '../services/accounts.js';

try {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !email.includes('@'))
    throw new Error('Usage: npm run admin:promote --workspace server -- owner@example.com');
  await connectDatabase();
  const user = await findUser({ email });
  if (!user)
    throw new Error(
      'Create this customer account through /register first, then run this command again.',
    );
  const updated = await updateUser(
    user.id,
    { role: 'admin', authVersion: user.authVersion + 1 },
    user.authVersion,
  );
  if (!updated) throw new Error('Account changed during promotion. Please retry.');
  await revokeSessions(user.id);
  console.log('Account promoted to owner. Sign in again to access /admin.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
