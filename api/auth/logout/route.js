import { route, json } from '@/lib/api';
import { clearSession } from '@/lib/auth';
import { q } from '@/lib/db';

export const dynamic = 'force-dynamic';

// { all: true } also signs this person out of every other device.
export const POST = route(async ({ me, body }) => {
  if (body && body.all) await q('UPDATE users SET session_version = session_version + 1 WHERE name = $1', [me.name]);
  await clearSession();
  return json({ ok: true });
});
