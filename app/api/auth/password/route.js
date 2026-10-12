import { route, json, HttpError } from '@/lib/api';
import { createSession, checkPassword, hashPassword } from '@/lib/auth';
import { q, one } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const POST = route(async ({ me, body }) => {
  const current = typeof body.current === 'string' ? body.current : '';
  const next = typeof body.next === 'string' ? body.next : '';
  if (next.length < 8) throw new HttpError(400, 'New password must be at least 8 characters.');
  const user = await one('SELECT password_hash FROM users WHERE name = $1', [me.name]);
  if (!user || !(await checkPassword(current, user.password_hash))) throw new HttpError(401, 'Current password is wrong.');
  const hash = await hashPassword(next);
  const rows = await q(
    'UPDATE users SET password_hash = $1, session_version = session_version + 1 WHERE name = $2 RETURNING session_version',
    [hash, me.name]
  );
  await createSession(me.name, rows[0].session_version); // keep this device signed in; all others are signed out
  return json({ ok: true });
});
