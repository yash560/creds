import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ItemModel } from '@/lib/models';
import { decryptFields } from '@/lib/crypto';
import { cookies } from 'next/headers';

function isUnlocked() {
  const cookieStore = cookies();
  return (cookieStore as unknown as { get: (name: string) => { value: string } | undefined }).get('vault_session')?.value === 'unlocked';
}

export async function GET(_: NextRequest) {
  if (!isUnlocked()) return NextResponse.json({ ok: false, error: 'Locked' }, { status: 401 });
  await connectDB();
  const items = await ItemModel.find().lean();
  const decrypted = await Promise.all(
    items.map(async (item) => {
      const raw = item.fields instanceof Map ? Object.fromEntries(item.fields) : (item.fields as Record<string, string>);
      const fields = await decryptFields(raw);
      return { ...item, _id: item._id!.toString(), fields };
    })
  );
  const json = JSON.stringify({ exportedAt: new Date().toISOString(), items: decrypted });
  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="creds-hub-export-${Date.now()}.json"`,
    },
  });
}
