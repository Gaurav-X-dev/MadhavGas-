import { open, stat } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const safeFileName = /^[0-9]+-[a-f0-9]{24}\.(?:jpg|png|webp|mp4|webm)$/;
const mimeTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};
const videoExtensions = new Set(['.mp4', '.webm']);

type RouteContext = { params: Promise<{ filename: string }> };

function notFound() {
  return NextResponse.json({ error: 'Media not found' }, { status: 404 });
}

async function readRange(target: string, start: number, end: number) {
  const handle = await open(target, 'r');
  try {
    const length = end - start + 1;
    const buffer = Buffer.allocUnsafe(length);
    await handle.read(buffer, 0, length, start);
    return buffer;
  } finally {
    await handle.close();
  }
}

export async function GET(request: Request, context: RouteContext) {
  const { filename } = await context.params;
  if (!safeFileName.test(filename)) return notFound();

  const directory = path.resolve(process.cwd(), 'public', 'uploads');
  const target = path.resolve(directory, filename);
  if (!target.startsWith(`${directory}${path.sep}`)) return notFound();

  const extension = path.extname(filename);
  const contentType = mimeTypes[extension] || 'application/octet-stream';
  const baseHeaders = {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  };

  let size: number;
  try {
    size = (await stat(target)).size;
  } catch {
    return notFound();
  }

  // Browsers seek through video with byte-range requests; without 206 support a
  // player can only stream from the start and the scrubber does not work.
  const range = videoExtensions.has(extension) ? request.headers.get('range') : null;
  const match = range?.match(/^bytes=(\d*)-(\d*)$/);
  if (match) {
    const startValue = match[1];
    const endValue = match[2];
    let start = startValue ? Number(startValue) : 0;
    let end = endValue ? Number(endValue) : size - 1;
    if (!startValue && endValue) {
      // A suffix range ("bytes=-500") asks for the final N bytes.
      start = Math.max(0, size - Number(endValue));
      end = size - 1;
    }
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
      return new Response(null, { status: 416, headers: { ...baseHeaders, 'Content-Range': `bytes */${size}` } });
    }
    end = Math.min(end, size - 1);
    try {
      const chunk = await readRange(target, start, end);
      return new Response(new Uint8Array(chunk), {
        status: 206,
        headers: {
          ...baseHeaders,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(end - start + 1),
          'Content-Range': `bytes ${start}-${end}/${size}`,
        },
      });
    } catch {
      return notFound();
    }
  }

  try {
    const whole = await readRange(target, 0, size - 1);
    return new Response(new Uint8Array(whole), {
      headers: {
        ...baseHeaders,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(size),
      },
    });
  } catch {
    return notFound();
  }
}
