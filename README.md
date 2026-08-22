# BlitzPay

Instant settlement payment platform on **Monad** — serverless API on Vercel with Postgres balance tracking.

**Repository:** https://github.com/armsves/BlitzPay

## Architecture

- **`apps/web`** — Next.js serverless API (Vercel deploy target)
- **`apps/merchant`** — KYB, bank details, balance & withdrawals
- **`apps/pos`** — Products, invoices, QR codes
- **`apps/customer`** — Mera passkeys, QR pay, Circle faucet

## Deploy on Vercel

1. Create a [Neon](https://neon.tech) Postgres database (free tier)
2. Import repo on [Vercel](https://vercel.com) → set root directory to **`apps/web`**
3. Add env var: `DATABASE_URL=postgresql://...`
4. Deploy — then run schema push once:

```bash
DATABASE_URL=... pnpm db:push
```

5. Deploy frontends separately (merchant, pos, customer) with:
   `NEXT_PUBLIC_API_URL=https://your-api.vercel.app`

## Local Dev

```bash
cp .env.example .env   # add DATABASE_URL from Neon
pnpm install
pnpm db:push           # create tables
pnpm dev:web           # API on :3001
pnpm dev:merchant      # :3002
pnpm dev:pos           # :3003
pnpm dev:customer      # :3004
```

## Portal (Mocked)

Real Portal access requires onboarding. Withdrawals simulate a **12 second** Portal payout delay:
- Balance debited immediately
- Status `processing` until delay elapses
- Auto-completes to `completed` on next poll
- Full audit trail in `balance_ledger` table

## Database Tables

| Table | Purpose |
|-------|---------|
| `merchant_balances` | Current USDC balance per merchant |
| `balance_ledger` | Every credit (payment) and debit (withdrawal) |
| `withdrawals` | Portal-mocked bank payouts with status tracking |

## Testnet

- **USDC**: `0x534b2f3A21130d7a60830c2Df862319e593943A3`
- **Faucet**: https://faucet.circle.com/ (MONAD-TESTNET)
