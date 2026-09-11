import path from 'node:path';

export function uploadDirectory() {
  const configured = process.env.UPLOAD_DIR?.trim();
  if (configured) return path.resolve(configured);
  return path.resolve(process.cwd(), 'public', 'uploads');
}
