'use client';
import { useMemo, useState } from 'react';
import { useApp } from './ctx';
import { Hero, Empty, Bar, Seg, Who, sum } from './ui';
import { TxRow } from './TxRow';
import { api } from '@/lib/client';
import { fmt, todayStr, monthOf, addMonths, monthLabel, shortDate } from '@/lib/format';
import { CURRENCIES, EXPENSE_ICONS, USERS } from '@/lib/constants';

/* ============================================================ More menu ============================================================ */
export function MoreMenu({ go }) {
  const { me } = useApp();
  const items = [
    { id: 'reports', icon: '📊', title: 'Reports', sub: 'Spending by category, income vs expenses, trends' },
    { id: 'budgets', icon: '🎯', title: 'Budgets', sub: 'Monthly limits per category' },
    { id: 'history', icon: '🔎', title: 'All transactions', sub: 'Search, filter and export to CSV' },
    { id: 'settings', icon: '⚙️', title: 'Settings', sub: 'Currencies, categories, password, sign out' },
  ];
  return (
    <>
      <Hero title="More">
        <div className="hero-main">
          <div className="hero-label">Signed in as</div>
          <div className="hero-amount" style={{ fontSize: 30 }}>{me}</div>
          <div className="hero-sub"><span className="pill"><span className="livedot" />Shared with {USERS.find((u) => u !== me)} · updates live</span></div>
        </div>
      </Hero>
      <main className="content">
        <div className="card flush">
          {items.map((i) => (
            <button key={i.id} className="row menu-row" onClick={() => go(i.id)}>
              <div className="ico">{i.icon}</div>
              <div className="row-main"><div className="row-title">{i.title}</div><div className="row-sub">{i.sub}</div></div>
              <span className="chev">›</span>
            </button>
          ))}
        </div>
      </main>
    </>
  );
}

