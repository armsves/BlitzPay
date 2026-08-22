# BlitzPay

Instant settlement payment platform built on **Monad** using `eth_sendRawTransactionSync` (EIP-7966) for sub-second payment confirmation.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Customer App   │────▶│   BlitzPay API  │◀────│  Merchant POS   │
│  (Mera + QR)    │     │  (Instant Pay)  │     │  (Invoices)     │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │              ┌────────▼────────┐              │
         │              │  Monad Testnet  │              │
         └─────────────▶│  USDC + Sync TX │◀─────────────┘
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │ Portal Payouts  │
                        │ (Bank Settlement)│
                        └─────────────────┘
```

## Apps

| App | Port | Description |
|-----|------|-------------|
| `@blitzpay/api` | 3001 | Backend API — payments, merchants, invoices |
| `@blitzpay/merchant` | 3002 | Merchant portal — KYB, bank details, settlement |
| `@blitzpay/pos` | 3003 | Point of Sale — products, inventory, invoices |
| `@blitzpay/customer` | 3004 | Customer wallet — Mera passkeys, QR pay, USDC |

## Quick Start

```bash
pnpm install
pnpm dev
```

## Key Integrations

- **Monad** — `eth_sendRawTransactionSync` for instant payment confirmation
- **Mera** — Passkey-derived EVM wallets (Face ID / Touch ID)
- **Portal** — KYB and stablecoin-to-bank settlement via Noah/Due payouts
- **Circle** — USDC on Monad testnet ([faucet](https://faucet.circle.com/))

## Testnet

- **Chain**: Monad Testnet
- **USDC**: `0x534b2f3A21130d7a60830c2Df862319e593943A3`
- **RPC**: `https://testnet-rpc.monad.xyz`
