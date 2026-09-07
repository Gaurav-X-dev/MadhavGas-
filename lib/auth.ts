import { cookies } from 'next/headers';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { redirect } from 'next/navigation';
import { query } from './db';

export const SESSION_COOKIE = 'mbga_session';

export interface SessionUser extends JWTPayload {
  id: string;
  email: string;
  name: string;
  role: string;
}

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error('AUTH_SECRET must be at least 32 characters');
  return new TextEncoder().encode(value);
}

export async function createSessionToken(user: Pick<SessionUser, 'id' | 'email' | 'name' | 'role'>) {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret());
}

export async function verifySessionToken(token?: string | null): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect('/admin/login');
  const current = await query<{ name: string; email: string; role: string; active: boolean }>('SELECT name,email,role,active FROM admin_users WHERE id=$1', [session.id]);
  const user = current.rows[0];
  if (!user?.active) redirect('/admin/login');
  return { ...session, name: user.name, email: user.email, role: user.role };
}
