import { NextRequest, NextResponse } from 'next/server';
import { requireApiSession } from '@/lib/api-auth';
import { getSingleton, setSingleton, validSingleton } from '@/lib/resources';
import { query } from '@/lib/db';
import { singletonSchemas, validationMessage } from '@/lib/validation';
import { jsonRequestError } from '@/lib/request-security';

type RouteContext = { params: Promise<{ key: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { key } = await context.params;
  const auth = await requireApiSession(request);
  if (auth.response) return auth.response;
  if (!validSingleton(key)) return NextResponse.json({ error: 'Unknown settings group' }, { status: 404 });
  return NextResponse.json({ data: await getSingleton(key) });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { key } = await context.params;
  const auth = await requireApiSession(request);
  if (auth.response) return auth.response;
  if (!validSingleton(key)) return NextResponse.json({ error: 'Unknown settings group' }, { status: 404 });
  if (auth.session!.role === 'Viewer' || auth.session!.role === 'Support Staff') return NextResponse.json({ error: 'Your role cannot modify settings' }, { status: 403 });
  const requestError = jsonRequestError(request, 512 * 1024);
  if (requestError) return NextResponse.json({ error: requestError.error }, { status: requestError.status });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 }); }
  const parsed = singletonSchemas[key].safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });
  await setSingleton(key, parsed.data);
  await query(
    'INSERT INTO audit_logs (user_id, action, resource) VALUES ($1, $2, $3)',
    [auth.session!.id, 'settings.updated', key],
  );
  return NextResponse.json({ ok: true });
}
