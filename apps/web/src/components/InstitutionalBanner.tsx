import Link from "next/link";
import { BlitzPayLogo } from "./BlitzPayLogo";

const stats = [
  { value: "<500ms", label: "Settlement" },
  { value: "USDC", label: "Stablecoin" },
  { value: "QR", label: "Checkout" },
  { value: "Monad", label: "Network" },
];

const tags = ["Passkey wallets", "Gas sponsored", "Bank withdrawals"];

function HeroQrPreview() {
  const cells = [
    1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1,
    1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0,
    1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1,
    1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0,
    1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1,
    0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0,
    1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0,
    0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1,
    1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1,
    0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0,
    1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1,
  ];

  return (
    <div className="hero-qr" aria-hidden>
      {cells.map((on, i) => (
        <div key={i} className={on ? "hero-qr-cell on" : "hero-qr-cell"} />
      ))}
    </div>
  );
}

export function InstitutionalBanner() {
  return (
    <section className="hero">
      <div className="hero-bg">
        <div className="hero-orb hero-orb-a" />
        <div className="hero-orb hero-orb-b" />
        <div className="hero-grid" aria-hidden />
      </div>

      <header className="hero-header">
        <BlitzPayLogo size="md" />
        <nav className="hero-nav">
          <Link href="/merchant">Merchant</Link>
          <Link href="/pos">POS</Link>
          <Link href="/customer">Wallet</Link>
        </nav>
      </header>

      <div className="hero-body">
        <div className="hero-content">
          <span className="hero-pill">Instant settlement on Monad</span>
          <h1 className="hero-title">
            Pay with a scan.
            <br />
            <span className="hero-title-accent">Settle in seconds.</span>
          </h1>
          <p className="hero-lede">
            BlitzPay connects merchant POS, customer passkey wallets, and real-time USDC
            settlement — one platform, one domain. Scan the QR, authorize with Face ID, done.
          </p>

          <div className="hero-tags">
            {tags.map((tag) => (
              <span key={tag} className="hero-tag">
                {tag}
              </span>
            ))}
          </div>

          <div className="hero-actions">
            <Link href="/merchant" className="hero-cta primary">
              Open merchant portal
            </Link>
            <Link href="/customer" className="hero-cta secondary">
              Customer wallet
            </Link>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-card">
            <div className="hero-card-top">
              <span className="hero-card-dot" />
              <span>Live invoice</span>
              <span className="hero-card-badge">Ready</span>
            </div>
            <div className="hero-card-main">
              <HeroQrPreview />
              <div className="hero-card-details">
                <div className="hero-card-row">
                  <span>Amount</span>
                  <strong>$12.50 USDC</strong>
                </div>
                <div className="hero-card-row">
                  <span>Method</span>
                  <strong>Passkey</strong>
                </div>
                <div className="hero-card-row">
                  <span>Status</span>
                  <strong className="hero-card-status">Awaiting scan</strong>
                </div>
              </div>
            </div>
            <div className="hero-card-footer">
              <span>Gas sponsored</span>
              <span className="hero-card-footer-dot" />
              <span>Synchronous finality</span>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-stats">
        {stats.map((s) => (
          <div key={s.label} className="hero-stat">
            <span className="hero-stat-value">{s.value}</span>
            <span className="hero-stat-label">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
