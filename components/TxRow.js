'use client';
import { useApp } from './ctx';
import { Who } from './ui';
import { fmt, shortDate } from '@/lib/format';
import { EXPENSE_ICONS, INCOME_ICONS } from '@/lib/constants';

export function TxRow({ t, showDate = false }) {
  const { accountById, openSheet } = useApp();
  const a = accountById[t.account_id];
  const to = t.to_account_id ? accountById[t.to_account_id] : null;
  const cur = a?.currency || 'GBP';
  const icon = t.type === 'transfer' ? '⇄' : (t.type === 'income' ? INCOME_ICONS : EXPENSE_ICONS)[t.category] || '✨';
  const title = t.note || (t.type === 'transfer' ? 'Transfer' : t.category);
  const where = t.type === 'transfer' ? `${a?.name || '?'} → ${to?.name || '?'}` : `${t.category} · ${a?.name || '?'}`;
  const amt =
    t.type === 'income' ? (
      <span className="pos">+{fmt(t.amount, cur)}</span>
    ) : t.type === 'expense' ? (
      <span className="neg">-{fmt(t.amount, cur)}</span>
    ) : (
      <span className="muted">{fmt(t.amount, cur)}</span>
    );
  return (
    <button className="row" onClick={() => openSheet({ kind: 'tx', tx: t })}>
      <div className="ico">{icon}</div>
      <div className="row-main">
        <div className="row-title">{title}</div>
        <div className="row-sub">
          <Who name={t.user_name} />
          <span>{showDate ? `${shortDate(t.date)} · ` : ''}{where}</span>
          {t.edited_by && t.edited_by !== t.user_name ? <span>· edited by {t.edited_by}</span> : null}
        </div>
      </div>
      <div className="row-amt">
        {amt}
        {t.type === 'transfer' && t.to_amount && to ? <small>→ {fmt(t.to_amount, to.currency)}</small> : null}
      </div>
    </button>
  );
}
