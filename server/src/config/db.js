import mongoose from 'mongoose';
import { env } from './env.js';
import { databaseModels } from '../models/index.js';

mongoose.set('bufferCommands', false);

const applicationCollections = [
  'users',
  'sessions',
  'menu_availability',
  'restaurants',
  'menu_items',
  'payment_attempts',
  'orders',
  'reservations',
  'messages',
  'reviews',
];
let migration = { status: 'not-requested' };

async function migratePreviousDatabase() {
  const sourceName = env.mongodbMigrateFrom;
  const targetName = mongoose.connection.name;
  if (!sourceName || sourceName === targetName) return;
  const target = mongoose.connection.db;
  const markerId = `copy-${sourceName}-to-${targetName}-v1`;
  const markers = target.collection('system_migrations');
  const existing = await markers.findOne({ _id: markerId });
  if (existing) {
    migration = { status: 'complete', source: sourceName, copied: existing.copied || 0 };
    return;
  }
  migration = { status: 'running', source: sourceName, copied: 0 };
  try {
    const source = mongoose.connection.getClient().db(sourceName);
    const available = new Set(
      (await source.listCollections({}, { nameOnly: true }).toArray()).map(({ name }) => name),
    );
    let copied = 0;
    let conflicts = 0;
    for (const name of applicationCollections) {
      if (!available.has(name)) continue;
      const query = name === 'sessions' ? { expiresAt: { $gt: new Date() } } : {};
      for await (const document of source.collection(name).find(query)) {
        const identity = document.id ? { id: document.id } : { _id: document._id };
        try {
          const result = await target
            .collection(name)
            .updateOne(identity, { $setOnInsert: document }, { upsert: true });
          copied += result.upsertedCount;
        } catch (error) {
          if (error.code !== 11000) throw error;
          conflicts++;
        }
      }
    }
    await markers.insertOne({
      _id: markerId,
      source: sourceName,
      target: targetName,
      copied,
      conflicts,
      completedAt: new Date(),
    });
    migration = { status: 'complete', source: sourceName, copied, conflicts };
    console.log(`MongoDB migration from ${sourceName}: ${copied} copied, ${conflicts} conflicts.`);
  } catch (error) {
    migration = { status: 'failed', source: sourceName };
    console.warn(`MongoDB migration from ${sourceName} could not run: ${error.message}`);
  }
}

export function databaseDiagnostics() {
  return migration;
}

export async function connectDatabase() {
  if (!env.mongodbUri) {
    if (env.nodeEnv === 'production') throw new Error('MONGODB_URI is required in production');
    console.warn('MONGODB_URI is empty. Using local development storage in server/.data/.');
    return;
  }
  await mongoose.connect(env.mongodbUri, {
    serverSelectionTimeoutMS: 5000,
    ...(env.mongodbDbName ? { dbName: env.mongodbDbName } : {}),
  });
  await Promise.all(databaseModels.map((model) => model.init()));
  await migratePreviousDatabase();
  console.log(`MongoDB connected to ${mongoose.connection.name}; collections and indexes ready.`);
}
