"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Card, Input, Badge, colors } from "@blitzpay/ui";
import type { Merchant, BankDetails, Settlement, MerchantBalanceInfo, BalanceLedgerEntry } from "@blitzpay/shared";
import { CIRCLE_SANDBOX_APP_URL } from "@blitzpay/shared";

type View = "login" | "register" | "dashboard" | "kyb" | "bank" | "settle";

export default function MerchantPortal() {
  const [view, setView] = useState<View>("login");
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [banks, setBanks] = useState<BankDetails[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [balance, setBalance] = useState<MerchantBalanceInfo | null>(null);
  const [ledger, setLedger] = useState<BalanceLedgerEntry[]>([]);
  const [withdrawing, setWithdrawing] = useState(false);
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

  const refreshFinancials = useCallback(async () => {
    if (!merchant) return;
    const [balRes, ledgerRes, settleRes] = await Promise.all([
      fetch(`/api/merchants/${merchant.id}/balance`),
      fetch(`/api/merchants/${merchant.id}/ledger`),
      fetch(`/api/merchants/${merchant.id}/settlements`),
    ]);
    const bal = await balRes.json();
    const led = await ledgerRes.json();
    const set = await settleRes.json();
    if (bal.success) setBalance(bal.data);
    if (led.success) setLedger(led.data || []);
    if (set.success) {
      setSettlements(set.data || []);
      setWithdrawing((set.data || []).some((s: Settlement) => s.status === "processing"));
    }
  }, [merchant]);

  useEffect(() => {
    if (merchant && (view === "bank" || view === "settle" || view === "dashboard")) {
      fetch(`/api/merchants/${merchant.id}/bank`).then(r => r.json()).then(d => setBanks(d.data || []));
      refreshFinancials();
    }
  }, [merchant, view, refreshFinancials]);

  useEffect(() => {
    if (!withdrawing || !merchant) return;
    const interval = setInterval(refreshFinancials, 2000);
    return () => clearInterval(interval);
  }, [withdrawing, merchant, refreshFinancials]);

  async function handleRegister() {
    setLoading(true);
    const res = await fetch(`/api/merchants/register`, {
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
    const res = await fetch(`/api/merchants/login`, {
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
    const res = await fetch(`/api/merchants/${merchant.id}/kyb`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessName: merchant.businessName, taxId: merchant.taxId }),
    });
    const data = await res.json();
    setLoading(false);
    setMessage(data.data?.message || "KYB submitted");
    const updated = { ...merchant, kybStatus: "submitted" as const, circleAccountId: data.data?.circleAccountId };
    setMerchant(updated);
    localStorage.setItem("blitzpay_merchant", JSON.stringify(updated));
  }

  async function handleKybApprove() {
    if (!merchant) return;
    await fetch(`/api/merchants/${merchant.id}/kyb/approve`, { method: "POST" });
    const updated = { ...merchant, kybStatus: "approved" as const };
    setMerchant(updated);
    localStorage.setItem("blitzpay_merchant", JSON.stringify(updated));
    setMessage("KYB approved (demo mode)");
  }

  async function handleBankSubmit() {
    if (!merchant) return;
    setLoading(true);
    const res = await fetch(`/api/merchants/${merchant.id}/bank`, {
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
    const res = await fetch(`/api/merchants/${merchant.id}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountUsdc: settleAmount }),
    });
    const data = await res.json();
    setLoading(false);
    setMessage(data.data?.message || data.error);
    if (data.success) {
      setSettleAmount("");
      setWithdrawing(true);
      await refreshFinancials();
    }
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
          <Card style={{ marginBottom: 20, textAlign: "center" }}>
            <p style={{ color: colors.textMuted, fontSize: 13 }}>Available Balance</p>
            <p style={{ fontSize: 36, fontWeight: 700, color: colors.primary }}>
              ${balance?.balanceUsdc ?? "0.00"} USDC
            </p>
            <p style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
              Credited instantly when customers pay via QR
            </p>
          </Card>

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
                <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>Circle Sandbox verification</div>
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
                <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>Circle withdraw to bank</div>
              </div>
            </Card>
          </div>

          <Card>
            <h3 style={{ marginBottom: 12 }}>Quick Links</h3>
            <div style={{ display: "flex", gap: 12 }}>
              <a href="/pos"><Button variant="secondary" size="sm">Open POS →</Button></a>
              <a href="/customer"><Button variant="secondary" size="sm">Customer Wallet →</Button></a>
            </div>
          </Card>
        </>
      )}

      {view === "kyb" && merchant && (
        <Card>
          <Button variant="ghost" size="sm" onClick={() => setView("dashboard")} style={{ marginBottom: 16 }}>← Back</Button>
          <h2 style={{ marginBottom: 16 }}>KYB Verification</h2>
          <p style={{ color: colors.textMuted, fontSize: 14, marginBottom: 20 }}>
            Complete business verification via Circle Sandbox to enable bank withdrawals.
          </p>
          <div style={{ background: colors.bg, borderRadius: 8, padding: 16, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span>Status</span>{kybBadge(merchant.kybStatus)}
            </div>
            {merchant.circleAccountId && (
              <div style={{ fontSize: 12, color: colors.textMuted, fontFamily: "monospace" }}>
                Circle Account: {merchant.circleAccountId}
              </div>
            )}
          </div>
          {merchant.kybStatus === "pending" && (
            <Button onClick={handleKybSubmit} disabled={loading}>Submit KYB to Circle Sandbox</Button>
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
          <h2 style={{ marginBottom: 16 }}>Withdraw to Bank</h2>
          <p style={{ color: colors.textMuted, fontSize: 14, marginBottom: 12 }}>
            Settles via <a href={CIRCLE_SANDBOX_APP_URL} target="_blank" rel="noopener noreferrer">Circle Sandbox</a> — withdraw USDC to your linked bank account (~12s wire simulation).
          </p>
          <div style={{ background: colors.bg, borderRadius: 8, padding: 16, marginBottom: 20, textAlign: "center" }}>
            <p style={{ fontSize: 13, color: colors.textMuted }}>Available</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: colors.primary }}>${balance?.balanceUsdc ?? "0.00"}</p>
          </div>
          {withdrawing && (
            <div style={{ background: "#FFB30020", border: "1px solid #FFB300", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13 }}>
              Circle Sandbox processing wire withdrawal…
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
            <Input label="Amount (USDC)" value={settleAmount} onChange={setSettleAmount} placeholder="100.00" />
            <Button onClick={handleSettle} disabled={loading || !settleAmount || withdrawing}>
              {loading ? "Submitting…" : withdrawing ? "Processing…" : "Withdraw to Bank"}
            </Button>
          </div>
          {settlements.length > 0 && (
            <>
              <h3 style={{ marginBottom: 12 }}>Withdrawal History</h3>
              {settlements.map(s => (
                <div key={s.id} style={{ background: colors.bg, borderRadius: 8, padding: 16, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{s.amountUsdc} USDC → {s.fiatAmount} {s.fiatCurrency}</div>
                    <div style={{ fontSize: 12, color: colors.textMuted }}>{new Date(s.createdAt).toLocaleString()}</div>
                    {s.status === "processing" && s.completesAt && (
                      <div style={{ fontSize: 11, color: colors.warning, marginTop: 4 }}>
                        Circle ETA: {new Date(s.completesAt).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                  <Badge variant={s.status === "completed" ? "success" : s.status === "failed" ? "error" : "warning"}>
                    {s.status}
                  </Badge>
                </div>
              ))}
            </>
          )}
          {ledger.length > 0 && (
            <>
              <h3 style={{ marginBottom: 12, marginTop: 24 }}>Balance Ledger</h3>
              {ledger.slice(0, 10).map(e => (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${colors.border}`, fontSize: 13 }}>
                  <div>
                    <span style={{ color: e.type === "credit" ? colors.success : colors.error, fontWeight: 600 }}>
                      {e.type === "credit" ? "+" : "-"}{e.amountUsdc}
                    </span>
                    <span style={{ color: colors.textMuted, marginLeft: 8 }}>{e.description}</span>
                  </div>
                  <span style={{ color: colors.textMuted }}>{parseFloat(e.balanceAfter).toFixed(2)}</span>
                </div>
              ))}
            </>
          )}
        </Card>
      )}
    </div>
  );
}
