import { route, json, HttpError, str } from '@/lib/api';
import { getSettings, putSetting } from '@/lib/queries';
import { CURRENCIES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

function cleanCats(list, label) {
  if (!Array.isArray(list)) throw new HttpError(400, `${label} must be a list`);
  const out = [...new Set(list.map((c) => str(c, 40)).filter(Boolean))];
  if (!out.length) throw new HttpError(400, `Keep at least one ${label.toLowerCase()}`);
  if (out.length > 60) throw new HttpError(400, 'Too many categories');
  return out;
}

export const PUT = route(async ({ body }) => {
  if (body.baseCurrency !== undefined) {
    if (!CURRENCIES[body.baseCurrency]) throw new HttpError(400, 'Invalid currency');
    await putSetting('base_currency', body.baseCurrency);
  }
  if (body.rates !== undefined) {
    const rates = {};
    for (const c of Object.keys(CURRENCIES)) {
      const n = Number(body.rates?.[c]);
      if (!Number.isFinite(n) || n <= 0) throw new HttpError(400, `Rate for ${c} is not valid`);
      rates[c] = n;
    }
    // Rates are "units per 1 GBP", so GBP itself is always 1.
    rates.GBP = 1;
    await putSetting('rates', rates);
    await putSetting('rates_updated', new Date().toISOString());
  }
  if (body.expenseCats !== undefined) await putSetting('expense_cats', cleanCats(body.expenseCats, 'Expense category'));
  if (body.incomeCats !== undefined) await putSetting('income_cats', cleanCats(body.incomeCats, 'Income category'));
  return json({ ok: true, settings: await getSettings() });
});

// Pull live exchange rates (GBP base) from the free Frankfurter service.
export const POST = route(async ({ body }) => {
  if (body.action !== 'refreshRates') throw new HttpError(400, 'Unknown action');
  let data;
  try {
    const res = await fetch('https://api.frankfurter.dev/v1/latest?base=GBP&symbols=INR,EUR', {
      signal: AbortSignal.timeout(7000),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(String(res.status));
    data = await res.json();
  } catch {
    throw new HttpError(502, "Couldn't fetch live rates right now. You can type them in manually.");
  }
  const rates = { GBP: 1, INR: Number(data?.rates?.INR), EUR: Number(data?.rates?.EUR) };
  if (!(rates.INR > 0) || !(rates.EUR > 0)) throw new HttpError(502, 'Live rates came back in an unexpected format.');
  await putSetting('rates', rates);
  await putSetting('rates_updated', new Date().toISOString());
  return json({ ok: true, settings: await getSettings() });
});
