import Link from "next/link";
import { colors } from "@blitzpay/ui";

export default function HomePage() {
  return (
    <main style={{ maxWidth: 520, margin: "80px auto", padding: "0 20px", textAlign: "center" }}>
      <h1 style={{ fontSize: 40, fontWeight: 700, marginBottom: 8 }}>
        <span style={{ color: colors.primary }}>Blitz</span>Pay
      </h1>
      <p style={{ color: colors.textMuted, marginBottom: 40, fontSize: 16 }}>
        Instant USDC settlement on Monad
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Link href="/merchant" style={{ display: "block", padding: "16px 24px", background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, fontWeight: 600 }}>
          Merchant Portal →
        </Link>
        <Link href="/pos" style={{ display: "block", padding: "16px 24px", background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, fontWeight: 600 }}>
          POS →
        </Link>
        <Link href="/customer" style={{ display: "block", padding: "16px 24px", background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, fontWeight: 600 }}>
          Customer Wallet →
        </Link>
      </div>

      <p style={{ marginTop: 32, fontSize: 13, color: colors.textMuted }}>
        <Link href="/api/health">API health</Link>
      </p>
    </main>
  );
}
