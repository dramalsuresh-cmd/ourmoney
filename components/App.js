'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppCtx } from './ctx';
import AuthScreen from './AuthScreen';
import ExpensesPage from './ExpensesPage';
import IncomePage from './IncomePage';
import AccountsPage from './AccountsPage';
import InvestmentsPage from './InvestmentsPage';
import { MoreMenu, ReportsPage, BudgetsPage, HistoryPage, SettingsPage } from './MorePages';
import { TxSheet, AccountSheet, AccountDetailSheet, InvestSheet, BudgetSheet } from './Sheets';
import { api } from '@/lib/client';
import { conv } from '@/lib/format';

const TABS = [
  { id: 'expenses', label: 'Today', icon: '🧾' },
  { id: 'income', label: 'Income', icon: '💰' },
  { id: 'accounts', label: 'Accounts', icon: '🏦' },
  { id: 'invest', label: 'Invest', icon: '📈' },
  { id: 'more', label: 'More', icon: '⚙️' },
];

export default function App() {
  const [status, setStatus] = useState(null);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('expenses');
  const [sub, setSub] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const sheetKey = useRef(0);
  const toastTimer = useRef(null);

  const boot = useCallback(async () => {
    try {
      const s = await api('/api/auth/status');
      setStatus(s);
      if (s.me) setData(await api('/api/data'));
      else setData(null);
    } catch (e) {
      setStatus({ error: e.message });
    }
  }, []);

  useEffect(() => {
    boot();
  }, [boot]);

  const toast = useCallback((message, kind = 'ok') => {
    setToastMsg({ message, kind });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2600);
  }, []);

  const refresh = useCallback(
    async (silent = false) => {
      try {
        setData(await api('/api/data'));
      } catch (e) {
        if (e.status === 401) boot();
        else if (!silent) toast(e.message, 'bad');
      }
    },
    [boot, toast]
  );

  // Keep both phones in sync: refresh every 20s and whenever the app comes back to the foreground.
  const signedIn = !!data;
  useEffect(() => {
    if (!signedIn) return;
    const tick = () => document.visibilityState === 'visible' && refresh(true);
    const id = setInterval(tick, 20000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [signedIn, refresh]);

  const signOut = useCallback(
    async (all) => {
      try {
        await api('/api/auth/logout', 'POST', { all: !!all });
      } catch {}
      setSheet(null);
      setSub(null);
      setTab('expenses');
      await boot();
    },
    [boot]
  );

  const openSheet = useCallback((s) => {
    sheetKey.current += 1;
    setSheet({ ...s, _k: sheetKey.current });
  }, []);
  const closeSheet = useCallback(() => setSheet(null), []);

  const ctx = useMemo(() => {
    if (!data) return null;
    const { settings } = data;
    const base = settings.baseCurrency;
    const rates = settings.rates;
    const accountById = Object.fromEntries(data.accounts.map((a) => [a.id, a]));
    const activeAccounts = data.accounts.filter((a) => !a.archived);
    const toBase = (amount, cur) => conv(amount, cur, base, rates);
    const txBase = (t) => toBase(t.amount, accountById[t.account_id]?.currency || base);
    const accountsTotal = activeAccounts.reduce((s, a) => s + toBase(a.balance, a.currency), 0);
    const investTotal = data.investments.filter((v) => v.status === 'active').reduce((s, v) => s + toBase(v.current_value, v.currency), 0);
    return {
      me: data.me,
      data,
      settings,
      base,
      rates,
      accountById,
      activeAccounts,
      toBase,
      txBase,
      netWorth: accountsTotal + investTotal,
      refresh,
      toast,
      openSheet,
      closeSheet,
      signOut,
    };
  }, [data, refresh, toast, openSheet, closeSheet, signOut]);

  if (!status) return <div className="loading"><div className="spin" /></div>;
  if (status.error)
    return (
      <div className="auth">
        <div className="logo">£</div>
        <h1>Almost there</h1>
        <div className="card">
          <div className="err">{status.error}</div>
          <p className="hint" style={{ marginBottom: 14 }}>If this is a fresh deployment, check that DATABASE_URL, AUTH_SECRET and SETUP_CODE are set in Vercel, then redeploy.</p>
          <button className="btn" onClick={() => { setStatus(null); boot(); }}>Try again</button>
        </div>
      </div>
    );
  if (!status.me || !ctx) return <AuthScreen status={status} onDone={boot} />;

  const changeTab = (id) => {
    setTab(id);
    setSub(null);
    window.scrollTo({ top: 0 });
  };

  let page;
  if (tab === 'expenses') page = <ExpensesPage />;
  else if (tab === 'income') page = <IncomePage />;
  else if (tab === 'accounts') page = <AccountsPage />;
  else if (tab === 'invest') page = <InvestmentsPage />;
  else if (sub === 'reports') page = <ReportsPage onBack={() => setSub(null)} />;
  else if (sub === 'budgets') page = <BudgetsPage onBack={() => setSub(null)} />;
  else if (sub === 'history') page = <HistoryPage onBack={() => setSub(null)} />;
  else if (sub === 'settings') page = <SettingsPage onBack={() => setSub(null)} />;
  else page = <MoreMenu go={(s) => { setSub(s); window.scrollTo({ top: 0 }); }} />;

  return (
    <AppCtx.Provider value={ctx}>
      <div className="app">{page}</div>

      <nav className="tabbar" aria-label="Main">
        <div className="tabbar-inner">
          {TABS.map((t) => (
            <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => changeTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
              <span className="t-ico">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {sheet?.kind === 'tx' && <TxSheet key={sheet._k} init={sheet} onClose={closeSheet} />}
      {sheet?.kind === 'account' && <AccountSheet key={sheet._k} init={sheet} onClose={closeSheet} />}
      {sheet?.kind === 'accountDetail' && <AccountDetailSheet key={sheet._k} init={sheet} onClose={closeSheet} />}
      {sheet?.kind === 'invest' && <InvestSheet key={sheet._k} init={sheet} onClose={closeSheet} />}
      {sheet?.kind === 'budget' && <BudgetSheet key={sheet._k} init={sheet} onClose={closeSheet} />}

      {toastMsg && <div className={`toast${toastMsg.kind === 'bad' ? ' bad' : ''}`} role="status">{toastMsg.message}</div>}
    </AppCtx.Provider>
  );
}
