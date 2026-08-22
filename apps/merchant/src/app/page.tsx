"use client";

import { useState, useEffect } from "react";
import { Button, Card, Input, Badge, colors } from "@blitzpay/ui";
import type { Merchant, BankDetails, Settlement } from "@blitzpay/shared";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type View = "login" | "register" | "dashboard" | "kyb" | "bank" | "settle";

export default function MerchantPortal() {
  const [view, setView] = useState<View>("login");
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [banks, setBanks] = useState<BankDetails[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("retail");
  const [taxId, setTaxId] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [settleAmount, setSettleAmount] = useState("");

  // Bank form
  const [accountHolder, setAccountHolder] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [country, setCountry] = useState("US");

  useEffect(() => {
    const saved = localStorage.getItem("blitzpay_merchant");
    if (saved) {
      setMerchant(JSON.parse(saved));
      setView("dashboard");
    }
  }, []);

  useEffect(() => {
    if (merchant && (view === "bank" || view === "settle" || view === "dashboard")) {
      fetch(`${API}/api/merchants/${merchant.id}/bank`).then(r => r.json()).then(d => setBanks(d.data || []));
      fetch(`${API}/api/merchants/${merchant.id}/settlements`).then(r => r.json()).then(d => setSettlements(d.data || []));
    }
  }, [merchant, view]);

  async function handleRegister() {
    setLoading(true);
    const res = await fetch(`${API}/api/merchants/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, businessName, businessType, taxId, walletAddress }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      setMessage("Registration successful! Please log in.");
      setView("login");
    } else {
      setMessage(data.error);
    }
  }

  async function handleLogin() {
    setLoading(true);
    const res = await fetch(`${API}/api/merchants/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      setMerchant(data.data);
      localStorage.setItem("blitzpay_merchant", JSON.stringify(data.data));
      setView("dashboard");
    } else {
      setMessage(data.error);
    }
  }

  async function handleKybSubmit() {
    if (!merchant) return;
    setLoading(true);
    const res = await fetch(`${API}/api/merchants/${merchant.id}/kyb`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessName: merchant.businessName, taxId: merchant.taxId }),
    });
    const data = await res.json();
    setLoading(false);
    setMessage(data.data?.message || "KYB submitted");
    const updated = { ...merchant, kybStatus: "submitted" as const, portalCustomerId: data.data?.portalCustomerId };
    setMerchant(updated);
    localStorage.setItem("blitzpay_merchant", JSON.stringify(updated));
  }

  async function handleKybApprove() {
    if (!merchant) return;
    await fetch(`${API}/api/merchants/${merchant.id}/kyb/approve`, { method: "POST" });
    const updated = { ...merchant, kybStatus: "approved" as const };
    setMerchant(updated);
    localStorage.setItem("blitzpay_merchant", JSON.stringify(updated));
    setMessage("KYB approved (demo mode)");
  }

  async function handleBankSubmit() {
    if (!merchant) return;
    setLoading(true);
    const res = await fetch(`${API}/api/merchants/${merchant.id}/bank`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountHolderName: accountHolder, bankName, accountNumber, routingNumber, country }),
    });
    const data = await res.json();
    setLoading(false);
    setMessage(data.data?.message || "Bank details saved");
    setView("dashboard");
  }

  async function handleSettle() {
    if (!merchant) return;
    setLoading(true);
    const res = await fetch(`${API}/api/merchants/${merchant.id}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountUsdc: settleAmount }),
    });
    const data = await res.json();
    setLoading(false);
    setMessage(data.data?.message || data.error);
    if (data.success) setSettleAmount("");
  }

  function logout() {
    localStorage.removeItem("blitzpay_merchant");
    setMerchant(null);
    setView("login");
  }

  const kybBadge = (status: string) => {
    const map: Record<string, "default" | "warning" | "success" | "error"> = {
      pending: "default", submitted: "warning", approved: "success", rejected: "error",
    };
    return <Badge variant={map[status] || "default"}>{status.toUpperCase()}</Badge>;
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px" }}>
      <header style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>
            <span style={{ color: colors.primary }}>Blitz</span>Pay
          </h1>
          <p style={{ color: colors.textMuted, fontSize: 14 }}>Merchant Portal</p>
        </div>
        {merchant && <Button variant="ghost" size="sm" onClick={logout}>Logout</Button>}
      </header>

      {message && (
        <div style={{ background: colors.primary + "20", border: `1px solid ${colors.primary}`, borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 14 }}>
          {message}
          <button onClick={() => setMessage("")} style={{ float: "right", background: "none", border: "none", color: colors.textMuted, cursor: "pointer" }}>×</button>
        </div>
      )}

      {view === "login" && (
        <Card>
          <h2 style={{ marginBottom: 20 }}>Sign In</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Input label="Email" value={email} onChange={setEmail} type="email" required />
            <Input label="Password" value={password} onChange={setPassword} type="password" required />
            <Button onClick={handleLogin} disabled={loading}>{loading ? "Signing in..." : "Sign In"}</Button>
            <p style={{ textAlign: "center", fontSize: 13, color: colors.textMuted }}>
              No account? <a href="#" onClick={(e) => { e.preventDefault(); setView("register"); }}>Register</a>
            </p>
          </div>
        </Card>
      )}

      {view === "register" && (
        <Card>
          <h2 style={{ marginBottom: 20 }}>Register Business</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Input label="Email" value={email} onChange={setEmail} type="email" required />
            <Input label="Password" value={password} onChange={setPassword} type="password" required />
            <Input label="Business Name" value={businessName} onChange={setBusinessName} required />
            <Input label="Business Type" value={businessType} onChange={setBusinessType} placeholder="retail, restaurant, services..." />
            <Input label="Tax ID / EIN" value={taxId} onChange={setTaxId} />
            <Input label="Wallet Address (receives USDC)" value={walletAddress} onChange={setWalletAddress} placeholder="0x..." required />
            <Button onClick={handleRegister} disabled={loading}>{loading ? "Registering..." : "Register"}</Button>
            <p style={{ textAlign: "center", fontSize: 13, color: colors.textMuted }}>
              Already registered? <a href="#" onClick={(e) => { e.preventDefault(); setView("login"); }}>Sign In</a>
            </p>
          </div>
        </Card>
      )}

      {view === "dashboard" && merchant && (
        <>
          <Card style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: 20 }}>{merchant.businessName}</h2>
                <p style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>{merchant.email}</p>
                <p style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, fontFamily: "monospace" }}>{merchant.walletAddress}</p>
              </div>
              <div>{kybBadge(merchant.kybStatus)}</div>
            </div>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
            <Card style={{ cursor: "pointer", textAlign: "center" }} >
              <div onClick={() => setView("kyb")}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
                <div style={{ fontWeight: 600 }}>KYB Verification</div>
                <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>Portal identity check</div>
              </div>
            </Card>
            <Card style={{ cursor: "pointer", textAlign: "center" }}>
              <div onClick={() => setView("bank")}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🏦</div>
                <div style={{ fontWeight: 600 }}>Bank Details</div>
                <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>{banks.length} account{banks.length !== 1 ? "s" : ""}</div>
              </div>
            </Card>
            <Card style={{ cursor: "pointer", textAlign: "center" }}>
              <div onClick={() => setView("settle")}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>💸</div>
                <div style={{ fontWeight: 600 }}>Settle to Bank</div>
                <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>Via Portal payouts</div>
              </div>
            </Card>
          </div>

          <Card>
            <h3 style={{ marginBottom: 12 }}>Quick Links</h3>
            <div style={{ display: "flex", gap: 12 }}>
              <a href="http://localhost:3003" target="_blank"><Button variant="secondary" size="sm">Open POS →</Button></a>
              <a href="http://localhost:3004" target="_blank"><Button variant="secondary" size="sm">Customer App →</Button></a>
            </div>
          </Card>
        </>
      )}

      {view === "kyb" && merchant && (
        <Card>
          <Button variant="ghost" size="sm" onClick={() => setView("dashboard")} style={{ marginBottom: 16 }}>← Back</Button>
          <h2 style={{ marginBottom: 16 }}>KYB Verification</h2>
          <p style={{ color: colors.textMuted, fontSize: 14, marginBottom: 20 }}>
            Complete Know Your Business verification through Portal to enable bank settlements.
          </p>
          <div style={{ background: colors.bg, borderRadius: 8, padding: 16, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span>Status</span>{kybBadge(merchant.kybStatus)}
            </div>
            {merchant.portalCustomerId && (
              <div style={{ fontSize: 12, color: colors.textMuted, fontFamily: "monospace" }}>
                Portal Customer: {merchant.portalCustomerId}
              </div>
            )}
          </div>
          {merchant.kybStatus === "pending" && (
            <Button onClick={handleKybSubmit} disabled={loading}>Submit KYB to Portal</Button>
          )}
          {merchant.kybStatus === "submitted" && (
            <Button onClick={handleKybApprove} disabled={loading}>Approve KYB (Demo)</Button>
          )}
          {merchant.kybStatus === "approved" && (
            <p style={{ color: colors.success }}>✓ KYB approved — bank settlements enabled</p>
          )}
        </Card>
      )}

      {view === "bank" && merchant && (
        <Card>
          <Button variant="ghost" size="sm" onClick={() => setView("dashboard")} style={{ marginBottom: 16 }}>← Back</Button>
          <h2 style={{ marginBottom: 16 }}>Bank Details</h2>
          {banks.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              {banks.map(b => (
                <div key={b.id} style={{ background: colors.bg, borderRadius: 8, padding: 16, marginBottom: 8 }}>
                  <div style={{ fontWeight: 600 }}>{b.bankName} — {b.accountHolderName}</div>
                  <div style={{ fontSize: 13, color: colors.textMuted }}>****{b.accountNumber.slice(-4)} · {b.country}</div>
                </div>
              ))}
            </div>
          )}
          <h3 style={{ marginBottom: 12, fontSize: 16 }}>Add Bank Account</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Input label="Account Holder Name" value={accountHolder} onChange={setAccountHolder} required />
            <Input label="Bank Name" value={bankName} onChange={setBankName} required />
            <Input label="Account Number" value={accountNumber} onChange={setAccountNumber} required />
            <Input label="Routing Number" value={routingNumber} onChange={setRoutingNumber} />
            <Input label="Country" value={country} onChange={setCountry} />
            <Button onClick={handleBankSubmit} disabled={loading}>Save Bank Details</Button>
          </div>
        </Card>
      )}

      {view === "settle" && merchant && (
        <Card>
          <Button variant="ghost" size="sm" onClick={() => setView("dashboard")} style={{ marginBottom: 16 }}>← Back</Button>
          <h2 style={{ marginBottom: 16 }}>Settle to Bank</h2>
          <p style={{ color: colors.textMuted, fontSize: 14, marginBottom: 20 }}>
            Convert USDC to fiat and send to your bank via Portal payout rails.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
            <Input label="Amount (USDC)" value={settleAmount} onChange={setSettleAmount} placeholder="100.00" />
            <Button onClick={handleSettle} disabled={loading || !settleAmount}>Initiate Settlement</Button>
          </div>
          {settlements.length > 0 && (
            <>
              <h3 style={{ marginBottom: 12 }}>Settlement History</h3>
              {settlements.map(s => (
                <div key={s.id} style={{ background: colors.bg, borderRadius: 8, padding: 16, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{s.amountUsdc} USDC → {s.fiatAmount} {s.fiatCurrency}</div>
                    <div style={{ fontSize: 12, color: colors.textMuted }}>{new Date(s.createdAt).toLocaleString()}</div>
                  </div>
                  <Badge variant={s.status === "completed" ? "success" : "warning"}>{s.status}</Badge>
                </div>
              ))}
            </>
          )}
        </Card>
      )}
    </div>
  );
}
