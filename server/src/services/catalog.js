import mongoose from 'mongoose';
import { menu } from '../../../shared/menu.js';
import MenuAvailability from '../models/MenuAvailability.js';
import { readLocal, writeLocal } from './localStore.js';
import { fail } from '../utils/errors.js';

export async function getCatalog() {
  const settings =
    mongoose.connection.readyState === 1
      ? Object.fromEntries(
          (await MenuAvailability.find().lean()).map((entry) => [entry.id, entry.available]),
        )
      : await readLocal((data) => data.availability);
  return menu.map((dish) => ({ ...dish, available: settings[dish.id] !== false }));
}
export async function setAvailability(id, available) {
  if (!menu.some((dish) => dish.id === id)) fail('Dish not found.', 404);
  if (typeof available !== 'boolean') fail('Availability must be true or false.');
  if (mongoose.connection.readyState === 1)
    await MenuAvailability.findOneAndUpdate({ id }, { $set: { available } }, { upsert: true });
  else
    await writeLocal((data) => {
      data.availability[id] = available;
    });
  return { id, available };
}
