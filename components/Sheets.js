'use client';
import { useMemo, useState } from 'react';
import { useApp } from './ctx';
import { Sheet, Seg, cleanAmount, cleanSigned } from './ui';
import { TxRow } from './TxRow';
import { api } from '@/lib/client';
import { fmt, conv, todayStr } from '@/lib/format';
import { ACCOUNT_TYPES, CURRENCIES, EXPENSE_ICONS, INCOME_ICONS, INVEST_TYPES } from '@/lib/constants';

const curOptions = Object.keys(CURRENCIES).map((c) => ({ id: c, label: `${CURRENCIES[c].symbol} ${c}` }));

/* ============================================================ Transaction ============================================================ */
export function TxSheet({ init, onClose }) {
  const { me, activeAccounts, accountById, settings, rates, refresh, toast, openSheet } = useApp();
  const editing = init.tx || null;
  const [type, setType] = useState(editing?.type || init.type || 'expense');

  const accountOptions = useMemo(() => {
    const list = [...activeAccounts];
    for (const id of [editing?.account_id, editing?.to_account_id]) {
      if (id && !list.some((a) => a.id === id) && accountById[id]) list.push(accountById[id]);
    }
    return list;
  }, [activeAccounts, accountById, editing]);

  const remembered = (key) => {
    try {
      const v = Number(localStorage.getItem(key));
      return accountOptions.find((a) => a.id === v)?.id;
    } catch {
      return undefined;
    }
  };
  const initFrom = editing?.account_id || remembered(`mm_from_${init.type === 'income' ? 'income' : 'expense'}`) || accountOptions[0]?.id || '';
  const initTo = editing?.to_account_id || accountOptions.find((a) => a.id !== initFrom)?.id || '';

  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [note, setNote] = useState(editing?.note || '');
  const [category, setCategory] = useState(editing?.category || '');
  const [accountId, setAccountId] = useState(initFrom);
  const [toAccountId, setToAccountId] = useState(initTo);
  const [toAmount, setToAmount] = useState(editing?.to_amount ? String(editing.to_amount) : '');
  const [toTouched, setToTouched] = useState(!!editing?.to_amount);
  const [date, setDate] = useState(editing?.date || init.date || todayStr());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);

  const from = accountById[accountId];
  const to = accountById[toAccountId];
  const cats = type === 'income' ? settings.incomeCats : settings.expenseCats;
  const icons = type === 'income' ? INCOME_ICONS : EXPENSE_ICONS;
  const crossCur = type === 'transfer' && from && to && from.currency !== to.currency;
  const autoTo = crossCur && Number(amount) > 0 ? (conv(Number(amount), from.currency, to.currency, rates)).toFixed(2) : '';
  const toShown = toTouched ? toAmount : autoTo;

  if (!accountOptions.length) {
    return (
      <Sheet onClose={onClose}>
        <h2>Add an account first</h2>
        <p className="hint" style={{ margin: '6px 0 16px' }}>
          Expenses and income are recorded against an account (e.g. Lloyds, HSBC, a credit card or cash).
        </p>
        <button className="btn" onClick={() => openSheet({ kind: 'account' })}>
          Add an account
        </button>
      </Sheet>
    );
  }

  async function save() {
    setError('');
    const n = Number(amount);
    if (!(n > 0)) return setError('Enter an amount greater than zero.');
    if (!accountId) return setError('Choose an account.');
    if (type === 'transfer') {
      if (!toAccountId || toAccountId === accountId) return setError('Choose two different accounts.');
      if (crossCur && !(Number(toShown) > 0)) return setError(`Enter the amount received in ${to.currency}.`);
    } else if (!category) return setError('Pick a category.');
    setBusy(true);
    try {
      const payload = {
        type,
        amount: n,
        date,
        account_id: Number(accountId),
        note,
        category: type === 'transfer' ? null : category,
        to_account_id: type === 'transfer' ? Number(toAccountId) : null,
        to_amount: crossCur ? Number(toShown) : null,
      };
      if (editing) await api('/api/tx', 'PUT', { ...payload, id: editing.id });
      else await api('/api/tx', 'POST', payload);
      try {
        if (type !== 'transfer') localStorage.setItem(`mm_from_${type}`, String(accountId));
      } catch {}
      await refresh(true);
      toast(editing ? 'Updated' : 'Saved');
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  async function del() {
    if (!confirmDel) return setConfirmDel(true);
    setBusy(true);
    try {
      await api(`/api/tx?id=${editing.id}`, 'DELETE');
      await refresh(true);
      toast('Deleted');
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  const noun = type === 'income' ? 'income' : type === 'transfer' ? 'transfer' : 'expense';
  return (
    <Sheet onClose={onClose}>
      <h2>
        {editing ? 'Edit' : 'Add'} {noun}
      </h2>
      <p className="by">{editing ? `Added by ${editing.user_name}${editing.edited_by ? ` · edited by ${editing.edited_by}` : ''}` : `Will be marked as spent by ${me}`.replace('spent', type === 'income' ? 'received' : type === 'transfer' ? 'moved' : 'spent')}</p>

      {!editing && init.type !== 'income' && (
        <Seg
          value={type}
          onChange={setType}
          options={[
            { id: 'expense', label: 'Expense' },
            { id: 'transfer', label: 'Transfer' },
          ]}
        />
      )}

      {error && <div className="err">{error}</div>}

      <div className="field">
        <label>{type === 'transfer' ? `Amount leaving ${from?.name || ''}` : 'Amount'}</label>
        <div className="amount-wrap">
          <span className="sym">{CURRENCIES[from?.currency]?.symbol}</span>
          <input
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(cleanAmount(e.target.value))}
            autoFocus={!editing}
            aria-label="Amount"
          />
        </div>
      </div>

      <div className="field">
        <label>{type === 'income' ? 'Source' : type === 'transfer' ? 'Note (optional)' : 'What for'}</label>
        <input
          className="input"
          value={note}
          maxLength={200}
          onChange={(e) => setNote(e.target.value)}
          placeholder={type === 'income' ? 'e.g. NHS pay, Locum shift at…' : type === 'transfer' ? 'e.g. Credit card payment' : 'e.g. Tesco weekly shop'}
        />
      </div>

      {type !== 'transfer' && (
        <div className="field">
          <label>Category</label>
          <div className="chips">
            {cats.map((c) => (
              <button type="button" key={c} className={`chip${category === c ? ' on' : ''}`} onClick={() => setCategory(c)}>
                {icons[c] || '✨'} {c}
              </button>
            ))}
            {category && !cats.includes(category) && (
              <button type="button" className="chip on">
                {category}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="field">
        <label>{type === 'transfer' ? 'From account' : type === 'income' ? 'Into account' : 'Paid from account'}</label>
        <select className="input" value={accountId} onChange={(e) => setAccountId(Number(e.target.value))}>
          {accountOptions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.currency}){a.archived ? ' – archived' : ''}
            </option>
          ))}
        </select>
      </div>

      {type === 'transfer' && (
        <>
          <div className="field">
            <label>To account</label>
            <select className="input" value={toAccountId} onChange={(e) => setToAccountId(Number(e.target.value))}>
              {accountOptions
                .filter((a) => a.id !== Number(accountId))
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency}){a.archived ? ' – archived' : ''}
                  </option>
                ))}
            </select>
          </div>
          {crossCur && (
            <div className="field">
              <label>Amount received in {to.currency}</label>
              <div className="amount-wrap">
                <span className="sym">{CURRENCIES[to.currency].symbol}</span>
                <input
                  inputMode="decimal"
                  value={toShown}
                  onChange={(e) => {
                    setToTouched(true);
                    setToAmount(cleanAmount(e.target.value));
                  }}
                  placeholder="0.00"
                />
              </div>
              <span className="hint">Pre-filled from your saved exchange rate — change it to what you actually received.</span>
            </div>
          )}
        </>
      )}

      <div className="field">
        <label>Date</label>
        <input className="input" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </div>

      <div className="btn-row">
        <button className="btn" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : editing ? 'Save changes' : `Save ${noun}`}
        </button>
        {editing && (
          <button className="btn danger" onClick={del} disabled={busy}>
            {confirmDel ? 'Tap again to delete for good' : 'Delete'}
          </button>
        )}
      </div>
    </Sheet>
  );
}

