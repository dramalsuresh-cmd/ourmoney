'use client';
import { useState } from 'react';
import { api } from '@/lib/client';
import { Seg } from './ui';

export default function AuthScreen({ status, onDone }) {
  const activatedNames = status.users.filter((u) => u.activated).map((u) => u.name);
  const pendingNames = status.users.filter((u) => !u.activated).map((u) => u.name);
  const [mode, setMode] = useState(activatedNames.length ? 'login' : 'setup');
  const lastUser = (() => {
    try {
      return localStorage.getItem('mm_last_user');
    } catch {
      return null;
    }
  })();
  const [name, setName] = useState(
    mode === 'login' ? (activatedNames.includes(lastUser) ? lastUser : activatedNames[0]) : pendingNames[0]
  );
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function switchMode(m) {
    setMode(m);
    setError('');
    setPassword('');
    setConfirm('');
    setName(m === 'login' ? activatedNames[0] : pendingNames[0]);
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (mode === 'setup') {
      if (password.length < 8) return setError('Choose a password with at least 8 characters.');
      if (password !== confirm) return setError('The two passwords do not match.');
    }
    setBusy(true);
    try {
      await api(mode === 'setup' ? '/api/auth/setup' : '/api/auth/login', 'POST', { name, password, code });
      try {
        localStorage.setItem('mm_last_user', name);
      } catch {}
      await onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const names = mode === 'login' ? activatedNames : pendingNames;

  return (
    <div className="auth">
      <div className="logo">£</div>
      <div>
        <h1>Our Money</h1>
        <p className="muted" style={{ marginTop: 4 }}>
          {mode === 'setup' ? 'First-time setup — activate your account. Only Amal and Vani can ever have accounts.' : 'A private place for Amal & Vani.'}
        </p>
      </div>
      <form className="card" onSubmit={submit}>
        {error && <div className="err">{error}</div>}
        {names.length > 1 ? (
          <div className="field">
            <label>{mode === 'setup' ? 'Activate account for' : 'Who is signing in?'}</label>
            <Seg value={name} onChange={setName} options={names.map((n) => ({ id: n, label: n }))} />
          </div>
        ) : (
          <p style={{ fontWeight: 700, marginBottom: 12 }}>{mode === 'setup' ? `Activating ${name}'s account` : `Welcome back, ${name}`}</p>
        )}
        <div className="field">
          <label>{mode === 'setup' ? 'Choose a password (8+ characters)' : 'Password'}</label>
          <input className="input" type="password" autoComplete={mode === 'setup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </div>
        {mode === 'setup' && (
          <>
            <div className="field">
              <label>Confirm password</label>
              <input className="input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <div className="field">
              <label>Setup code</label>
              <input className="input" type="password" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} />
              <span className="hint">The SETUP_CODE you added in Vercel’s environment variables.</span>
            </div>
          </>
        )}
        <button className="btn" disabled={busy || !password}>{busy ? 'Please wait…' : mode === 'setup' ? 'Activate account' : 'Sign in'}</button>
        {mode === 'login' && status.setupOpen && (
          <p style={{ marginTop: 14, textAlign: 'center' }}>
            <button type="button" className="link" onClick={() => switchMode('setup')}>First time? Activate {pendingNames.join(' / ')}’s account</button>
          </p>
        )}
        {mode === 'setup' && activatedNames.length > 0 && (
          <p style={{ marginTop: 14, textAlign: 'center' }}>
            <button type="button" className="link" onClick={() => switchMode('login')}>Already activated? Sign in</button>
          </p>
        )}
      </form>
    </div>
  );
}
