import mongoose from 'mongoose';
import recordModel from '../models/Record.js';
import { writeLocal } from './localStore.js';
import { listRecords } from './records.js';

const databaseEnabled = () => mongoose.connection.readyState === 1;

export async function saveReview(owner, data) {
  if (databaseEnabled()) {
    const record = await recordModel('review')
      .findOneAndUpdate(
        { id: data.id, kind: 'review', owner },
        {
          $set: { data },
          $setOnInsert: { id: data.id, kind: 'review', owner },
        },
        { upsert: true, returnDocument: 'after' },
      )
      .lean();
    return record.data;
  }
  return writeLocal((store) => {
    const existing = store.records[data.id];
    if (existing && (existing.kind !== 'review' || existing.owner !== owner)) return null;
    store.records[data.id] = { kind: 'review', owner, data };
    return data;
  });
}

export async function restaurantReviews(restaurantId, { publishedOnly = false } = {}) {
  return (await listRecords('review', undefined, restaurantId)).filter(
    (review) => !publishedOnly || review.status === 'published',
  );
}

export function reviewSummary(reviews) {
  const published = reviews.filter((review) => review.status === 'published');
  return {
    count: published.length,
    rating: published.length
      ? Math.round(
          (published.reduce((sum, review) => sum + review.rating, 0) / published.length) * 10,
        ) / 10
      : null,
  };
}
