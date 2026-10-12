import { route, json, str, money } from '@/lib/api';
import { q } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Monthly limits are kept in the base currency. A limit of 0 removes the budget.
export const PUT = route(async ({ body }) => {
  const category = str(body.category, 40);
  if (!category) return json({ error: 'Choose a category' }, 400);
  const limit = money(body.monthly_limit ?? 0, { allowZero: true, label: 'Budget' });
  if (limit === 0) await q('DELETE FROM budgets WHERE category = $1', [category]);
  else
    await q(
      `INSERT INTO budgets (category, monthly_limit) VALUES ($1,$2)
       ON CONFLICT (category) DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit`,
      [category, limit]
    );
  return json({ ok: true });
});
