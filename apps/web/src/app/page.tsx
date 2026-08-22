import Link from "next/link";
import { InstitutionalBanner } from "@/components/InstitutionalBanner";

const features = [
  {
    title: "Instant settlement",
    desc: "Payments confirm in milliseconds on Monad via synchronous transaction submission — no waiting for block confirmations.",
    icon: "⚡",
  },
  {
    title: "Passkey wallets",
    desc: "Customers pay with Face ID / Touch ID. No seed phrases, no browser extensions.",
    icon: "🔐",
  },
  {
    title: "Merchant to bank",
    desc: "Accept USDC at the register, track balance in real time, withdraw to your bank via Circle Sandbox.",
    icon: "🏦",
  },
];

const platforms = [
  { href: "/merchant", label: "Merchant Portal", desc: "Register, KYB, balance & withdrawals" },
  { href: "/pos", label: "Point of Sale", desc: "Catalog, cart, QR invoices" },
  { href: "/customer", label: "Customer Wallet", desc: "Passkey, fund, scan & pay" },
];

export default function HomePage() {
  return (
    <>
      <InstitutionalBanner />

      <main className="landing-main">
        <section className="landing-section">
          <h2 className="landing-heading">What is BlitzPay?</h2>
          <p className="landing-text">
            BlitzPay is a demo payment platform for the Monad hackathon. Merchants register, run a POS,
            and generate QR invoices. Customers fund a passkey wallet with testnet USDC and pay by scanning —
            funds hit the merchant balance immediately.
          </p>
          <p className="landing-text">
            When ready to cash out, merchants complete KYB, link a bank account, and withdraw via Circle Sandbox.
            One app, one domain — merchant portal, point of sale, and customer wallet.
          </p>
        </section>

        <section className="landing-features">
          {features.map((f) => (
            <article key={f.title} className="landing-feature">
              <span className="landing-feature-icon" aria-hidden>
                {f.icon}
              </span>
              <h3 className="landing-feature-title">{f.title}</h3>
              <p className="landing-feature-desc">{f.desc}</p>
            </article>
          ))}
        </section>

        <section className="landing-section landing-platform">
          <h2 className="landing-heading centered">Platform access</h2>
          <div className="landing-platform-grid">
            {platforms.map((p) => (
              <Link key={p.href} href={p.href} className="landing-platform-link">
                <span className="landing-platform-label">{p.label}</span>
                <span className="landing-platform-desc">{p.desc}</span>
                <span className="landing-platform-arrow">→</span>
              </Link>
            ))}
          </div>
          <p className="landing-footer-link">
            <Link href="/api/health">API health check</Link>
          </p>
        </section>
      </main>
    </>
  );
}
