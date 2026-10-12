import { q } from './db';
import { DEFAULT_RATES, DEFAULT_EXPENSE_CATS, DEFAULT_INCOME_CATS } from './constants';

export const ACCOUNTS_SQL = `
  SELECT a.id, a.name, a.type, a.currency, a.archived,
    a.opening_balance::float8 AS opening_balance,
    a.credit_limit::float8 AS credit_limit,
    (a.opening_balance
      + COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.account_id = a.id AND t.type = 'income'), 0)
      - COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.account_id = a.id AND t.type IN ('expense','transfer')), 0)
      + COALESCE((SELECT SUM(COALESCE(t.to_amount, t.amount)) FROM transactions t WHERE t.to_account_id = a.id AND t.type = 'transfer'), 0)
    )::float8 AS balance
  FROM accounts a`;

export async function getSettings() {
  const rows = await q('SELECT key, value FROM settings');
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    baseCurrency: m.base_currency || 'GBP',
    rates: { ...DEFAULT_RATES, ...(m.rates || {}) },
    ratesUpdated: m.rates_updated || null,
    expenseCats: m.expense_cats || DEFAULT_EXPENSE_CATS,
    incomeCats: m.income_cats || DEFAULT_INCOME_CATS,
  };
}

export async function putSetting(key, value) {
  await q(
    `INSERT INTO settings (key, value) VALUES ($1, $2::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, JSON.stringify(value)]
  );
}