/* ============================================================ Reports ============================================================ */
function Trend({ months }) {
  const max = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]));
  const W = 320, H = 150, base = 124, top = 10;
  const slot = W / months.length;
  const h = (v) => ((base - top) * v) / max;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Income and expenses for the last 6 months">
      <line x1="0" x2={W} y1={base} y2={base} stroke="var(--line)" />
      {months.map((m, i) => {
        const x = i * slot + slot / 2;
        return (
          <g key={m.key}>
            <rect x={x - 15} y={base - h(m.income)} width="13" height={h(m.income)} rx="3" fill="var(--green)" opacity="0.85" />
            <rect x={x + 2} y={base - h(m.expense)} width="13" height={h(m.expense)} rx="3" fill="var(--magenta)" />
            <text x={x} y={base + 16} textAnchor="middle" fontSize="11" fill="var(--muted)">{monthLabel(m.key, true)}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function ReportsPage({ onBack }) {
  const { data, txBase, base } = useApp();
  const thisMonth = monthOf(todayStr());
  const [month, setMonth] = useState(thisMonth);

  const totals = (key) => {
    const tx = data.transactions.filter((t) => monthOf(t.date) === key);
    return {
      key,
      income: sum(tx.filter((t) => t.type === 'income').map(txBase)),
      expense: sum(tx.filter((t) => t.type === 'expense').map(txBase)),
    };
  };
  const cur = totals(month);
  const exp = data.transactions.filter((t) => t.type === 'expense' && monthOf(t.date) === month);
  const byCat = {};
  for (const t of exp) byCat[t.category || 'Other'] = (byCat[t.category || 'Other'] || 0) + txBase(t);
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const per = Object.fromEntries(USERS.map((u) => [u, sum(exp.filter((t) => t.user_name === u).map(txBase))]));
  const trend = useMemo(() => [5, 4, 3, 2, 1, 0].map((n) => totals(addMonths(month, -n))), [data, month]); // eslint-disable-line

  return (
    <>
      <Hero title="Reports" onBack={onBack}>
        <div className="monthnav">
          <button onClick={() => setMonth(addMonths(month, -1))}>‹</button>
          <strong>{monthLabel(month)}</strong>
          <button onClick={() => setMonth(addMonths(month, 1))} disabled={month >= thisMonth}>›</button>
        </div>
        <div className="hero-main">
          <div className="hero-label">Net for the month</div>
          <div className="hero-amount">{fmt(cur.income - cur.expense, base, { sign: true })}</div>
        </div>
      </Hero>
      <main className="content">
        <div className="card">
          <div className="stat-grid">
            <div className="stat"><span>Income</span><b className="pos">{fmt(cur.income, base)}</b></div>
            <div className="stat"><span>Spent</span><b>{fmt(cur.expense, base)}</b></div>
            <div className="stat"><span>Saved</span><b>{cur.income > 0 ? `${Math.round(((cur.income - cur.expense) / cur.income) * 100)}%` : '–'}</b></div>
          </div>
        </div>
        <div className="card">
          <h3>Last 6 months</h3>
          <Trend months={trend} />
          <div className="legend"><span><i style={{ background: 'var(--green)' }} />Income</span><span><i style={{ background: 'var(--magenta)' }} />Spent</span></div>
        </div>
        <div className="card">
          <h3>Who spent what</h3>
          {USERS.map((u) => (
            <div className="bar-row" key={u}>
              <div className="bar-head"><span><Who name={u} /></span><b>{fmt(per[u], base)}</b></div>
              <Bar pct={cur.expense ? (per[u] / cur.expense) * 100 : 0} />
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Spending by category</h3>
          {cats.length ? (
            cats.map(([c, v]) => (
              <div className="bar-row" key={c}>
                <div className="bar-head"><span>{EXPENSE_ICONS[c] || '✨'} {c}</span><b>{fmt(v, base)} <span className="muted" style={{ fontWeight: 500 }}>· {Math.round((v / cur.expense) * 100)}%</span></b></div>
                <Bar pct={(v / cats[0][1]) * 100} />
              </div>
            ))
          ) : (
            <Empty icon="📊">No spending recorded this month.</Empty>
          )}
        </div>
      </main>
    </>
  );
}

/* ============================================================ Budgets ============================================================ */
export function BudgetsPage({ onBack }) {
  const { data, settings, txBase, base, openSheet } = useApp();
  const month = monthOf(todayStr());
  const spent = {};
  for (const t of data.transactions) if (t.type === 'expense' && monthOf(t.date) === month) spent[t.category || 'Other'] = (spent[t.category || 'Other'] || 0) + txBase(t);
  const limits = Object.fromEntries(data.budgets.map((b) => [b.category, b.monthly_limit]));
  const totalLimit = sum(Object.values(limits));
  const totalSpent = sum(Object.keys(limits).map((c) => spent[c] || 0));
  const cats = [...settings.expenseCats].sort((a, b) => (limits[b] ? 1 : 0) - (limits[a] ? 1 : 0));

  return (
    <>
      <Hero title="Budgets" onBack={onBack}>
        <div className="hero-main">
          <div className="hero-label">{monthLabel(month)} · budgeted categories</div>
          <div className="hero-amount">{totalLimit ? fmt(totalLimit - totalSpent, base) : '—'}</div>
          <div className="hero-sub"><span className="pill">{totalLimit ? `${fmt(totalSpent, base)} spent of ${fmt(totalLimit, base)}` : 'Tap a category to set a monthly limit'}</span></div>
        </div>
      </Hero>
      <main className="content">
        <div className="card flush">
          {cats.map((c) => {
            const lim = limits[c];
            const s = spent[c] || 0;
            return (
              <button key={c} className="row" onClick={() => openSheet({ kind: 'budget', category: c, current: lim })}>
                <div className="ico">{EXPENSE_ICONS[c] || '✨'}</div>
                <div className="row-main">
                  <div className="row-title">{c}</div>
                  {lim ? (
                    <>
                      <div style={{ margin: '6px 0 4px' }}><Bar pct={(s / lim) * 100} over={s > lim} /></div>
                      <div className="row-sub"><span className={s > lim ? 'red' : ''}>{fmt(s, base)} of {fmt(lim, base)}{s > lim ? ` · over by ${fmt(s - lim, base)}` : ` · ${fmt(lim - s, base)} left`}</span></div>
                    </>
                  ) : (
                    <div className="row-sub">{s ? `${fmt(s, base)} spent · no limit` : 'No limit set'}</div>
                  )}
                </div>
                <span className="chev muted">›</span>
              </button>
            );
          })}
        </div>
      </main>
    </>
  );
}

/* ============================================================ History ============================================================ */
function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function HistoryPage({ onBack }) {
  const { data, accountById, toast } = useApp();
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [who, setWho] = useState('all');
  const [acct, setAcct] = useState('all');
  const [limit, setLimit] = useState(60);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.transactions.filter((t) => {
      if (type !== 'all' && t.type !== type) return false;
      if (who !== 'all' && t.user_name !== who) return false;
      if (acct !== 'all' && t.account_id !== Number(acct) && t.to_account_id !== Number(acct)) return false;
      if (needle && !`${t.note || ''} ${t.category || ''} ${t.amount}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [data.transactions, q, type, who, acct]);

  function exportCsv() {
    const head = ['Date', 'Type', 'Amount', 'Currency', 'Category', 'Note', 'Account', 'To account', 'Amount received', 'By', 'Edited by'];
    const rows = filtered.map((t) => {
      const a = accountById[t.account_id];
      const to = t.to_account_id ? accountById[t.to_account_id] : null;
      return [t.date, t.type, t.amount, a?.currency, t.category, t.note, a?.name, to?.name, t.to_amount, t.user_name, t.edited_by];
    });
    const csv = [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `our-money-${todayStr()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast(`Exported ${rows.length} transactions`);
  }

  return (
    <>
      <Hero title="All transactions" onBack={onBack}>
        <div className="hero-main">
          <div className="hero-label">{filtered.length} matching</div>
          <input className="input" style={{ marginTop: 8, background: 'rgba(255,255,255,.95)', color: '#2a1020' }} placeholder="Search note, category or amount…" value={q} onChange={(e) => { setQ(e.target.value); setLimit(60); }} />
        </div>
      </Hero>
      <main className="content">
        <div className="card">
          <Seg value={type} onChange={(v) => { setType(v); setLimit(60); }} options={[{ id: 'all', label: 'All' }, { id: 'expense', label: 'Expenses' }, { id: 'income', label: 'Income' }, { id: 'transfer', label: 'Transfers' }]} />
          <div className="two">
            <select className="input" value={who} onChange={(e) => setWho(e.target.value)} aria-label="Person">
              <option value="all">Amal & Vani</option>
              {USERS.map((u) => <option key={u} value={u}>{u} only</option>)}
            </select>
            <select className="input" value={acct} onChange={(e) => setAcct(e.target.value)} aria-label="Account">
              <option value="all">All accounts</option>
              {data.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="btn-row"><button className="btn ghost sm" style={{ width: '100%' }} onClick={exportCsv} disabled={!filtered.length}>⬇ Export these {filtered.length} to CSV</button></div>
        </div>
        <div className="card flush">
          {filtered.length ? filtered.slice(0, limit).map((t) => <TxRow key={t.id} t={t} showDate />) : <Empty icon="🔎">No transactions match.</Empty>}
        </div>
        {filtered.length > limit && <button className="btn ghost" onClick={() => setLimit(limit + 100)}>Show more</button>}
      </main>
    </>
  );
}

/* ============================================================ Settings ============================================================ */
function CategoryEditor({ title, field, list, icons }) {
  const { refresh, toast } = useApp();
  const [text, setText] = useState('');
  async function save(next) {
    try {
      await api('/api/settings', 'PUT', { [field]: next });
      await refresh(true);
    } catch (e) {
      toast(e.message, 'bad');
    }
  }
  return (
    <div className="card">
      <h3>{title}</h3>
      <div className="chips" style={{ marginBottom: 12 }}>
        {list.map((c) => (
          <span key={c} className="chip" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            {icons[c] || '✨'} {c}
            <button aria-label={`Remove ${c}`} onClick={() => list.length > 1 && save(list.filter((x) => x !== c))} style={{ opacity: 0.6, fontWeight: 800 }}>×</button>
          </span>
        ))}
      </div>
      <form
        style={{ display: 'flex', gap: 8 }}
        onSubmit={(e) => {
          e.preventDefault();
          const v = text.trim();
          if (v && !list.includes(v)) save([...list, v]);
          setText('');
        }}
      >
        <input className="input" placeholder="New category" value={text} maxLength={40} onChange={(e) => setText(e.target.value)} />
        <button className="btn sm" type="submit" style={{ flex: '0 0 auto' }}>Add</button>
      </form>
    </div>
  );
}

export function SettingsPage({ onBack }) {
  const { settings, me, refresh, toast, signOut, base } = useApp();
  const [inr, setInr] = useState(String(settings.rates.INR));
  const [eur, setEur] = useState(String(settings.rates.EUR));
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(fn, ok) {
    setBusy(true);
    try {
      await fn();
      await refresh(true);
      if (ok) toast(ok);
    } catch (e) {
      toast(e.message, 'bad');
    }
    setBusy(false);
  }

  return (
    <>
      <Hero title="Settings" onBack={onBack}>
        <div className="hero-main"><div className="hero-label">Signed in as <b>{me}</b></div></div>
      </Hero>
      <main className="content">
        <div className="card">
          <h3>Main currency</h3>
          <p className="hint" style={{ marginBottom: 10 }}>Totals, net worth and reports are shown in this currency. Each account keeps its own currency.</p>
          <Seg value={base} onChange={(v) => run(() => api('/api/settings', 'PUT', { baseCurrency: v }), 'Main currency changed')} options={Object.keys(CURRENCIES).map((c) => ({ id: c, label: `${CURRENCIES[c].symbol} ${c}` }))} />
        </div>

        <div className="card">
          <h3>Exchange rates</h3>
          <p className="hint" style={{ marginBottom: 10 }}>How many of each currency equal £1. Used to add up accounts held in different currencies.</p>
          <div className="two">
            <div className="field"><label>£1 = ₹ INR</label><input className="input" inputMode="decimal" value={inr} onChange={(e) => setInr(e.target.value.replace(/[^0-9.]/g, ''))} /></div>
            <div className="field"><label>£1 = € EUR</label><input className="input" inputMode="decimal" value={eur} onChange={(e) => setEur(e.target.value.replace(/[^0-9.]/g, ''))} /></div>
          </div>
          <div className="btn-row">
            <button className="btn" disabled={busy} onClick={() => run(() => api('/api/settings', 'PUT', { rates: { GBP: 1, INR: inr, EUR: eur } }), 'Rates saved')}>Save rates</button>
            <button
              className="btn ghost"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const r = await api('/api/settings', 'POST', { action: 'refreshRates' });
                  setInr(String(r.settings.rates.INR));
                  setEur(String(r.settings.rates.EUR));
                }, 'Live rates updated')
              }
            >
              Fetch today’s live rates
            </button>
          </div>
          {settings.ratesUpdated && <p className="hint" style={{ marginTop: 8 }}>Last updated {shortDate(settings.ratesUpdated.slice(0, 10))}</p>}
        </div>

        <CategoryEditor title="Expense categories" field="expenseCats" list={settings.expenseCats} icons={EXPENSE_ICONS} />
        <CategoryEditor title="Income categories" field="incomeCats" list={settings.incomeCats} icons={{}} />

        <div className="card">
          <h3>Change my password</h3>
          <div className="field"><label>Current password</label><input className="input" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} /></div>
          <div className="field"><label>New password (8+ characters)</label><input className="input" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} /></div>
          <button className="btn" disabled={busy || !cur || next.length < 8} onClick={() => run(async () => { await api('/api/auth/password', 'POST', { current: cur, next }); setCur(''); setNext(''); }, 'Password changed — other devices were signed out')}>Update password</button>
        </div>

        <div className="card">
          <h3>Install on your phone</h3>
          <p className="hint"><b>iPhone:</b> open in Safari → Share → <i>Add to Home Screen</i>.<br /><b>Android:</b> open in Chrome → ⋮ menu → <i>Install app</i>.</p>
        </div>

        <div className="btn-row">
          <button className="btn ghost" onClick={() => signOut(false)}>Sign out</button>
          <button className="btn danger" onClick={() => signOut(true)}>Sign out on all my devices</button>
        </div>
      </main>
    </>
  );
}
