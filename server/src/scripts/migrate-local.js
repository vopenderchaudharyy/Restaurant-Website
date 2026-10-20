import { readFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/db.js';
import { env } from '../config/env.js';
import User from '../models/User.js';
import Session from '../models/Session.js';
import MenuAvailability from '../models/MenuAvailability.js';
import Restaurant from '../models/Restaurant.js';
import MenuItem from '../models/MenuItem.js';
import PaymentAttempt from '../models/PaymentAttempt.js';
import recordModel from '../models/Record.js';

// Copy only missing IDs; never replace existing database records or remove the source file.
try {
  if (!env.mongodbUri) throw new Error('Set MONGODB_URI before migrating local data.');
  const source = JSON.parse(
    await readFile(new URL('../../.data/store.json', import.meta.url), 'utf8'),
  );
  await connectDatabase();
  const groups = [
    [Restaurant, Object.values(source.restaurants || {})],
    [MenuItem, Object.values(source.menuItems || {})],
    [PaymentAttempt, Object.values(source.paymentAttempts || {})],
    [User, Object.values(source.users || {})],
    [
      Session,
      Object.values(source.sessions || {}).filter((item) => new Date(item.expiresAt) > new Date()),
    ],
    [
      MenuAvailability,
      Object.entries(source.availability || {}).map(([id, available]) => ({ id, available })),
    ],
    ...['order', 'reservation', 'message', 'review'].map((kind) => [
      recordModel(kind),
      Object.values(source.records || {})
        .filter((item) => item.kind === kind)
        .map((item) => ({
          id: item.data.id,
          ...item,
          createdAt: item.data.createdAt || new Date().toISOString(),
        })),
    ]),
  ];
  // Validate all data and conflicting identities before writing any group.
  for (const [Model, records] of groups) {
    for (const record of records) {
      await new Model(record).validate();
      if (Model === Restaurant) {
        const existing = await Restaurant.findOne({ ownerId: record.ownerId }).lean();
        if (existing && existing.id !== record.id)
          throw new Error(
            'Migration stopped: this owner already has a different restaurant in MongoDB.',
          );
      }
      if (Model === User) {
        const existing = await User.findOne({ email: record.email }).lean();
        if (existing && existing.id !== record.id)
          throw new Error(
            'Migration stopped: an email belongs to another account in MongoDB. No existing account will be overwritten.',
          );
      }
    }
  }
  for (const [Model, records] of groups) {
    let copied = 0;
    for (const record of records) {
      const result = await Model.updateOne(
        { id: record.id },
        { $setOnInsert: record },
        { upsert: true, timestamps: false },
      );
      copied += result.upsertedCount;
    }
    console.log(
      `${Model.collection.name}: ${copied} copied; ${records.length - copied} already present.`,
    );
  }
  console.log('Local data preserved in server/.data/store.json. Migration complete.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
