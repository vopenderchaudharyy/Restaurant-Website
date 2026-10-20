import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  owner: { type: String, required: true, index: true },
  fingerprint: String,
  status: String,
  gatewayOrderId: { type: String, unique: true, sparse: true },
  paymentId: String,
  snapshot: mongoose.Schema.Types.Mixed,
  refund: mongoose.Schema.Types.Mixed,
  createdAt: String,
});
export default mongoose.model('PaymentAttempt', schema, 'payment_attempts');
