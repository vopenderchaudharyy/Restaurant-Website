import mongoose from 'mongoose';
import { env } from './env.js';
import { databaseModels } from '../models/index.js';

mongoose.set('bufferCommands', false);

export async function connectDatabase() {
  if (!env.mongodbUri) {
    if (env.nodeEnv === 'production') throw new Error('MONGODB_URI is required in production');
    console.warn('MONGODB_URI is empty. Using local development storage in server/.data/.');
    return;
  }
  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 5000 });
  await Promise.all(databaseModels.map((model) => model.init()));
  console.log('MongoDB connected; collections and indexes ready.');
}
