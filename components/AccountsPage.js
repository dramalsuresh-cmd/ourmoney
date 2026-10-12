'use client';
import { useState } from 'react';
import { useApp } from './ctx';
import { Hero, Fab, Empty, sum } from './ui';
import { fmt } from '@/lib/format';
import { ACCOUNT_TYPES } from '@/lib/constants';

function AccountRow({ a }) {
  const { openSheet } = useApp();
  const t = ACCOUNT_TYPES.find((x) => x.id === a.type);
  const credit = a.type === 'credit';
  const owed = Math.max(0, -a.balance);
  return (
    <button className="row" onClick={() => openSheet({ kind: 'accountDetail', id: a.id })}>
      <div className="ico">{t?.icon}</div>
      <div className="row-main">
        <div className="row-title">{a.name}</div>
        <div className="row-sub">
          {t?.label} · {a.currency}
          {credit && a.credit_limit ? ` · ${fmt(Math.max(0, a.credit_limit - owed), a.currency)} available` : ''}
        </div>
      </div>
      <div className="row-amt">
        <span className={credit ? (owed > 0 ? 'red' : 'pos') : a.balance < 0 ? 'red' : ''}>{credit ? fmt(owed, a.currency) : fmt(a.balance, a.currency)}</span>
        {credit && <small>{owed > 0 ? 'owed' : 'in credit'}</small>}
      </div>
    </button>
  );
}

export default function AccountsPage() {
  const { data, activeAccounts, toBase, base, openSheet, netWorth } = useApp();
  const [showArchived, setShowArchived] = useState(false);
  const archived = data.accounts.filter((a) => a.archived);

  const assets = sum(activeAccounts.filter((a) => a.type !== 'credit').map((a) => toBase(a.balance, a.currency)));
  const debt = sum(activeAccounts.filter((a) => a.type === 'credit').map((a) => toBase(a.balance, a.currency)));
  const groups = [
    { title: 'Bank accounts', items: activeAccounts.filter((a) => a.type === 'bank') },
    { title: 'Credit cards', items: activeAccounts.filter((a) => a.type === 'credit') },
    { title: 'Cash & wallets', items: activeAccounts.filter((a) => a.type === 'cash' || a.type === 'wallet') },
  ].filter((g) => g.items.length);

  return (
    <>
      <Hero title="Accounts">
        <div className="hero-main">
          <div className="hero-label">Net worth (accounts + investments)</div>
          <div className="hero-amount">{fmt(netWorth, base)}</div>
          <div className="hero-sub">
            <span className="pill">Cash & bank {fmt(assets, base)}</span>
            <span className="pill">Card debt {fmt(Math.abs(Math.min(0, debt)), base)}</span>
          </div>
        </div>
      </Hero>

      <main className="content">
        {groups.length ? (
          groups.map((g) => (
            <div key={g.title} style={{ display: 'grid', gap: 8 }}>
              <div className="section-title"><span>{g.title}</span><span className="sum">{fmt(sum(g.items.map((a) => toBase(a.balance, a.currency))), base)}</span></div>
              <div className="card flush">{g.items.map((a) => <AccountRow key={a.id} a={a} />)}</div>
            </div>
          ))
        ) : (
          <div className="card"><Empty icon="🏦">No accounts yet.<br />Tap + to add Lloyds, HSBC, a credit card or cash.</Empty></div>
        )}

        {archived.length > 0 && (
          <div style={{ display: 'grid', gap: 8 }}>
            <button className="link" style={{ textAlign: 'left', padding: '0 4px' }} onClick={() => setShowArchived(!showArchived)}>
              {showArchived ? 'Hide' : 'Show'} archived accounts ({archived.length})
            </button>
            {showArchived && <div className="card flush">{archived.map((a) => <AccountRow key={a.id} a={a} />)}</div>}
          </div>
        )}
      </main>

      <Fab onClick={() => openSheet({ kind: 'account' })} label="Add account" />
    </>
  );
}
