import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiSession } from '@/lib/api-auth';
import { query } from '@/lib/db';

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(request);
  if (auth.response) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter your current password and a new password of at least 8 characters.' }, { status: 400 });
  const result = await query<{ password_hash: string }>('SELECT password_hash FROM admin_users WHERE id=$1 LIMIT 1', [auth.session!.id]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(parsed.data.currentPassword, user.password_hash))) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
  }
  if (await bcrypt.compare(parsed.data.newPassword, user.password_hash)) {
    return NextResponse.json({ error: 'New password must be different from the current password.' }, { status: 400 });
  }
  await query('UPDATE admin_users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [await bcrypt.hash(parsed.data.newPassword, 12), auth.session!.id]);
  await query('INSERT INTO audit_logs (user_id, action, resource) VALUES ($1,$2,$3)', [auth.session!.id, 'password.changed', 'account']);
  return NextResponse.json({ ok: true });
}
