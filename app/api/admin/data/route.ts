import { NextRequest, NextResponse } from 'next/server';
import { requireApiSession } from '@/lib/api-auth';
import { transaction } from '@/lib/db';

export async function DELETE(request: NextRequest) {
  const auth = await requireApiSession(request);
  if (auth.response) return auth.response;
  if (auth.session!.role !== 'Super Admin') return NextResponse.json({ error: 'Only a Super Admin can clear operational data' }, { status: 403 });
  await transaction(async (client) => {
    await client.query("DELETE FROM cms_documents WHERE resource IN ('bookings','enquiries','feedback')");
    await client.query("DELETE FROM submissions WHERE type IN ('booking','enquiry','feedback')");
    await client.query('INSERT INTO audit_logs (user_id, action, resource) VALUES ($1, $2, $3)', [auth.session!.id, 'operational-data.cleared', 'operations']);
  });
  return NextResponse.json({ ok: true });
}
