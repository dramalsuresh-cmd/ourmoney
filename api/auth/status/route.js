import { route, json } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { q } from '@/lib/db';
import { USERS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export const GET = route(
  async () => {
    const rows = await q('SELECT name FROM users');
    const activated = rows.map((r) => r.name);
    const me = await getSession();
    return json({
      me: me?.name || null,
      users: USERS.map((name) => ({ name, activated: activated.includes(name) })),
      setupOpen: USERS.some((n) => !activated.includes(n)),
    });
  },
  { auth: false }
);
