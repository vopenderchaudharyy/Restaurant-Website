import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  userId: { type: String, required: true, index: true },
  version: { type: Number, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});
export default mongoose.model('Session', schema);
