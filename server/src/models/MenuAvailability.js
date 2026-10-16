import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    id: { type: String, unique: true, required: true },
    available: { type: Boolean, required: true },
  },
  { timestamps: true },
);
export default mongoose.model('MenuAvailability', schema, 'menu_availability');
