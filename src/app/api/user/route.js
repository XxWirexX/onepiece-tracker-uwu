import { dbConnect } from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(req) {
  await dbConnect();
  const users = await User.find({}, '-_id name role currentEpisode history');
  return Response.json(users);
}

export async function POST(req) {
  await dbConnect();
  const { name, role } = await req.json();
  let user = await User.findOne({ name });
  if (!user) {
    user = await User.create({ name, role });
  }
  return Response.json({ ok: true, user });
}

export async function PUT(req) {
  await dbConnect();
  const { name, currentEpisode, history } = await req.json();
  const user = await User.findOneAndUpdate(
    { name },
    { currentEpisode, history },
    { new: true }
  );
  return Response.json({ ok: true, user });
}
