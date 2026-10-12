import { route, json, HttpError, str } from '@/lib/api';
import { createSession, checkPassword, hashPassword } from '@/lib/auth';
import { q, one } from '@/lib/db';
import { USERS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

// Hash compared against when the account doesn't exist yet, so timing doesn't reveal activation state.
let dummyHash;

export const POST = route(
  async ({ req, body }) => {
    const name = str(body.name, 20);
    const password = typeof body.password === 'string' ? body.password : '';
    if (!USERS.includes(name)) throw new HttpError(400, 'Choose Amal or Vani.');

    const fails = await one(
      `SELECT COUNT(*)::int AS n FROM login_attempts WHERE name = $1 AND ok = false AND at > now() - interval '15 minutes'`,
      [name]
    );
    if (fails.n >= 5) throw new HttpError(429, 'Too many wrong attempts. Please wait 15 minutes and try again.');

    const user = await one('SELECT name, password_hash, session_version FROM users WHERE name = $1', [name]);
    dummyHash ||= await hashPassword('x' + Math.random());
    const ok = await checkPassword(password, user ? user.password_hash : dummyHash);
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';

    if (!user || !ok) {
      await q('INSERT INTO login_attempts (ip, name, ok) VALUES ($1, $2, false)', [ip, name]);
      throw new HttpError(401, user ? 'Wrong password.' : `${name}'s account has not been activated yet.`);
    }
    await q(`DELETE FROM login_attempts WHERE name = $1`, [name]);
    await createSession(user.name, user.session_version);
    return json({ ok: true, me: user.name });
  },
  { auth: false }
);
