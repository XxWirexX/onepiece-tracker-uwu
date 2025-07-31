import { dbConnect } from '@/lib/mongodb';
import Settings from '@/models/Settings';

export async function GET() {
  await dbConnect();
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({ totalEpisodes: 1100 });
  }
  return Response.json({ totalEpisodes: settings.totalEpisodes });
}

export async function PUT(req) {
  await dbConnect();
  const { totalEpisodes } = await req.json();
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({ totalEpisodes });
  } else {
    settings.totalEpisodes = totalEpisodes;
    await settings.save();
  }
  return Response.json({ ok: true, totalEpisodes: settings.totalEpisodes });
}
