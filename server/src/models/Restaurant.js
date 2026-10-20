import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    ownerId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    cuisine: String,
    city: String,
    area: String,
    address: String,
    phone: String,
    description: String,
    image: String,
    deliveryFee: Number,
    minOrder: Number,
    etaMin: Number,
    etaMax: Number,
    acceptingOrders: { type: Boolean, default: false },
    status: { type: String, enum: ['draft', 'published', 'suspended'], default: 'draft' },
  },
  { timestamps: true },
);
schema.index({ status: 1, city: 1 });
export default mongoose.model('Restaurant', schema, 'restaurants');
