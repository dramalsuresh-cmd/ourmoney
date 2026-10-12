import { route, json, HttpError, str, money, dateStr, id } from '@/lib/api';
import { q, one } from '@/lib/db';
import { getSettings } from '@/lib/queries';

export const dynamic = 'force-dynamic';

async function parse(body, { creating }) {
  const type = body.type;
  if (!['expense', 'income', 'transfer'].includes(type)) throw new HttpError(400, 'Invalid transaction type');
  const amount = money(body.amount);
  const date = dateStr(body.date);
  const account_id = id(body.account_id);
  const acct = await one('SELECT id, currency, archived FROM accounts WHERE id = $1', [account_id]);
  if (!acct) throw new HttpError(400, 'Account not found');
  if (creating && acct.archived) throw new HttpError(400, 'That account is archived');

  const note = str(body.note, 200);
  let category = type === 'transfer' ? null : str(body.category, 40) || 'Other';
  let to_account_id = null;
  let to_amount = null;

  if (type === 'transfer') {
    to_account_id = id(body.to_account_id);
    if (to_account_id === account_id) throw new HttpError(400, 'Choose two different accounts');
    const to = await one('SELECT id, currency, archived FROM accounts WHERE id = $1', [to_account_id]);
    if (!to) throw new HttpError(400, 'Destination account not found');
    if (creating && to.archived) throw new HttpError(400, 'The destination account is archived');
    if (to.currency !== acct.currency) {
      if (body.to_amount !== undefined && body.to_amount !== null && body.to_amount !== '') {
        to_amount = money(body.to_amount, { label: 'Received amount' });
      } else {
        const { rates } = await getSettings();
        to_amount = Math.round(((amount / rates[acct.currency]) * rates[to.currency]) * 100) / 100;
      }
    }
  }
  return { type, amount, date, account_id, note, category, to_account_id, to_amount };
}

export const POST = route(async ({ me, body }) => {
  const t = await parse(body, { creating: true });
  const row = await one(
    `INSERT INTO transactions (type, amount, category, note, account_id, to_account_id, to_amount, date, user_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [t.type, t.amount, t.category, t.note, t.account_id, t.to_account_id, t.to_amount, t.date, me.name]
  );
  return json({ ok: true, id: row.id });
});

export const PUT = route(async ({ me, body }) => {
  const txId = id(body.id);
  const existing = await one('SELECT id FROM transactions WHERE id = $1', [txId]);
  if (!existing) throw new HttpError(404, 'Transaction not found');
  const t = await parse(body, { creating: false });
  await q(
    `UPDATE transactions SET type=$1, amount=$2, category=$3, note=$4, account_id=$5, to_account_id=$6,
       to_amount=$7, date=$8, edited_by=$9, updated_at=now() WHERE id=$10`,
    [t.type, t.amount, t.category, t.note, t.account_id, t.to_account_id, t.to_amount, t.date, me.name, txId]
  );
  return json({ ok: true });
});

export const DELETE = route(async ({ url }) => {
  const txId = id(url.searchParams.get('id'));
  await q('DELETE FROM transactions WHERE id = $1', [txId]);
  return json({ ok: true });
});
