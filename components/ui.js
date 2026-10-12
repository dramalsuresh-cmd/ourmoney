'use client';
import { useEffect } from 'react';
import { useApp } from './ctx';

export function Sheet({ onClose, children }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="grab" />
        {children}
      </div>
    </div>
  );
}

export const Fab = ({ onClick, label = 'Add' }) => (
  <button className="fab" onClick={onClick} aria-label={label}>
    +
  </button>
);

export const Who = ({ name }) => <span className={`who ${name}`}>{name}</span>;

export const Empty = ({ icon = '🌸', children }) => (
  <div className="empty">
    <div className="big">{icon}</div>
    <div>{children}</div>
  </div>
);

export function Seg({ options, value, onChange }) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button type="button" key={o.id} className={value === o.id ? 'on' : ''} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Hero({ title, onBack, children }) {
  const { me } = useApp();
  return (
    <header className="hero">
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {onBack && (
            <button className="back" onClick={onBack}>
              ‹ Back
            </button>
          )}
          <h1>{title}</h1>
        </div>
        <div className="avatar" title={`Signed in as ${me}`}>
          {me[0]}
        </div>
      </div>
      {children}
    </header>
  );
}

export function Bar({ pct, over, green }) {
  return (
    <div className={`bar${over ? ' over' : ''}${green ? ' green' : ''}`}>
      <i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

export const sum = (arr) => arr.reduce((a, b) => a + b, 0);

export const cleanAmount = (v) => {
  let s = v.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const i = s.indexOf('.');
  if (i !== -1) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '').slice(0, 2);
  return s;
};
export const cleanSigned = (v) => {
  const neg = v.trim().startsWith('-');
  return (neg ? '-' : '') + cleanAmount(v.replace('-', ''));
};
