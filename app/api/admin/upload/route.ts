import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { requireApiSession } from '@/lib/api-auth';
import { uploadDirectory } from '@/lib/upload-storage';

const maxBytes = 5 * 1024 * 1024;
const maxRequestBytes = 6 * 1024 * 1024;
const maxVideoBytes = 48 * 1024 * 1024;
const maxVideoRequestBytes = 50 * 1024 * 1024;
const maxDimension = 12_000;
const maxPixels = 40_000_000;
const formats: Record<string, { extension: string; acceptedExtensions: string[] }> = {
  'image/jpeg': { extension: '.jpg', acceptedExtensions: ['.jpg', '.jpeg'] },
  'image/png': { extension: '.png', acceptedExtensions: ['.png'] },
  'image/webp': { extension: '.webp', acceptedExtensions: ['.webp'] },
};
const videoFormats: Record<string, { extension: string; acceptedExtensions: string[] }> = {
  'video/mp4': { extension: '.mp4', acceptedExtensions: ['.mp4', '.m4v'] },
  'video/webm': { extension: '.webm', acceptedExtensions: ['.webm'] },
};

/**
 * Confirms the bytes really are the declared container, so a renamed file
 * cannot be stored under a video extension and served back as playable media.
 */
function isValidVideoContainer(type: string, bytes: Uint8Array) {
  if (type === 'video/mp4') {
    // An ISO base media file starts with a box whose type is "ftyp".
    if (bytes.length < 12) return false;
    return String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]) === 'ftyp';
  }
  if (type === 'video/webm') {
    // Matroska/WebM begins with the EBML magic number.
    return bytes.length > 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  }
  return false;
}

function uint32BE(bytes: Uint8Array, offset: number) {
  return (((bytes[offset] << 24) >>> 0) + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3]) >>> 0;
}

function jpegDimensions(bytes: Uint8Array) {
  if (bytes.length < 12 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + length + 2 > bytes.length) return null;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { width: (bytes[offset + 7] << 8) | bytes[offset + 8], height: (bytes[offset + 5] << 8) | bytes[offset + 6] };
    }
    offset += length + 2;
  }
  return null;
}

function imageDimensions(type: string, bytes: Uint8Array) {
  if (type === 'image/png') {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const validSignature = signature.every((value, index) => bytes[index] === value);
    const hasHeader = bytes.length >= 33 && String.fromCharCode(...bytes.slice(12, 16)) === 'IHDR';
    const hasEnd = bytes.length >= 12 && String.fromCharCode(...bytes.slice(-8, -4)) === 'IEND';
    if (!validSignature || !hasHeader || !hasEnd) return null;
    return { width: uint32BE(bytes, 16), height: uint32BE(bytes, 20) };
  }
  if (type === 'image/jpeg') return jpegDimensions(bytes);
  if (type === 'image/webp') {
    if (bytes.length < 30 || String.fromCharCode(...bytes.slice(0, 4)) !== 'RIFF' || String.fromCharCode(...bytes.slice(8, 12)) !== 'WEBP') return null;
    const declaredSize = bytes[4] | (bytes[5] << 8) | (bytes[6] << 16) | (bytes[7] << 24);
    if (declaredSize + 8 > bytes.length) return null;
    const chunk = String.fromCharCode(...bytes.slice(12, 16));
    if (chunk === 'VP8X') return { width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16) };
    if (chunk === 'VP8L' && bytes[20] === 0x2f) {
      return { width: 1 + (((bytes[22] & 0x3f) << 8) | bytes[21]), height: 1 + (((bytes[24] & 0x0f) << 10) | (bytes[23] << 2) | ((bytes[22] & 0xc0) >> 6)) };
    }
    if (chunk === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) return { width: (bytes[26] | (bytes[27] << 8)) & 0x3fff, height: (bytes[28] | (bytes[29] << 8)) & 0x3fff };
  }
  return null;
}

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(request);
  if (auth.response) return auth.response;
  if (auth.session!.role === 'Viewer' || auth.session!.role === 'Support Staff') return NextResponse.json({ error: 'Your role cannot upload media' }, { status: 403 });
  // `kind=video` switches the route to the larger video budget; anything else
  // keeps the stricter image limits.
  const isVideoUpload = new URL(request.url).searchParams.get('kind') === 'video';
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > (isVideoUpload ? maxVideoRequestBytes : maxRequestBytes)) {
    return NextResponse.json({ error: 'The upload request is too large' }, { status: 413 });
  }

  let formData: FormData;
  try { formData = await request.formData(); } catch { return NextResponse.json({ error: 'Upload data is invalid' }, { status: 400 }); }
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: `Choose a ${isVideoUpload ? 'video' : 'image'} to upload` }, { status: 400 });
  }

  if (isVideoUpload) {
    const videoFormat = videoFormats[file.type];
    if (!videoFormat || file.size === 0 || file.size > maxVideoBytes) {
      return NextResponse.json({ error: 'Use an MP4 or WebM video up to 48 MB' }, { status: 400 });
    }
    const suppliedVideoExtension = path.extname(file.name).toLowerCase();
    if (!videoFormat.acceptedExtensions.includes(suppliedVideoExtension)) {
      return NextResponse.json({ error: 'The filename extension does not match the selected video type' }, { status: 400 });
    }
    const videoBytes = new Uint8Array(await file.arrayBuffer());
    if (!isValidVideoContainer(file.type, videoBytes)) {
      return NextResponse.json({ error: 'The video is incomplete or is not a valid MP4/WebM file' }, { status: 400 });
    }
    const videoName = `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${videoFormat.extension}`;
    const videoDirectory = uploadDirectory();
    const videoTarget = path.resolve(videoDirectory, videoName);
    if (!videoTarget.startsWith(`${videoDirectory}${path.sep}`)) {
      return NextResponse.json({ error: 'Unsafe upload path rejected' }, { status: 400 });
    }
    await mkdir(videoDirectory, { recursive: true });
    await writeFile(videoTarget, videoBytes, { flag: 'wx' });
    return NextResponse.json({ url: `/uploads/${videoName}`, bytes: videoBytes.byteLength });
  }

  const format = formats[file.type];
  if (!format || file.size === 0 || file.size > maxBytes) return NextResponse.json({ error: 'Use a JPG, PNG or WebP image up to 5 MB' }, { status: 400 });
  const suppliedExtension = path.extname(file.name).toLowerCase();
  if (!format.acceptedExtensions.includes(suppliedExtension)) return NextResponse.json({ error: 'The filename extension does not match the selected image type' }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const dimensions = imageDimensions(file.type, bytes);
  if (!dimensions) return NextResponse.json({ error: 'The image is incomplete or could not be decoded' }, { status: 400 });
  if (dimensions.width < 1 || dimensions.height < 1 || dimensions.width > maxDimension || dimensions.height > maxDimension || dimensions.width * dimensions.height > maxPixels) {
    return NextResponse.json({ error: 'Image dimensions are unsupported (maximum 12,000 px and 40 megapixels)' }, { status: 400 });
  }

  const fileName = `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${format.extension}`;
  const directory = uploadDirectory();
  const target = path.resolve(directory, fileName);
  if (!target.startsWith(`${directory}${path.sep}`)) return NextResponse.json({ error: 'Unsafe upload path rejected' }, { status: 400 });
  await mkdir(directory, { recursive: true });
  await writeFile(target, bytes, { flag: 'wx' });
  return NextResponse.json({ url: `/uploads/${fileName}`, width: dimensions.width, height: dimensions.height });
}
