import mongoose from 'mongoose';
import recordModel from '../models/Record.js';
import { readLocal, writeLocal } from './localStore.js';
import { fail } from '../utils/errors.js';

const databaseEnabled = () => mongoose.connection.readyState === 1;
export async function saveOrderOnce(owner, data) {
  if (databaseEnabled()) {
    try {
      await recordModel('order').create({ id: data.id, kind: 'order', owner, data });
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
    return getRecord('order', data.id, owner);
  }
  return writeLocal((store) => {
    if (store.records[data.id])
      return store.records[data.id].owner === owner ? store.records[data.id].data : null;
    store.records[data.id] = { kind: 'order', owner, data };
    return data;
  });
}
export async function saveRecord(kind, owner, data) {
  if (databaseEnabled()) await recordModel(kind).create({ id: data.id, kind, owner, data });
  else
    await writeLocal((store) => {
      if (Object.keys(store.records).length >= 10000)
        fail('Local storage is full. Configure MongoDB to continue.', 503);
      store.records[data.id] = { kind, owner, data };
    });
  return data;
}
export async function listRecords(kind, owner, restaurantId) {
  if (databaseEnabled())
    return (
      await recordModel(kind)
        .find({
          kind,
          ...(owner !== undefined ? { owner } : {}),
          ...(restaurantId ? { 'data.restaurantId': restaurantId } : {}),
        })
        .sort({ createdAt: -1 })
        .lean()
    ).map((record) => record.data);
  return readLocal((store) =>
    Object.values(store.records)
      .filter(
        (record) =>
          record.kind === kind &&
          (owner === undefined || record.owner === owner) &&
          (!restaurantId || record.data.restaurantId === restaurantId),
      )
      .map((record) => record.data)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
  );
}
export async function getRecord(kind, id, owner) {
  if (databaseEnabled())
    return (
      (
        await recordModel(kind)
          .findOne({ id, kind, ...(owner !== undefined ? { owner } : {}) })
          .lean()
      )?.data || null
    );
  return readLocal((store) => {
    const record = store.records[id];
    return record && record.kind === kind && (owner === undefined || owner === record.owner)
      ? record.data
      : null;
  });
}
export async function updateRecord(kind, id, owner, status, changes) {
  if (databaseEnabled()) {
    const update = Object.fromEntries(
      Object.entries(changes).map(([key, value]) => [`data.${key}`, value]),
    );
    return (
      (
        await recordModel(kind)
          .findOneAndUpdate(
            { id, kind, 'data.status': status, ...(owner !== undefined ? { owner } : {}) },
            { $set: update },
            { returnDocument: 'after' },
          )
          .lean()
      )?.data || null
    );
  }
  return writeLocal((store) => {
    const record = store.records[id];
    if (
      !record ||
      record.kind !== kind ||
      (owner !== undefined && record.owner !== owner) ||
      record.data.status !== status
    )
      return null;
    Object.assign(record.data, changes);
    return record.data;
  });
}
