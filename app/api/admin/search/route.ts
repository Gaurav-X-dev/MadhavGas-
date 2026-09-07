import { NextRequest, NextResponse } from 'next/server';
import { requireApiSession } from '@/lib/api-auth';
import { query } from '@/lib/db';

const routeFor: Record<string, string> = {
  bookings: '/admin/bookings', enquiries: '/admin/enquiries', feedback: '/admin/feedback', products: '/admin/products',
};

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if (auth.response) return auth.response;
  const search = (request.nextUrl.searchParams.get('q') || '').trim();
  if (search.length < 2) return NextResponse.json({ items: [] });
  if (search.length > 80) return NextResponse.json({ error: 'Search query is too long' }, { status: 400 });
  const pattern = `%${search.replaceAll('%', '\\%').replaceAll('_', '\\_')}%`;
  const result = await query<{ resource: string; document_id: string; data: Record<string, unknown> }>(
    `SELECT resource,document_id,data FROM cms_documents
     WHERE resource = ANY($1::varchar[]) AND data::text ILIKE $2
     ORDER BY updated_at DESC LIMIT 12`,
    [['bookings', 'enquiries', 'feedback', 'products'], pattern],
  );
  return NextResponse.json({ items: result.rows.map((row) => ({
    id: row.document_id,
    resource: row.resource,
    label: String(row.data.customerName || row.data.name || row.document_id),
    description: String(row.data.businessName || row.data.subject || row.data.cylinderType || row.data.message || row.document_id).slice(0, 140),
    href: routeFor[row.resource],
  })) });
}
