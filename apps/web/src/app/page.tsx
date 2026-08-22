import Link from "next/link";
import { colors } from "@blitzpay/ui";
import { InstitutionalBanner } from "@/components/InstitutionalBanner";

const features = [
  {
    title: "Instant settlement",
    desc: "Payments confirm in milliseconds on Monad via synchronous transaction submission — no waiting for block confirmations.",
  },
  {
    title: "Passkey wallets",
    desc: "Customers pay with Face ID / Touch ID. No seed phrases, no browser extensions.",
  },
  {
    title: "Merchant to bank",
    desc: "Accept USDC at the register, track balance in real time, withdraw to your bank via Circle Sandbox.",
  },
];

export default function HomePage() {
  return (
    <>
      <InstitutionalBanner />

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px 64px" }}>
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>What is BlitzPay?</h2>
          <p style={{ color: colors.textMuted, fontSize: 15, lineHeight: 1.7, marginBottom: 14 }}>
            BlitzPay is a demo payment platform for the Monad hackathon. Merchants register, run a POS,
            and generate QR invoices. Customers fund a passkey wallet with testnet USDC and pay by scanning —
            funds hit the merchant balance immediately.
          </p>
          <p style={{ color: colors.textMuted, fontSize: 15, lineHeight: 1.7 }}>
            When ready to cash out, merchants complete KYB, link a bank account, and withdraw via Circle Sandbox.
            One app, one domain — merchant portal, point of sale, and customer wallet.
          </p>
        </section>

        <section style={{ display: "grid", gap: 16, marginBottom: 48 }}>
          {features.map((f) => (
            <div
              key={f.title}
              style={{
                padding: "20px 22px",
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{f.title}</h3>
              <p style={{ color: colors.textMuted, fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, textAlign: "center" }}>Platform access</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 420, margin: "0 auto" }}>
            <Link
              href="/merchant"
              style={{
                display: "block",
                padding: "16px 24px",
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              Merchant Portal →
            </Link>
            <Link
              href="/pos"
              style={{
                display: "block",
                padding: "16px 24px",
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              POS →
            </Link>
            <Link
              href="/customer"
              style={{
                display: "block",
                padding: "16px 24px",
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              Customer Wallet →
            </Link>
          </div>
          <p style={{ marginTop: 28, fontSize: 13, color: colors.textMuted, textAlign: "center" }}>
            <Link href="/api/health">API health</Link>
          </p>
        </section>
      </main>
    </>
  );
}
