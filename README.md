# BlitzPay

Instant settlement payment platform built on **Monad** using `eth_sendRawTransactionSync` (EIP-7966) for sub-second payment confirmation.

**Repository:** https://github.com/armsves/BlitzPay

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Customer App   │────▶│   BlitzPay API  │◀────│  Merchant POS   │
│  (Mera + QR)    │     │  (Instant Pay)  │     │  (Invoices)     │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │              ┌────────▼────────┐              │
         └─────────────▶│  Monad Testnet  │◀─────────────┘
                        │  USDC + Sync TX │
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │ Portal Payouts  │
                        │ (Bank Settlement)│
                        └─────────────────┘
```

## Apps

| App | Port | URL | Description |
|-----|------|-----|-------------|
| `@blitzpay/api` | 3001 | http://localhost:3001 | Backend API — payments, merchants, invoices |
| `@blitzpay/merchant` | 3002 | http://localhost:3002 | Merchant portal — KYB, bank details, settlement |
| `@blitzpay/pos` | 3003 | http://localhost:3003 | Point of Sale — products, inventory, invoices |
| `@blitzpay/customer` | 3004 | http://localhost:3004 | Customer wallet — Mera passkeys, QR pay, USDC |

## Quick Start

```bash
# Install dependencies
pnpm install

# Build shared packages
pnpm --filter @blitzpay/shared build
pnpm --filter @blitzpay/blockchain build

# Start all services
pnpm dev
```

Or start individually:

```bash
pnpm dev:api        # API on :3001
pnpm dev:merchant   # Merchant portal on :3002
pnpm dev:pos        # POS on :3003
pnpm dev:customer   # Customer wallet on :3004
```

## Demo Flow

1. **Register a merchant** at http://localhost:3002
   - Enter business details and a wallet address (receives USDC payments)
2. **Complete KYB** in the merchant portal (demo mode has instant approve)
3. **Add bank details** for Portal settlement
4. **Open POS** at http://localhost:3003
   - Add products with prices and images
   - Create an invoice → QR code appears
5. **Customer pays** at http://localhost:3004
   - Create a passkey wallet (Face ID / Touch ID)
   - Fund with USDC from [Circle Faucet](https://faucet.circle.com/) (select MONAD-TESTNET)
   - Scan the invoice QR code → Pay instantly
6. **Settle to bank** from the merchant portal

## Key Integrations

| Service | Purpose | Docs |
|---------|---------|------|
| **Monad** | `eth_sendRawTransactionSync` for instant confirmation | [EIP-7966](https://eips.ethereum.org/EIPS/eip-7966) |
| **Mera** | Passkey-derived EVM wallets | [mera.category.xyz](https://mera.category.xyz/) |
| **Portal** | KYB and stablecoin-to-bank settlement | [docs.portalhq.io](https://docs.portalhq.io/) |
| **Circle** | USDC on Monad testnet | [faucet.circle.com](https://faucet.circle.com/) |

## Testnet Details

| | |
|---|---|
| **Chain** | Monad Testnet (ID: 10143) |
| **RPC** | `https://testnet-rpc.monad.xyz` |
| **USDC** | `0x534b2f3A21130d7a60830c2Df862319e593943A3` |
| **Explorer** | https://testnet.monadexplorer.com |

## Project Structure

```
BlitzPay/
├── apps/
│   ├── api/          # Hono REST API + SQLite
│   ├── merchant/     # Merchant portal (Next.js)
│   ├── pos/          # Point of Sale (Next.js)
│   └── customer/     # Customer wallet (Next.js + Mera)
├── packages/
│   ├── shared/       # Types, constants
│   ├── blockchain/   # Monad sync tx, USDC helpers
│   └── ui/           # Shared React components
└── turbo.json        # Monorepo task runner
```

## Environment

Copy `.env.example` to `.env` and fill in production keys:

```bash
cp .env.example .env
```

## Commit History

Each push adds a distinct layer of the platform:

1. **Initial scaffold** — monorepo structure, Turbo, README
2. **Shared packages** — types, blockchain utils, UI components
3. **API backend** — merchants, products, invoices, payments, settlements
4. **Merchant portal** — KYB, bank details, Portal settlement
5. **POS system** — product catalog, cart, invoice QR generation
6. **Customer wallet** — Mera passkeys, QR scanning, Circle faucet
7. **Final polish** — lockfile, env template, Portal integration stubs
