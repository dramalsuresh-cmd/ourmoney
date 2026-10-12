import { route, json, HttpError, str, money, id } from '@/lib/api';
import { q, one } from '@/lib/db';
import { ACCOUNTS_SQL } from '@/lib/queries';
import { ACCOUNT_TYPES, CURRENCIES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

function parseCommon(body) {
  const name = str(body.name, 40);
  if (!name) throw new HttpError(400, 'Give the account a name');
  if (!ACCOUNT_TYPES.some((t) => t.id === body.type)) throw new HttpError(400, 'Invalid account type');
  if (!CURRENCIES[body.currency]) throw new HttpError(400, 'Invalid currency');
  const credit_limit =
    body.type === 'credit' && body.credit_limit !== '' && body.credit_limit != null
      ? money(body.credit_limit, { allowZero: true, label: 'Credit limit' })
      : null;
  return { name, type: body.type, currency: body.currency, credit_limit };
}

export const POST = route(async ({ me, body }) => {
  const a = parseCommon(body);
  // Opening balance: for credit cards enter what you currently owe as a negative number (or use "Amount owed").
  const opening = money(body.opening_balance ?? 0, { allowZero: true, allowNegative: true, label: 'Opening balance' });
  const row = await one(
    `INSERT INTO accounts (name, type, currency, opening_balance, credit_limit, created_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [a.name, a.type, a.currency, opening, a.credit_limit, me.name]
  );
  return json({ ok: true, id: row.id });
});

export const PUT = route(async ({ body }) => {
  const accId = id(body.id);
  const acct = await one(`${ACCOUNTS_SQL} WHERE a.id = $1`, [accId]);
  if (!acct) throw new HttpError(404, 'Account not found');

  if (body.archived !== undefined && body.name === undefined) {
    await q('UPDATE accounts SET archived = $1 WHERE id = $2', [!!body.archived, accId]);
    return json({ ok: true });
  }

  const a = parseCommon(body);
  if (a.currency !== acct.currency) {
    const used = await one('SELECT 1 AS x FROM transactions WHERE account_id = $1 OR to_account_id = $1 LIMIT 1', [accId]);
    if (used) throw new HttpError(400, "Currency can't be changed once an account has transactions");
  }
  let opening = acct.opening_balance;
  if (body.set_balance !== undefined && body.set_balance !== null && body.set_balance !== '') {
    // Reconcile: choose the opening balance so the current balance equals what the bank shows.
    const target = money(body.set_balance, { allowZero: true, allowNegative: true, label: 'Balance' });
    opening = Math.round((acct.opening_balance + (target - acct.balance)) * 100) / 100;
  } else if (body.opening_balance !== undefined) {
    opening = money(body.opening_balance, { allowZero: true, allowNegative: true, label: 'Opening balance' });
  }
  await q(
    'UPDATE accounts SET name=$1, type=$2, currency=$3, opening_balance=$4, credit_limit=$5 WHERE id=$6',
    [a.name, a.type, a.currency, opening, a.credit_limit, accId]
  );
  return json({ ok: true });
});

export const DELETE = route(async ({ url }) => {
  const accId = id(url.searchParams.get('id'));
  const used = await one('SELECT 1 AS x FROM transactions WHERE account_id = $1 OR to_account_id = $1 LIMIT 1', [accId]);
  if (used) throw new HttpError(409, 'This account has transactions, so it can only be archived (hidden), not deleted.');
  await q('DELETE FROM accounts WHERE id = $1', [accId]);
  return json({ ok: true });
});
