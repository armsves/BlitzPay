# Deploy BlitzPay on Vercel

## 1. Vercel project settings

Project: **blitzpay** → Settings → General

| Setting | Value |
|---------|--------|
| **Root Directory** | `apps/web` |
| **Install Command** | `cd ../.. && pnpm install` |
| **Build Command** | `cd ../.. && pnpm --filter @blitzpay/web build` |
| **Framework** | Next.js |

## 2. Environment variables (Production)

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `CIRCLE_API_KEY` | Yes | From [app-sandbox.circle.com](https://app-sandbox.circle.com/) → API Keys |
| `CIRCLE_ACCOUNT_ID` | Optional | For live sandbox wire payouts |

**Never commit API keys to `.env.example`** — use Vercel env or `.env.local` only.

## 3. Database schema

After first deploy:

```bash
DATABASE_URL=your_neon_url pnpm db:push
```

## 4. Frontends (merchant, pos, customer)

Deploy each app separately or run locally with:

```bash
NEXT_PUBLIC_API_URL=https://your-blitzpay-api.vercel.app pnpm dev:merchant
```

## 5. Test Circle Sandbox key

```bash
CIRCLE_API_KEY=your_key pnpm exec tsx scripts/test-circle.ts
```
