import crypto from 'node:crypto';
import { route, json, HttpError, str } from '@/lib/api';
import { createSession, hashPassword } from '@/lib/auth';
import { q, one } from '@/lib/db';
import { USERS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

function codesMatch(a, b) {
  const x = crypto.createHash('sha256').update(a).digest();
  const y = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(x, y);
}

// First-time activation of the two accounts (Amal and Vani only).
export const POST = route(
  async ({ req, body }) => {
    const expected = process.env.SETUP_CODE;
    if (!expected || expected.length < 8) {
      throw new HttpError(503, 'SETUP_CODE is not configured on the server (needs 8+ characters).');
    }
    const name = str(body.name, 20);
    const password = typeof body.password === 'string' ? body.password : '';
    const code = typeof body.code === 'string' ? body.code : '';

    if (!USERS.includes(name)) throw new HttpError(400, 'Only Amal and Vani can use this app.');
    if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters.');

    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    const fails = await one(
      `SELECT COUNT(*)::int AS n FROM login_attempts WHERE name = 'setup' AND ok = false AND at > now() - interval '15 minutes'`
    );
    if (fails.n >= 5) throw new HttpError(429, 'Too many wrong setup codes. Try again in 15 minutes.');

    if (!codesMatch(code, expected)) {
      await q(`INSERT INTO login_attempts (ip, name, ok) VALUES ($1, 'setup', false)`, [ip]);
      throw new HttpError(403, 'That setup code is not correct.');
    }

    const hash = await hashPassword(password);
    // ON CONFLICT DO NOTHING: an already-activated account can never be taken over from here.
    const rows = await q(
      `INSERT INTO users (name, password_hash) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING RETURNING name, session_version`,
      [name, hash]
    );
    if (!rows.length) throw new HttpError(409, `${name}'s account is already activated. Please sign in.`);
    await createSession(rows[0].name, rows[0].session_version);
    return json({ ok: true, me: rows[0].name });
  },
  { auth: false }
);
