'use client';
import { useState } from 'react';
import { useApp } from './ctx';
import { Hero, Fab, Empty, Bar, sum } from './ui';
import { TxRow } from './TxRow';
import { fmt, todayStr, monthOf, addMonths, monthLabel, dayLabel } from '@/lib/format';
import { INCOME_ICONS, USERS } from '@/lib/constants';

export default function IncomePage() {
  const { data, txBase, base, openSheet } = useApp();
  const thisMonth = monthOf(todayStr());
  const [month, setMonth] = useState(thisMonth);

  const inc = data.transactions.filter((t) => t.type === 'income' && monthOf(t.date) === month);
  const total = sum(inc.map(txBase));
  const per = Object.fromEntries(USERS.map((u) => [u, sum(inc.filter((t) => t.user_name === u).map(txBase))]));
  const byCat = {};
  for (const t of inc) byCat[t.category || 'Other'] = (byCat[t.category || 'Other'] || 0) + txBase(t);
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

  const days = [];
  for (const t of inc) {
    const last = days[days.length - 1];
    if (last && last.date === t.date) last.items.push(t);
    else days.push({ date: t.date, items: [t] });
  }

  return (
    <>
      <Hero title="Income">
        <div className="monthnav">
          <button onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month">‹</button>
          <strong>{monthLabel(month)}</strong>
          <button onClick={() => setMonth(addMonths(month, 1))} disabled={month >= thisMonth} aria-label="Next month">›</button>
        </div>
        <div className="hero-main">
          <div className="hero-label">{month === thisMonth ? 'Income this month' : 'Income'}</div>
          <div className="hero-amount">{fmt(total, base)}</div>
          <div className="hero-sub">
            {USERS.map((u) => (
              <span className="pill" key={u}>{u} {fmt(per[u], base)}</span>
            ))}
          </div>
        </div>
      </Hero>

      <main className="content">
        {cats.length > 0 && (
          <div className="card">
            <h3>By category</h3>
            {cats.map(([c, v]) => (
              <div className="bar-row" key={c}>
                <div className="bar-head"><span>{INCOME_ICONS[c] || '✨'} {c}</span><b>{fmt(v, base)}</b></div>
                <Bar pct={(v / total) * 100} green />
              </div>
            ))}
          </div>
        )}

        {days.length ? (
          days.map((d) => (
            <div key={d.date} style={{ display: 'grid', gap: 8 }}>
              <div className="section-title"><span>{dayLabel(d.date)}</span><span className="sum">{fmt(sum(d.items.map(txBase)), base)}</span></div>
              <div className="card flush">{d.items.map((t) => <TxRow key={t.id} t={t} />)}</div>
            </div>
          ))
        ) : (
          <div className="card"><Empty icon="💰">No income recorded for {monthLabel(month)}.<br />Tap + to add salary, locum, a gift…</Empty></div>
        )}
      </main>

      <Fab onClick={() => openSheet({ kind: 'tx', type: 'income', date: todayStr() })} label="Add income" />
    </>
  );
}
