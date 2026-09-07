import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiSession } from '@/lib/api-auth';
import { getCollection, replaceCollection, validCollection } from '@/lib/resources';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { collectionSchemas, validationMessage } from '@/lib/validation';
import { jsonRequestError } from '@/lib/request-security';

const bodySchema = z.object({ items: z.array(z.record(z.string(), z.unknown())).max(1000) }).strict();

type RouteContext = { params: Promise<{ resource: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { resource } = await context.params;
  const auth = await requireApiSession(request);
  if (auth.response) return auth.response;
  if (!validCollection(resource)) return NextResponse.json({ error: 'Unknown resource' }, { status: 404 });
  if (resource === 'users') {
    const result = await query<{ id: string; name: string; email: string; role: string; active: boolean; last_active: Date | null }>(
      'SELECT id, name, email, role, active, last_active FROM admin_users ORDER BY created_at ASC',
    );
    return NextResponse.json({ items: result.rows.map((user) => ({ id: user.id, name: user.name, email: user.email, role: user.role, active: user.active, lastActive: user.last_active ? new Date(user.last_active).toLocaleString('en-IN') : 'Never' })) });
  }
  if (resource === 'activity') {
    const result = await query<{ id: string; user_name: string | null; action: string; resource: string | null; created_at: Date }>(
      `SELECT a.id::text, u.name AS user_name, a.action, a.resource, a.created_at
       FROM audit_logs a LEFT JOIN admin_users u ON u.id = a.user_id
       ORDER BY a.created_at DESC LIMIT 50`,
    );
    return NextResponse.json({ items: result.rows.map((item) => ({ id: item.id, user: item.user_name || 'System', action: item.action.replaceAll('.', ' '), target: item.resource || 'website', time: new Date(item.created_at).toLocaleString('en-IN'), type: item.resource === 'feedback' ? 'feedback' : item.resource === 'bookings' ? 'booking' : item.resource === 'products' ? 'product' : 'content' })) });
  }
  return NextResponse.json({ items: await getCollection(resource) });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { resource } = await context.params;
  const auth = await requireApiSession(request);
  if (auth.response) return auth.response;
  if (!validCollection(resource)) return NextResponse.json({ error: 'Unknown resource' }, { status: 404 });
  if (resource === 'activity') return NextResponse.json({ error: 'Activity is read-only' }, { status: 405 });
  const role = auth.session!.role;
  const supportResources = new Set(['bookings', 'enquiries', 'feedback']);
  if (role === 'Viewer' || (role === 'Support Staff' && !supportResources.has(resource)) || (role === 'Editor' && resource === 'users')) {
    return NextResponse.json({ error: 'Your role cannot modify this resource' }, { status: 403 });
  }
  const requestError = jsonRequestError(request, 2 * 1024 * 1024);
  if (requestError) return NextResponse.json({ error: requestError.error }, { status: requestError.status });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 }); }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid collection data' }, { status: 400 });
  const itemSchema = collectionSchemas[resource];
  if (!itemSchema) return NextResponse.json({ error: 'This resource is read-only' }, { status: 405 });
  const validatedItems: Array<Record<string, unknown>> = [];
  for (const item of parsed.data.items) {
    const result = itemSchema.safeParse(item);
    if (!result.success) return NextResponse.json({ error: validationMessage(result.error) }, { status: 400 });
    validatedItems.push(result.data as Record<string, unknown>);
  }
  const uniqueValues = (field: string) => validatedItems.map((item) => String(item[field] ?? '').toLowerCase());
  const ids = uniqueValues('id');
  if (new Set(ids).size !== ids.length) return NextResponse.json({ error: 'Every item must have a unique id' }, { status: 409 });
  if (resource === 'products') {
    const slugs = uniqueValues('slug');
    if (new Set(slugs).size !== slugs.length) return NextResponse.json({ error: 'Every product must have a unique slug' }, { status: 409 });
  }
  if (resource === 'users') {
    const emails = uniqueValues('email');
    if (new Set(emails).size !== emails.length) return NextResponse.json({ error: 'Every user must have a unique email address' }, { status: 409 });
  }
  if (resource === 'users') {
    const existing = await query<{ id: string }>('SELECT id FROM admin_users');
    const incomingIds = new Set(validatedItems.map((item) => String(item.id)));
    if (!validatedItems.some((item) => item.role === 'Super Admin' && item.active === true)) return NextResponse.json({ error: 'At least one active Super Admin is required' }, { status: 400 });
    for (const item of validatedItems) {
      const id = String(item.id);
      const found = existing.rows.some((user) => user.id === id);
      if (!found && typeof item.password !== 'string') {
        return NextResponse.json({ error: `A password is required for new user ${String(item.email)}` }, { status: 400 });
      }
      if (found) {
        if (typeof item.password === 'string' && item.password.length >= 8) {
          await query('UPDATE admin_users SET name=$1, email=$2, role=$3, active=$4, password_hash=$5, updated_at=NOW() WHERE id=$6', [item.name, item.email, item.role, item.active, await bcrypt.hash(item.password, 12), id]);
        } else {
          await query('UPDATE admin_users SET name=$1, email=$2, role=$3, active=$4, updated_at=NOW() WHERE id=$5', [item.name, item.email, item.role, item.active, id]);
        }
      } else {
        await query('INSERT INTO admin_users (id,name,email,role,active,password_hash) VALUES ($1,$2,$3,$4,$5,$6)', [id, item.name, item.email, item.role, item.active, await bcrypt.hash(String(item.password), 12)]);
      }
    }
    for (const user of existing.rows) {
      if (!incomingIds.has(user.id) && user.id !== auth.session!.id) await query('UPDATE admin_users SET active=FALSE WHERE id=$1', [user.id]);
    }
    await query('INSERT INTO audit_logs (user_id, action, resource, metadata) VALUES ($1,$2,$3,$4::jsonb)', [auth.session!.id, 'users.updated', 'users', JSON.stringify({ count: validatedItems.length })]);
    return NextResponse.json({ ok: true });
  }
  await replaceCollection(resource, validatedItems);
  await query(
    'INSERT INTO audit_logs (user_id, action, resource, metadata) VALUES ($1, $2, $3, $4::jsonb)',
    [auth.session!.id, 'collection.updated', resource, JSON.stringify({ count: validatedItems.length })],
  );
  return NextResponse.json({ ok: true });
}
