# Our Money 💗

A private household money manager for **Amal and Vani** — expenses, income, accounts and investments in £, ₹ and €.
Magenta theme, installs on your phone like an app, and every entry is marked *Amal* or *Vani* and shows up on both phones.

## What's inside

| Tab | What it does |
|---|---|
| **Today** | Expenses for today (use ‹ › for other days). Floating **+** adds an expense or a **transfer** between accounts. |
| **Income** | This month's income, by category and by person. **+** adds salary, locum, bonus, gift… |
| **Accounts** | Balance of every account (Lloyds, HSBC, credit cards, cash…), net worth, credit-card owed / available. |
| **Invest** | Savings, fixed deposits, LIC, lent money, funds, gold… with gain/loss and maturity / due dates. |
| **More** | Reports (6-month trend, by category, by person), Budgets, All transactions (search + CSV export), Settings. |

Extras: multi-currency totals with editable (or live) exchange rates, per-category monthly budgets, custom categories,
cross-currency transfers (e.g. £100 → ₹11,000), balance re-alignment to match your bank, archive accounts, dark mode,
auto-refresh so you both always see the latest.

## Security model

- Only two accounts can ever exist: **Amal** and **Vani**. There is no sign-up page.
- First install: each of you activates your own account with your own password, using a private **SETUP_CODE**.
  Once both are activated, setup is permanently closed.
- Passwords are bcrypt-hashed. Login cookies are httpOnly + secure. 5 wrong passwords locks that person for 15 minutes.
- Changing your password (or "Sign out on all my devices") signs out every other device.
- Search engines are told not to index the site.

## Deploy on Vercel (about 10 minutes)

1. **Put the code on GitHub** — create a *private* repository and upload this folder (or `git init && git push`).
2. **Import to Vercel** — vercel.com → *Add New… → Project* → pick the repo. Framework is detected as Next.js. Don't deploy yet… or deploy and redeploy after step 3, either works.
3. **Add the database** — in the Vercel project: *Storage → Create Database → Neon (Postgres)*. Choose the **London / eu-west-2** region
   and connect it to the project. This automatically adds the `DATABASE_URL` environment variable. Tables are created automatically on first use.
4. **Add two environment variables** (*Settings → Environment Variables*):
   - `AUTH_SECRET` — a long random string. Generate one with `openssl rand -base64 32` (or mash the keyboard for 40+ characters).
   - `SETUP_CODE` — any private code, 8+ characters. You'll type it once each when activating accounts.
5. **Redeploy** (*Deployments → ⋯ → Redeploy*) so the variables take effect.
6. **Open your Vercel URL → "First time? Activate…"** → Amal activates with a password + the setup code; Vani does the same on her phone.
   After that you can delete `SETUP_CODE` from Vercel if you like.
7. **Install on your phones** — iPhone: Safari → Share → *Add to Home Screen*. Android: Chrome → ⋮ → *Install app*.

Get started inside the app: **Accounts → +** to add each bank account / card with today's balance, then record spending with **Today → +**.

## Run locally (optional)

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL, AUTH_SECRET, SETUP_CODE
npm run dev
```

You can point `DATABASE_URL` at a free Neon database for local testing.

## Handy to know

- **Credit cards:** add the card with the amount you currently owe. Paying the bill = a *Transfer* from your bank to the card.
  Transfers are not counted as spending, so nothing is double counted.
- **Exchange rates:** *More → Settings*. Type your own, or tap *Fetch today's live rates*.
- **Backups:** *More → All transactions → Export to CSV* any time. Neon also keeps point-in-time history.
- **Money amounts** are entered in the account's own currency (a ₹ account takes ₹ amounts).
