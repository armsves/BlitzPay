# BlitzPay

Instant settlement payment platform on **Monad** — one Next.js app on Vercel with Supabase Postgres.

**Repository:** https://github.com/armsves/BlitzPay

## Live app

**https://blitzpay-eight.vercel.app**

| Route | What |
|-------|------|
| `/merchant` | Merchant register / login, KYB, bank, withdrawals |
| `/pos` | Products, invoices, QR codes |
| `/customer` | Passkey wallet, scan & pay |
| `/api/*` | Serverless API |

## Architecture

Everything lives in **`apps/web`** — API route handlers plus `/merchant`, `/pos`, `/customer` pages.

Legacy folders `apps/merchant`, `apps/pos`, `apps/customer` are kept for reference; use `apps/web` for deploy.

See [DEPLOY.md](./DEPLOY.md) for Vercel + Supabase setup.

## Local dev

```bash
cp .env.example .env
pnpm install
pnpm db:push
pnpm dev:web    # :3001 — /merchant, /pos, /customer, /api
```

## Circle Sandbox Settlement

Bank withdrawals use **[Circle Sandbox](https://app-sandbox.circle.com/)**:

- Link bank account → Circle wire destination
- Withdraw USDC → ~12s simulated wire
- Add `CIRCLE_API_KEY` on Vercel for live sandbox API calls

## Database Tables

| Table | Purpose |
|-------|---------|
| `merchant_balances` | Current USDC balance per merchant |
| `balance_ledger` | Every credit (payment) and debit (withdrawal) |
| `withdrawals` | Circle Sandbox bank withdrawals with status tracking |

## Testnet

- **USDC**: `0x534b2f3A21130d7a60830c2Df862319e593943A3`
- **Faucet**: https://faucet.circle.com/ (MONAD-TESTNET)
