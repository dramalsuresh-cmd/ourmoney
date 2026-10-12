'use client';
import { useEffect, useRef, useState } from 'react';
import { useApp } from './ctx';
import { Hero, Fab, Empty, sum } from './ui';
import { TxRow } from './TxRow';
import { fmt, todayStr, addDays, dayLabel, longDate, monthOf } from '@/lib/format';
import { USERS } from '@/lib/constants';

export default function ExpensesPage() {
  const { data, txBase, base, openSheet } = useApp();
  const [date, setDate] = useState(todayStr());
  const lastToday = useRef(todayStr());
  const today = todayStr();

  // If the app stays open past midnight, jump to the new "today" when you come back to it.
  useEffect(() => {
    const onVis = () => {
      const t = todayStr();
      if (document.visibilityState === 'visible' && t !== lastToday.current) {
        setDate((d) => (d === lastToday.current ? t : d));
        lastToday.current = t;
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const dayTx = data.transactions.filter((t) => t.date === date && t.type !== 'income');
  const spent = dayTx.filter((t) => t.type === 'expense');
  const total = sum(spent.map(txBase));
  const per = Object.fromEntries(USERS.map((u) => [u, sum(spent.filter((t) => t.user_name === u).map(txBase))]));
  const month = monthOf(date);
  const monthTotal = sum(data.transactions.filter((t) => t.type === 'expense' && monthOf(t.date) === month).map(txBase));
  const weekStart = addDays(date, -6);
  const week = sum(data.transactions.filter((t) => t.type === 'expense' && t.date >= weekStart && t.date <= date).map(txBase));

  return (
    <>
      <Hero title={date === today ? "Today's expenses" : 'Expenses'}>
        <div className="datenav">
          <button onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">‹</button>
          <div className="dn-label">
            <strong>{dayLabel(date)}</strong>
            <span>{longDate(date)}</span>
          </div>
          <button onClick={() => setDate(addDays(date, 1))} disabled={date >= today} aria-label="Next day">›</button>
        </div>
        <div className="hero-main">
          <div className="hero-label">Spent {date === today ? 'today' : 'this day'}</div>
          <div className="hero-amount">{fmt(total, base)}</div>
          <div className="hero-sub">
            {USERS.map((u) => (
              <span className="pill" key={u}>{u} {fmt(per[u], base)}</span>
            ))}
          </div>
        </div>
      </Hero>

      <main className="content">
        <div className="card">
          <div className="stat-grid">
            <div className="stat"><span>This month</span><b>{fmt(monthTotal, base)}</b></div>
            <div className="stat"><span>7 days</span><b>{fmt(week, base)}</b></div>
            <div className="stat"><span>Entries</span><b>{dayTx.length}</b></div>
          </div>
        </div>

        <div className="card flush">
          {dayTx.length ? dayTx.map((t) => <TxRow key={t.id} t={t} />) : <Empty icon="🌸">Nothing spent {date === today ? 'yet today' : 'on this day'}.<br />Tap + to add an expense or a transfer.</Empty>}
        </div>
      </main>

      <Fab onClick={() => openSheet({ kind: 'tx', type: 'expense', date })} label="Add expense" />
    </>
  );
}
