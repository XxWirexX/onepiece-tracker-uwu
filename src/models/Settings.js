import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema({
  totalEpisodes: { type: Number, default: 1100 },
}, { timestamps: true });

export default mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
