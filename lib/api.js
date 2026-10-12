import { NextResponse } from 'next/server';
import { getSession } from './auth';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.publicMessage = message;
  }
}

export const json = (data, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

function sameOrigin(req) {
  const origin = req.headers.get('origin');
  if (!origin) return true; // same-origin fetches from some browsers omit it for GET only; POSTs include it
  try {
    return new URL(origin).host === req.headers.get('host');
  } catch {
    return false;
  }
}

export function route(fn, { auth = true } = {}) {
  return async (req) => {
    try {
      if (req.method !== 'GET' && !sameOrigin(req)) throw new HttpError(403, 'Blocked cross-site request');
      let me = null;
      if (auth) {
        me = await getSession();
        if (!me) throw new HttpError(401, 'Please sign in');
      }
      let body = null;
      if (req.method !== 'GET' && req.method !== 'DELETE') {
        try {
          body = await req.json();
        } catch {
          body = {};
        }
      }
      return await fn({ req, me, body, url: new URL(req.url) });
    } catch (e) {
      if (!(e instanceof HttpError)) console.error(e);
      return json({ error: e.publicMessage || 'Something went wrong. Please try again.' }, e.status || 500);
    }
  };
}

// ---------- validation helpers ----------
export const str = (v, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export function money(v, { allowZero = false, allowNegative = false, label = 'Amount' } = {}) {
  const n = typeof v === 'string' ? Number(v.replace(/,/g, '')) : Number(v);
  if (!Number.isFinite(n)) throw new HttpError(400, `${label} is not a valid number`);
  if (!allowNegative && n < 0) throw new HttpError(400, `${label} cannot be negative`);
  if (!allowZero && n === 0) throw new HttpError(400, `${label} must be more than zero`);
  if (Math.abs(n) > 1e12) throw new HttpError(400, `${label} is too large`);
  return Math.round(n * 100) / 100;
}
export function dateStr(v, label = 'Date') {
  const ok = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (ok) {
    const [y, m, d] = v.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d) return v;
  }
  throw new HttpError(400, `${label} is not valid`);
}
export const id = (v) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, 'Invalid id');
  return n;
};
