'use client';
import { useState } from 'react';
import { useApp } from './ctx';
import { Hero, Fab, Empty, sum } from './ui';
import { fmt, shortDate, daysUntil } from '@/lib/format';
import { INVEST_TYPES } from '@/lib/constants';

function InvRow({ v }) {
  const { openSheet } = useApp();
  const t = INVEST_TYPES.find((x) => x.id === v.type);
  const gain = v.current_value - v.invested;
  const lent = v.type === 'lent';
  const d = v.maturity_date ? daysUntil(v.maturity_date) : null;
  const dueText = d == null ? null : d < 0 ? `${lent ? 'Overdue' : 'Matured'} ${shortDate(v.maturity_date)}` : d === 0 ? `${lent ? 'Due' : 'Matures'} today` : `${lent ? 'Due' : 'Matures'} ${shortDate(v.maturity_date)} (${d}d)`;
  return (
    <button className="row" onClick={() => openSheet({ kind: 'invest', inv: v })}>
      <div className="ico">{t?.icon}</div>
      <div className="row-main">
        <div className="row-title">{v.name}</div>
        <div className="row-sub">
          <span>{t?.label}</span>
          {v.rate != null ? <span>· {v.rate}%</span> : null}
          {dueText ? <span className={d != null && d < 0 && v.status === 'active' ? 'red' : ''}>· {dueText}</span> : null}
        </div>
      </div>
      <div className="row-amt">
        {fmt(v.current_value, v.currency)}
        {v.invested > 0 && Math.abs(gain) >= 0.005 ? <small className={gain >= 0 ? 'pos' : 'red'}>{fmt(gain, v.currency, { sign: true })}</small> : null}
      </div>
    </button>
  );
}

export default function InvestmentsPage() {
  const { data, toBase, base, openSheet } = useApp();
  const [showClosed, setShowClosed] = useState(false);
  const active = data.investments.filter((v) => v.status === 'active');
  const closed = data.investments.filter((v) => v.status !== 'active');
  const value = sum(active.map((v) => toBase(v.current_value, v.currency)));
  const put = sum(active.map((v) => toBase(v.invested, v.currency)));
  const gain = value - put;

  const groups = INVEST_TYPES.map((t) => ({ t, items: active.filter((v) => v.type === t.id) })).filter((g) => g.items.length);

  return (
    <>
      <Hero title="Investments">
        <div className="hero-main">
          <div className="hero-label">Total value</div>
          <div className="hero-amount">{fmt(value, base)}</div>
          <div className="hero-sub">
            <span className="pill">Put in {fmt(put, base)}</span>
            <span className="pill">{gain >= 0 ? 'Gain' : 'Loss'} {fmt(Math.abs(gain), base)}{put > 0 ? ` (${((gain / put) * 100).toFixed(1)}%)` : ''}</span>
          </div>
        </div>
      </Hero>

      <main className="content">
        {groups.length ? (
          groups.map(({ t, items }) => (
            <div key={t.id} style={{ display: 'grid', gap: 8 }}>
              <div className="section-title"><span>{t.icon} {t.label}</span><span className="sum">{fmt(sum(items.map((v) => toBase(v.current_value, v.currency))), base)}</span></div>
              <div className="card flush">{items.map((v) => <InvRow key={v.id} v={v} />)}</div>
            </div>
          ))
        ) : (
          <div className="card"><Empty icon="📈">Nothing tracked yet.<br />Tap + to add savings, fixed deposits, LIC, money you’ve lent…</Empty></div>
        )}

        {closed.length > 0 && (
          <div style={{ display: 'grid', gap: 8 }}>
            <button className="link" style={{ textAlign: 'left', padding: '0 4px' }} onClick={() => setShowClosed(!showClosed)}>
              {showClosed ? 'Hide' : 'Show'} closed / repaid ({closed.length})
            </button>
            {showClosed && <div className="card flush">{closed.map((v) => <InvRow key={v.id} v={v} />)}</div>}
          </div>
        )}
      </main>

      <Fab onClick={() => openSheet({ kind: 'invest' })} label="Add investment" />
    </>
  );
}
