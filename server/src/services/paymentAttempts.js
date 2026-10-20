import mongoose from 'mongoose';
import PaymentAttempt from '../models/PaymentAttempt.js';
import { readLocal, writeLocal } from './localStore.js';
import { fail } from '../utils/errors.js';
const db = () => mongoose.connection.readyState === 1;
export async function findAttempt(query) {
  if (db()) return PaymentAttempt.findOne(query).lean();
  return readLocal(
    (store) =>
      Object.values(store.paymentAttempts || {}).find((attempt) =>
        Object.entries(query).every(([key, value]) => attempt[key] === value),
      ) || null,
  );
}
export async function createAttempt(attempt) {
  if (db()) {
    try {
      await PaymentAttempt.create(attempt);
      return true;
    } catch (error) {
      if (error.code === 11000) return false;
      throw error;
    }
  }
  return writeLocal((store) => {
    store.paymentAttempts ||= {};
    if (store.paymentAttempts[attempt.id]) return false;
    if (Object.keys(store.paymentAttempts).length >= 10000)
      fail('Payment storage is full. Contact support.', 503);
    store.paymentAttempts[attempt.id] = attempt;
    return true;
  });
}
export async function changeAttempt(id, status, changes) {
  if (db())
    return PaymentAttempt.findOneAndUpdate(
      { id, status },
      { $set: changes },
      { returnDocument: 'after' },
    ).lean();
  return writeLocal((store) => {
    const attempt = store.paymentAttempts?.[id];
    if (!attempt || attempt.status !== status) return null;
    Object.assign(attempt, changes);
    return attempt;
  });
}
