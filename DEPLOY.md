# Deploy BlitzPay

## Live URLs

| App | URL |
|-----|-----|
| **API** | https://blitzpay-eight.vercel.app |
| **Merchant** | https://blitzpay-merchant.vercel.app |
| **POS** | https://blitzpay-pos.vercel.app |
| **Customer** | https://blitzpay-customer.vercel.app |

## Stack

- **API:** Next.js serverless on Vercel (`apps/web`)
- **Frontends:** Merchant, POS, Customer — separate Vercel projects
- **Database:** Supabase Postgres (via `vercel integration add supabase`)
- **Settlement:** Circle Sandbox

## Vercel projects

| Project | Root Directory | Env vars |
|---------|----------------|----------|
| `blitzpay` | `apps/web` | Supabase integration vars, `CIRCLE_API_KEY` |
| `blitzpay-merchant` | `apps/merchant` | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_POS_URL`, `NEXT_PUBLIC_CUSTOMER_URL` |
| `blitzpay-pos` | `apps/pos` | `NEXT_PUBLIC_API_URL` |
| `blitzpay-customer` | `apps/customer` | `NEXT_PUBLIC_API_URL` |

Install/build commands (in each app's `vercel.json`):

```
Install: cd ../.. && pnpm install
Build:   cd ../.. && pnpm --filter @blitzpay/<app> build
```

## Supabase setup

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
# API (from repo root, linked to blitzpay)
vercel deploy --prod --yes

# Frontends
cd apps/merchant && vercel deploy --prod --yes
cd apps/pos && vercel deploy --prod --yes
cd apps/customer && vercel deploy --prod --yes
```

## Local dev

```bash
pnpm install
pnpm db:push
pnpm dev:web           # :3001
pnpm dev:merchant      # :3002
pnpm dev:pos           # :3003
pnpm dev:customer      # :3004
```

Point frontends at production API:

```bash
NEXT_PUBLIC_API_URL=https://blitzpay-eight.vercel.app pnpm dev:merchant
```
