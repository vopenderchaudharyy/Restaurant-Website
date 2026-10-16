import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  phone: { type: String, default: '' },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  authVersion: { type: Number, default: 0 },
  createdAt: { type: String, required: true },
});
export default mongoose.model('User', schema);
