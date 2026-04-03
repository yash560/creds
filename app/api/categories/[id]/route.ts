import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { CategoryModel } from '@/lib/models';
import { getSession } from '@/lib/session';

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  const body = await req.json();
  if (!body.name) return NextResponse.json({ ok: false, error: 'Name is required' }, { status: 400 });
  await connectDB();
  const category = await CategoryModel.findOneAndUpdate(
    { _id: id, userId: session.userId },
    { name: body.name },
    { new: true }
  ).lean();
  if (!category) return NextResponse.json({ ok: false, error: 'Category not found' }, { status: 404 });
  return NextResponse.json({
    ok: true,
    data: { ...category, _id: category._id!.toString() },
  });
}

export async function DELETE(_: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  await connectDB();
  const res = await CategoryModel.findOneAndDelete({ _id: id, userId: session.userId });
  if (!res) return NextResponse.json({ ok: false, error: 'Category not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
