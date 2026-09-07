import { NextRequest, NextResponse } from 'next/server';
import { requireApiSession } from '@/lib/api-auth';
import { getEmailServiceStatus } from '@/lib/mail';

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if (auth.response) return auth.response;
  return NextResponse.json(getEmailServiceStatus());
}
