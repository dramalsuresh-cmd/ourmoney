import { neon } from '@neondatabase/serverless';

// One shared runner per server instance. In production this talks to Neon Postgres.
// For local testing only (LOCAL_PGLITE=1) it uses an embedded Postgres instead.
async function getRunner() {
  if (globalThis.__mmRunner) return globalThis.__mmRunner;
  let runner;
  if (process.env.LOCAL_PGLITE === '1') {
    const mod = '@electric-sql/pglite';
    const { PGlite } = await import(/* webpackIgnore: true */ mod);
    const db = new PGlite(process.env.PGLITE_DIR || undefined);
    runner = async (text, params = []) => (await db.query(text, params)).rows;
  } else {
    if (!process.env.DATABASE_URL) {
      const e = new Error('DATABASE_URL is not set');
      e.publicMessage = 'Database is not configured yet (DATABASE_URL missing).';
      throw e;
    }
    const sql = neon(process.env.DATABASE_URL);
    runner = async (text, params = []) => sql.query(text, params);
  }
  globalThis.__mmRunner = runner;
  return runner;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL CHECK (name IN ('Amal','Vani')),
    password_hash TEXT NOT NULL,
    session_version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    currency TEXT NOT NULL,
    opening_balance NUMERIC(16,2) NOT NULL DEFAULT 0,
    credit_limit NUMERIC(16,2),
    archived BOOLEAN NOT NULL DEFAULT false,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('expense','income','transfer')),
    amount NUMERIC(16,2) NOT NULL CHECK (amount > 0),
    category TEXT,
    note TEXT,
    account_id INT NOT NULL REFERENCES accounts(id),
    to_account_id INT REFERENCES accounts(id),
    to_amount NUMERIC(16,2),
    date TEXT NOT NULL,
    user_name TEXT NOT NULL,
    edited_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS tx_date_idx ON transactions(date)`,
  `CREATE TABLE IF NOT EXISTS investments (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    currency TEXT NOT NULL,
    invested NUMERIC(16,2) NOT NULL DEFAULT 0,
    current_value NUMERIC(16,2) NOT NULL DEFAULT 0,
    rate NUMERIC(7,3),
    maturity_date TEXT,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    user_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS budgets (
    category TEXT PRIMARY KEY,
    monthly_limit NUMERIC(16,2) NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    ip TEXT,
    name TEXT,
    ok BOOLEAN NOT NULL,
    at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
];

async function ensureSchema(run) {
  if (!globalThis.__mmSchema) {
    globalThis.__mmSchema = (async () => {
      for (const stmt of SCHEMA) await run(stmt);
    })().catch((e) => {
      globalThis.__mmSchema = null;
      throw e;
    });
  }
  return globalThis.__mmSchema;
}

export async function q(text, params = []) {
  const run = await getRunner();
  await ensureSchema(run);
  return run(text, params);
}

export async function one(text, params = []) {
  const rows = await q(text, params);
  return rows[0] || null;
}
