import { route, json, HttpError, str, money, dateStr, id } from '@/lib/api';
import { q, one } from '@/lib/db';
import { INVEST_TYPES, CURRENCIES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

function parse(body) {
  const name = str(body.name, 60);
  if (!name) throw new HttpError(400, 'Give it a name');
  if (!INVEST_TYPES.some((t) => t.id === body.type)) throw new HttpError(400, 'Invalid type');
  if (!CURRENCIES[body.currency]) throw new HttpError(400, 'Invalid currency');
  const invested = money(body.invested ?? 0, { allowZero: true, label: 'Amount invested' });
  const current_value = money(body.current_value ?? body.invested ?? 0, { allowZero: true, label: 'Current value' });
  const rate = body.rate === '' || body.rate == null ? null : money(body.rate, { allowZero: true, label: 'Interest rate' });
  const maturity_date = body.maturity_date ? dateStr(body.maturity_date, 'Maturity date') : null;
  const status = body.status === 'closed' ? 'closed' : 'active';
  return { name, type: body.type, currency: body.currency, invested, current_value, rate, maturity_date, note: str(body.note, 300), status };
}

export const POST = route(async ({ me, body }) => {
  const v = parse(body);
  const row = await one(
    `INSERT INTO investments (name, type, currency, invested, current_value, rate, maturity_date, note, status, user_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [v.name, v.type, v.currency, v.invested, v.current_value, v.rate, v.maturity_date, v.note, v.status, me.name]
  );
  return json({ ok: true, id: row.id });
});

export const PUT = route(async ({ body }) => {
  const invId = id(body.id);
  const v = parse(body);
  await q(
    `UPDATE investments SET name=$1, type=$2, currency=$3, invested=$4, current_value=$5, rate=$6,
       maturity_date=$7, note=$8, status=$9, updated_at=now() WHERE id=$10`,
    [v.name, v.type, v.currency, v.invested, v.current_value, v.rate, v.maturity_date, v.note, v.status, invId]
  );
  return json({ ok: true });
});

export const DELETE = route(async ({ url }) => {
  await q('DELETE FROM investments WHERE id = $1', [id(url.searchParams.get('id'))]);
  return json({ ok: true });
});
