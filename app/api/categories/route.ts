import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { CategoryModel } from '@/lib/models';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const categories = await CategoryModel.find({ userId: session.userId }).sort({ name: 1 }).lean();
  return NextResponse.json({
    ok: true,
    data: categories.map(c => ({ ...c, _id: c._id!.toString() })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  if (!body.name) return NextResponse.json({ ok: false, error: 'Name is required' }, { status: 400 });
  await connectDB();
  const category = await CategoryModel.create({
    userId: session.userId,
    name: body.name,
  });
  return NextResponse.json({
    ok: true,
    data: { ...category.toObject(), _id: category._id.toString() },
  });
}
