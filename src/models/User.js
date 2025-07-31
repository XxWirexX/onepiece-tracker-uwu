import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // 'Mylan' ou 'Kylian'
  role: { type: String, enum: ['admin', 'user'], required: true },
  currentEpisode: { type: Number, default: 0 },
  history: [
    {
      date: { type: String }, // YYYY-MM-DD
      episode: { type: Number },
    }
  ]
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