/* ============================================================ Account ============================================================ */
export function AccountSheet({ init, onClose }) {
  const { refresh, toast, me } = useApp();
  const acct = init.account || null;
  const [name, setName] = useState(acct?.name || '');
  const [type, setType] = useState(acct?.type || 'bank');
  const [currency, setCurrency] = useState(acct?.currency || 'GBP');
  // For credit cards the field is "amount owed" (positive) and stored as a negative balance.
  const startBal = acct ? (acct.type === 'credit' ? -acct.balance : acct.balance) : 0;
  const [balance, setBalance] = useState(acct ? String(Math.round(startBal * 100) / 100) : '');
  const [limit, setLimit] = useState(acct?.credit_limit != null ? String(acct.credit_limit) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const isCredit = type === 'credit';

  async function save() {
    setError('');
    if (!name.trim()) return setError('Give the account a name.');
    const b = balance === '' || balance === '-' ? 0 : Number(balance);
    if (!Number.isFinite(b)) return setError('Balance is not a valid number.');
    const signed = isCredit ? -b : b;
    setBusy(true);
    try {
      const payload = { name, type, currency, credit_limit: isCredit ? limit : null };
      if (acct) await api('/api/account', 'PUT', { ...payload, id: acct.id, set_balance: signed });
      else await api('/api/account', 'POST', { ...payload, opening_balance: signed });
      await refresh(true);
      toast(acct ? 'Account updated' : 'Account added');
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  async function archive() {
    setBusy(true);
    try {
      await api('/api/account', 'PUT', { id: acct.id, archived: !acct.archived });
      await refresh(true);
      toast(acct.archived ? 'Account restored' : 'Account archived');
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  async function del() {
    if (!confirmDel) return setConfirmDel(true);
    setBusy(true);
    try {
      await api(`/api/account?id=${acct.id}`, 'DELETE');
      await refresh(true);
      toast('Account deleted');
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
      setConfirmDel(false);
    }
  }

  return (
    <Sheet onClose={onClose}>
      <h2>{acct ? 'Edit account' : 'Add account'}</h2>
      <p className="by">Shared with everyone who uses this app{!acct ? ` · added by ${me}` : ''}</p>
      {error && <div className="err">{error}</div>}

      <div className="field">
        <label>Name</label>
        <input className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lloyds, HSBC, Credit Card 1" autoFocus={!acct} />
      </div>
      <div className="field">
        <label>Type</label>
        <div className="chips">
          {ACCOUNT_TYPES.map((t) => (
            <button type="button" key={t.id} className={`chip${type === t.id ? ' on' : ''}`} onClick={() => setType(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Currency</label>
        <Seg value={currency} onChange={setCurrency} options={curOptions} />
        {acct && <span className="hint">Currency is locked once an account has transactions.</span>}
      </div>
      <div className="field">
        <label>{isCredit ? 'Amount you currently owe' : acct ? 'Current balance' : 'Balance today'}</label>
        <div className="amount-wrap">
          <span className="sym">{CURRENCIES[currency].symbol}</span>
          <input inputMode="decimal" placeholder="0.00" value={balance} onChange={(e) => setBalance(cleanSigned(e.target.value))} />
        </div>
        <span className="hint">
          {acct ? 'Changing this re-aligns the account to match your bank — past transactions stay as they are.' : isCredit ? 'Enter the outstanding amount as a positive number (use a minus if the card is in credit).' : 'What the account holds right now. Use a minus if overdrawn.'}
        </span>
      </div>
      {isCredit && (
        <div className="field">
          <label>Credit limit (optional)</label>
          <div className="amount-wrap">
            <span className="sym">{CURRENCIES[currency].symbol}</span>
            <input inputMode="decimal" placeholder="0.00" value={limit} onChange={(e) => setLimit(cleanAmount(e.target.value))} />
          </div>
        </div>
      )}

      <div className="btn-row">
        <button className="btn" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : acct ? 'Save changes' : 'Add account'}
        </button>
        {acct && (
          <>
            <button className="btn ghost" onClick={archive} disabled={busy}>
              {acct.archived ? 'Restore account' : 'Archive (hide) account'}
            </button>
            <button className="btn danger" onClick={del} disabled={busy}>
              {confirmDel ? 'Tap again to delete for good' : 'Delete account'}
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
}

export function AccountDetailSheet({ init, onClose }) {
  const { accountById, data, openSheet } = useApp();
  const a = accountById[init.id];
  if (!a) return null;
  const txs = data.transactions.filter((t) => t.account_id === a.id || t.to_account_id === a.id).slice(0, 40);
  const isCredit = a.type === 'credit';
  const owed = Math.max(0, -a.balance);
  return (
    <Sheet onClose={onClose}>
      <h2>{a.name}</h2>
      <p className="by">
        {ACCOUNT_TYPES.find((t) => t.id === a.type)?.label} · {a.currency}
        {a.archived ? ' · archived' : ''}
      </p>
      <div className="card" style={{ background: 'var(--magenta-softer)', boxShadow: 'none', marginBottom: 12 }}>
        <div className="lbl">{isCredit ? 'Currently owed' : 'Balance'}</div>
        <div style={{ fontSize: 30, fontWeight: 780 }} className={!isCredit && a.balance < 0 ? 'red' : ''}>
          {isCredit ? fmt(owed, a.currency) : fmt(a.balance, a.currency)}
        </div>
        {isCredit && a.credit_limit ? <div className="hint">Available credit {fmt(a.credit_limit - owed, a.currency)} of {fmt(a.credit_limit, a.currency)}</div> : null}
      </div>
      <div className="btn-row" style={{ marginBottom: 10, marginTop: 0 }}>
        <button className="btn ghost" onClick={() => openSheet({ kind: 'account', account: a })}>
          Edit account / set balance
        </button>
      </div>
      <div className="section-title" style={{ margin: '14px 4px 6px' }}>Recent activity</div>
      {txs.length ? (
        <div className="card flush">{txs.map((t) => <TxRow key={t.id} t={t} showDate />)}</div>
      ) : (
        <p className="hint" style={{ padding: 8 }}>No transactions on this account yet.</p>
      )}
    </Sheet>
  );
}

/* ============================================================ Investment ============================================================ */
export function InvestSheet({ init, onClose }) {
  const { refresh, toast, me, base } = useApp();
  const inv = init.inv || null;
  const [name, setName] = useState(inv?.name || '');
  const [type, setType] = useState(inv?.type || 'savings');
  const [currency, setCurrency] = useState(inv?.currency || base);
  const [invested, setInvested] = useState(inv ? String(inv.invested) : '');
  const [current, setCurrent] = useState(inv ? String(inv.current_value) : '');
  const [rate, setRate] = useState(inv?.rate != null ? String(inv.rate) : '');
  const [maturity, setMaturity] = useState(inv?.maturity_date || '');
  const [note, setNote] = useState(inv?.note || '');
  const [status, setStatus] = useState(inv?.status || 'active');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const lent = type === 'lent';

  async function save() {
    setError('');
    if (!name.trim()) return setError('Give it a name.');
    setBusy(true);
    try {
      const payload = {
        name,
        type,
        currency,
        invested: invested || 0,
        current_value: current === '' ? invested || 0 : current,
        rate,
        maturity_date: maturity || null,
        note,
        status,
      };
      if (inv) await api('/api/investment', 'PUT', { ...payload, id: inv.id });
      else await api('/api/investment', 'POST', payload);
      await refresh(true);
      toast('Saved');
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  async function del() {
    if (!confirmDel) return setConfirmDel(true);
    setBusy(true);
    try {
      await api(`/api/investment?id=${inv.id}`, 'DELETE');
      await refresh(true);
      toast('Deleted');
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <Sheet onClose={onClose}>
      <h2>{inv ? 'Edit investment' : 'Add investment'}</h2>
      <p className="by">{inv ? `Added by ${inv.user_name || '—'}` : `Adding as ${me}`}</p>
      {error && <div className="err">{error}</div>}
      <div className="field">
        <label>Type</label>
        <div className="chips">
          {INVEST_TYPES.map((t) => (
            <button type="button" key={t.id} className={`chip${type === t.id ? ' on' : ''}`} onClick={() => setType(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>{lent ? 'Lent to' : 'Name'}</label>
        <input className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder={lent ? 'e.g. Rahul (personal loan)' : type === 'lic' ? 'e.g. LIC Jeevan Anand' : type === 'fd' ? 'e.g. SBI 1-year FD' : 'e.g. Marcus savings'} autoFocus={!inv} />
      </div>
      <div className="field">
        <label>Currency</label>
        <Seg value={currency} onChange={setCurrency} options={curOptions} />
      </div>
      <div className="two">
        <div className="field">
          <label>{lent ? 'Amount lent' : 'Put in'}</label>
          <div className="amount-wrap" style={{ padding: '2px 12px' }}>
            <span className="sym" style={{ fontSize: 20 }}>{CURRENCIES[currency].symbol}</span>
            <input style={{ fontSize: 20 }} inputMode="decimal" placeholder="0.00" value={invested} onChange={(e) => setInvested(cleanAmount(e.target.value))} />
          </div>
        </div>
        <div className="field">
          <label>{lent ? 'Still owed to you' : 'Worth now'}</label>
          <div className="amount-wrap" style={{ padding: '2px 12px' }}>
            <span className="sym" style={{ fontSize: 20 }}>{CURRENCIES[currency].symbol}</span>
            <input style={{ fontSize: 20 }} inputMode="decimal" placeholder="0.00" value={current} onChange={(e) => setCurrent(cleanAmount(e.target.value))} />
          </div>
        </div>
      </div>
      <div className="two">
        <div className="field">
          <label>Interest / return % (optional)</label>
          <input className="input" inputMode="decimal" value={rate} onChange={(e) => setRate(cleanAmount(e.target.value))} placeholder="e.g. 7.1" />
        </div>
        <div className="field">
          <label>{lent ? 'Due date' : 'Maturity date'}</label>
          <input className="input" type="date" value={maturity} onChange={(e) => setMaturity(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Note (optional)</label>
        <input className="input" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Policy number, terms, reminders…" />
      </div>
      {inv && (
        <div className="field">
          <label>Status</label>
          <Seg value={status} onChange={setStatus} options={[{ id: 'active', label: 'Active' }, { id: 'closed', label: lent ? 'Repaid / closed' : 'Matured / closed' }]} />
        </div>
      )}
      <div className="btn-row">
        <button className="btn" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : inv ? 'Save changes' : 'Add investment'}
        </button>
        {inv && (
          <button className="btn danger" onClick={del} disabled={busy}>
            {confirmDel ? 'Tap again to delete for good' : 'Delete'}
          </button>
        )}
      </div>
    </Sheet>
  );
}

/* ============================================================ Budget ============================================================ */
export function BudgetSheet({ init, onClose }) {
  const { refresh, toast, base } = useApp();
  const [limit, setLimit] = useState(init.current ? String(init.current) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(v) {
    setBusy(true);
    try {
      await api('/api/budget', 'PUT', { category: init.category, monthly_limit: v });
      await refresh(true);
      toast(v ? 'Budget saved' : 'Budget removed');
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <Sheet onClose={onClose}>
      <h2>{EXPENSE_ICONS[init.category] || '✨'} {init.category} budget</h2>
      <p className="by">Monthly limit in {base}</p>
      {error && <div className="err">{error}</div>}
      <div className="field">
        <div className="amount-wrap">
          <span className="sym">{CURRENCIES[base].symbol}</span>
          <input inputMode="decimal" placeholder="0.00" value={limit} onChange={(e) => setLimit(cleanAmount(e.target.value))} autoFocus />
        </div>
      </div>
      <div className="btn-row">
        <button className="btn" disabled={busy} onClick={() => save(limit || 0)}>
          Save budget
        </button>
        {init.current ? (
          <button className="btn danger" disabled={busy} onClick={() => save(0)}>
            Remove budget
          </button>
        ) : null}
      </div>
    </Sheet>
  );
}
