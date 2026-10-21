import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  userId: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true, expires: 0 },
  createdAt: { type: Date, required: true, default: Date.now },
});

export default mongoose.model('PasswordReset', schema, 'password_resets');
