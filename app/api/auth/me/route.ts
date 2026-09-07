import { NextRequest, NextResponse } from 'next/server';
import { requireApiSession } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if (auth.response) return auth.response;
  return NextResponse.json({ user: auth.session });
}

