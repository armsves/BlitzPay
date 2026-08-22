# BlitzPay

Instant settlement payment platform on **Monad** — serverless API on Vercel with Supabase Postgres.

**Repository:** https://github.com/armsves/BlitzPay

## Live apps

| App | URL |
|-----|-----|
| **Merchant portal** | https://blitzpay-merchant.vercel.app |
| **POS** | https://blitzpay-pos.vercel.app |
| **Customer wallet** | https://blitzpay-customer.vercel.app |
| **API** | https://blitzpay-eight.vercel.app |

## Architecture

- **`apps/web`** — Next.js serverless API (Vercel deploy target)
- **`apps/merchant`** — KYB, bank details, balance & withdrawals
- **`apps/pos`** — Products, invoices, QR codes
- **`apps/customer`** — Mera passkeys, QR pay, Circle faucet

See [DEPLOY.md](./DEPLOY.md) for Vercel project setup and env vars.

## Local Dev

```bash
cp .env.example .env   # Supabase / API URLs
pnpm install
pnpm db:push           # create tables (needs DATABASE_URL)
pnpm dev:web           # API on :3001
pnpm dev:merchant      # :3002
pnpm dev:pos           # :3003
pnpm dev:customer      # :3004
```

## Circle Sandbox Settlement

Bank withdrawals use **[Circle Sandbox](https://app-sandbox.circle.com/)** — the "Withdraw to bank" flow:

- Link bank account → creates a Circle wire destination
- Withdraw USDC balance → simulates Circle wire payout (~12s delay)
- Balance debited immediately, ledger updated, status polls to `completed`
- Add `CIRCLE_API_KEY` from sandbox dashboard for live API calls

## Database Tables

| Table | Purpose |
|-------|---------|
| `merchant_balances` | Current USDC balance per merchant |
| `balance_ledger` | Every credit (payment) and debit (withdrawal) |
| `withdrawals` | Circle Sandbox bank withdrawals with status tracking |

## Testnet

- **USDC**: `0x534b2f3A21130d7a60830c2Df862319e593943A3`
- **Faucet**: https://faucet.circle.com/ (MONAD-TESTNET)
