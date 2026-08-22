# Deploy BlitzPay

## Live app (single domain)

**https://blitzpay-eight.vercel.app**

| Route | App |
|-------|-----|
| `/` | Home |
| `/merchant` | Merchant register / login, KYB, bank, withdrawals |
| `/pos` | Products, invoices, QR codes |
| `/customer` | Passkey wallet, scan & pay |
| `/api/*` | Serverless API |

## Stack

- **App:** Next.js on Vercel (`apps/web`) — API + all frontends
- **Database:** Supabase Postgres (`vercel integration add supabase`)
- **Settlement:** Circle Sandbox

## Vercel settings

| Setting | Value |
|---------|--------|
| Project | `blitzpay` |
| Root Directory | `apps/web` |
| Install Command | `cd ../.. && pnpm install` |
| Build Command | `cd ../.. && pnpm --filter @blitzpay/web build` |

## Supabase

```bash
vercel integration add supabase -n blitzpay-db
```

Push schema:

```bash
source .env.local
export DATABASE_URL="$POSTGRES_URL_NON_POOLING"
cd packages/db && pnpm db:push
```

## Deploy

```bash
vercel link --project blitzpay   # once, from repo root
vercel deploy --prod --yes
```

## Local dev

```bash
pnpm install
pnpm db:push
pnpm dev:web    # http://localhost:3001 — all routes on one port
```
