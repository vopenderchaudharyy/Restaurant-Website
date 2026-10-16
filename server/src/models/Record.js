import mongoose from 'mongoose';

const recordSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    owner: { type: String, required: true, index: true },
    kind: { type: String, enum: ['order', 'reservation', 'message'], required: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

recordSchema.index({ owner: 1, createdAt: -1 });
recordSchema.index({ 'data.restaurantId': 1, createdAt: -1 });
const models = {
  order: mongoose.model('Order', recordSchema.clone(), 'orders'),
  reservation: mongoose.model('Reservation', recordSchema.clone(), 'reservations'),
  message: mongoose.model('Message', recordSchema.clone(), 'messages'),
};
export const recordModels = Object.values(models);
export default function recordModel(kind) {
  const model = models[kind];
  if (!model) throw new Error('Unknown restaurant record type');
  return model;
}
