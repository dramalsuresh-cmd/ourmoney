import { route, json } from '@/lib/api';
import { q } from '@/lib/db';
import { ACCOUNTS_SQL, getSettings } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export const GET = route(async ({ me }) => {
  const [accounts, transactions, investments, budgets, settings] = await Promise.all([
    q(`${ACCOUNTS_SQL} ORDER BY a.archived, a.id`),
    q(`SELECT id, type, amount::float8 AS amount, category, note, account_id, to_account_id,
              to_amount::float8 AS to_amount, date, user_name, edited_by, created_at
       FROM transactions ORDER BY date DESC, id DESC LIMIT 20000`),
    q(`SELECT id, name, type, currency, invested::float8 AS invested, current_value::float8 AS current_value,
              rate::float8 AS rate, maturity_date, note, status, user_name
       FROM investments ORDER BY status, id`),
    q(`SELECT category, monthly_limit::float8 AS monthly_limit FROM budgets`),
    getSettings(),
  ]);
  return json({ me: me.name, accounts, transactions, investments, budgets, settings });
});
