import Link from "next/link";

const GOLD_DIM = "#8A734F";

function QrMark() {
  const cells = [
    1, 1, 1, 1, 1, 0, 1, 0, 1,
    1, 0, 0, 0, 1, 0, 0, 1, 0,
    1, 0, 1, 0, 1, 0, 1, 0, 1,
    1, 0, 0, 0, 1, 0, 0, 0, 1,
    1, 1, 1, 1, 1, 0, 1, 1, 0,
    0, 0, 0, 0, 0, 0, 0, 1, 0,
    1, 0, 1, 1, 0, 1, 0, 0, 1,
    0, 1, 0, 0, 1, 0, 1, 0, 0,
    1, 0, 1, 0, 1, 0, 0, 1, 1,
  ];

  return (
    <div className="inst-banner-qr" aria-hidden>
      {cells.map((on, i) => (
        <div key={i} className={on ? "inst-banner-qr-cell on" : "inst-banner-qr-cell"} />
      ))}
    </div>
  );
}

const metrics = [
  { label: "Settlement", value: "<500ms" },
  { label: "Asset", value: "USDC" },
  { label: "Rail", value: "QR-Initiated" },
  { label: "Network", value: "Monad" },
];

export function InstitutionalBanner() {
  return (
    <section className="inst-banner">
      <div className="inst-banner-topbar">
        <span className="inst-banner-topbar-label">BlitzPay Settlement Systems</span>
        <span className="inst-banner-topbar-sep" />
        <span className="inst-banner-topbar-label">QR Payment Infrastructure</span>
        <span className="inst-banner-topbar-sep" />
        <span className="inst-banner-topbar-label">Institutional Demo Environment</span>
      </div>

      <div className="inst-banner-body">
        <div className="inst-banner-content">
          <p className="inst-banner-eyebrow">Enterprise QR Settlement Platform</p>
          <h1 className="inst-banner-title">
            Institutional-grade
            <br />
            <span className="inst-banner-title-accent">QR payment rails</span>
          </h1>
          <p className="inst-banner-lede">
            BlitzPay connects merchant point-of-sale, customer passkey wallets, and
            real-time USDC settlement into a single regulated-style payment corridor.
            Scan. Authorize. Settle. Reconcile.
          </p>

          <div className="inst-banner-badges">
            <span className="inst-banner-badge">Real-time ledger</span>
            <span className="inst-banner-badge">Passkey authentication</span>
            <span className="inst-banner-badge">Bank withdrawal rail</span>
          </div>

          <div className="inst-banner-actions">
            <Link href="/merchant" className="inst-banner-cta primary">
              Merchant onboarding
            </Link>
            <Link href="/customer" className="inst-banner-cta secondary">
              Customer wallet
            </Link>
          </div>
        </div>

        <div className="inst-banner-visual">
          <div className="inst-banner-panel">
            <div className="inst-banner-panel-header">
              <span className="inst-banner-panel-dot" />
              <span>Payment initiation — QR</span>
            </div>
            <div className="inst-banner-panel-body">
              <QrMark />
              <div className="inst-banner-panel-meta">
                <div className="inst-banner-panel-row">
                  <span>Status</span>
                  <strong style={{ color: "#4ADE80" }}>Ready to settle</strong>
                </div>
                <div className="inst-banner-panel-row">
                  <span>Currency</span>
                  <strong>USDC</strong>
                </div>
                <div className="inst-banner-panel-row">
                  <span>Confirmation</span>
                  <strong>Synchronous</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="inst-banner-metrics">
        {metrics.map((m) => (
          <div key={m.label} className="inst-banner-metric">
            <span className="inst-banner-metric-value">{m.value}</span>
            <span className="inst-banner-metric-label">{m.label}</span>
          </div>
        ))}
      </div>

      <div className="inst-banner-footer">
        <span style={{ color: GOLD_DIM }}>BlitzPay</span>
        <span style={{ color: "#334155" }}>|</span>
        <span>QR-initiated stablecoin settlement for merchants and financial operators</span>
      </div>
    </section>
  );
}
