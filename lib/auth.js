import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { USERS } from './constants';
import { one } from './db';

const COOKIE = 'mm_session';
const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    const e = new Error('AUTH_SECRET missing');
    e.publicMessage = 'Server is not configured yet (AUTH_SECRET missing).';
    throw e;
  }
  return new TextEncoder().encode(s);
}

export const hashPassword = (pw) => bcrypt.hash(pw, 11);
export const checkPassword = (pw, hash) => bcrypt.compare(pw, hash);

export async function createSession(name, version) {
  const token = await new SignJWT({ name, v: version })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  (await cookies()).set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export async function getSession() {
  try {
    const token = (await cookies()).get(COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret());
    if (!USERS.includes(payload.name)) return null;
    const user = await one('SELECT name, session_version FROM users WHERE name = $1', [payload.name]);
    if (!user || user.session_version !== payload.v) return null;
    return { name: user.name };
  } catch {
    return null;
  }
}
