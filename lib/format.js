import { CURRENCIES } from './constants';

const pad = (n) => String(n).padStart(2, '0');

export function fmt(n, cur = 'GBP', { sign = false } = {}) {
  const c = CURRENCIES[cur] || CURRENCIES.GBP;
  const abs = Math.abs(Number(n) || 0);
  const s = new Intl.NumberFormat(c.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(abs);
  const neg = n < 0 && abs >= 0.005 ? '-' : sign && n > 0 ? '+' : '';
  return `${neg}${c.symbol}${s}`;
}

export function conv(amount, from, to, rates) {
  if (from === to || !rates) return amount;
  return (amount / rates[from]) * rates[to];
}

export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => ymd(new Date());
export const parseYmd = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export function addDays(s, n) {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}
export const monthOf = (s) => s.slice(0, 7);
export function addMonths(key, n) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
export function monthLabel(key, short = false) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', short ? { month: 'short' } : { month: 'long', year: 'numeric' });
}
export function longDate(s) {
  return parseYmd(s).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
export function shortDate(s) {
  return parseYmd(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
export function dayLabel(s) {
  const t = todayStr();
  if (s === t) return 'Today';
  if (s === addDays(t, -1)) return 'Yesterday';
  return parseYmd(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
export function daysUntil(s) {
  return Math.round((parseYmd(s) - parseYmd(todayStr())) / 86400000);
}
