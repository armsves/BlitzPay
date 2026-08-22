"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { Button, Card, Input, Badge, Spinner, colors } from "@blitzpay/ui";
import { CIRCLE_FAUCET_URL, USDC_TESTNET } from "@blitzpay/shared";
import { parsePaymentQrPayload } from "@blitzpay/blockchain";
import {
  connectWithPasskey,
  createNewPasskey,
  getAddress,
  payUsdcSponsored,
  disconnect,
} from "@/lib/wallet";
import type { Hex } from "viem";
import { BlitzPayLogo } from "@/components/BlitzPayLogo";

type Tab = "wallet" | "pay" | "scan" | "send";

export default function CustomerWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState("0.00");
  const [tab, setTab] = useState<Tab>("wallet");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [scanning, setScanning] = useState(false);

  // Send form
  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("");

  // Payment from QR
  const [paymentData, setPaymentData] = useState<{
    invoiceId: string;
    amountUsdc: string;
    merchantAddress: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<IScannerControls | null>(null);

  const refreshBalance = useCallback(async (addr: string) => {
    try {
      const res = await fetch(`/api/wallet/${addr}/balance`);
      const data = await res.json();
      if (data.success) setBalance(data.data.balanceUsdc);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const addr = getAddress();
    if (addr) {
      setAddress(addr);
      refreshBalance(addr);
    }
  }, [refreshBalance]);

  async function handleConnect() {
    setLoading(true);
    try {
      const addr = await connectWithPasskey();
      setAddress(addr);
      await refreshBalance(addr);
      setMessage("Connected with passkey!");
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Connection failed");
    }
    setLoading(false);
  }

  async function handleCreatePasskey() {
    setLoading(true);
    try {
      const addr = await createNewPasskey();
      setAddress(addr);
      setMessage("Passkey created! Fund your wallet from the Circle faucet.");
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Passkey creation failed");
    }
    setLoading(false);
  }

  function handleDisconnect() {
    disconnect();
    setAddress(null);
    setBalance("0.00");
  }

  async function executePayment(to: string, amountUsdc: string, invoiceId?: string) {
    setLoading(true);
    setMessage("Confirm with passkey…");
    try {
      const result = await payUsdcSponsored(to as Hex, amountUsdc);
      if (address) await refreshBalance(address);

      if (invoiceId) {
        const confirmRes = await fetch(`/api/payments/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoiceId,
            txHash: result.txHash,
            blockNumber: result.blockNumber,
            status: result.status,
          }),
        });
        const confirmJson = await confirmRes.json();
        if (!confirmJson.success) {
          throw new Error(confirmJson.error || "Payment sent but invoice confirmation failed");
        }
        setPaymentData(null);
        setTab("wallet");
        setMessage(`Paid $${amountUsdc} USDC — invoice confirmed · TX ${result.txHash.slice(0, 10)}…`);
      } else {
        setSendTo("");
        setSendAmount("");
        setTab("wallet");
        setMessage(`Sent $${amountUsdc} USDC · TX ${result.txHash.slice(0, 10)}…`);
      }
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Payment failed");
    }
    setLoading(false);
  }

  async function handleSend() {
    if (!address || !sendTo || !sendAmount) return;
    await executePayment(sendTo, sendAmount);
  }

  async function handlePayInvoice() {
    if (!paymentData || !address) return;
    await executePayment(
      paymentData.merchantAddress,
      paymentData.amountUsdc,
      paymentData.invoiceId
    );
  }

  function startScanner() {
    setScanning(true);
    setTab("scan");
    setTimeout(async () => {
      if (!videoRef.current) return;
      const reader = new BrowserQRCodeReader();
      try {
        const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
          if (result) {
            const parsed = parsePaymentQrPayload(result.getText());
            if (parsed) {
              setPaymentData(parsed);
              setScanning(false);
              controls.stop();
              setTab("pay");
              setMessage(`Invoice found: $${parsed.amountUsdc} USDC`);
            }
          }
        });
        scannerRef.current = controls;
      } catch {
        setMessage("Camera access denied or not available");
        setScanning(false);
      }
    }, 100);
  }

  function stopScanner() {
    scannerRef.current?.stop();
    setScanning(false);
  }

  if (!address) {
    return (
      <div style={{ maxWidth: 420, margin: "60px auto", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <BlitzPayLogo size="lg" href="/" subtitle="Instant USDC payments on Monad" />
        </div>

        <Card>
          <h2 style={{ marginBottom: 8, fontSize: 18 }}>Get Started</h2>
          <p style={{ color: colors.textMuted, fontSize: 14, marginBottom: 20 }}>
            Create a passkey wallet with Face ID / Touch ID, or sign in with an existing passkey.
            Your EVM address is derived deterministically from your passkey via Mera.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Button onClick={handleCreatePasskey} disabled={loading} size="lg">
              {loading ? "Creating..." : "Create Passkey Wallet"}
            </Button>
            <Button onClick={handleConnect} disabled={loading} variant="secondary" size="lg">
              Sign In with Passkey
            </Button>
          </div>
        </Card>

        <Card style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>Fund Your Wallet</h3>
          <p style={{ color: colors.textMuted, fontSize: 13, marginBottom: 12 }}>
            Get free testnet USDC from Circle&apos;s faucet for Monad testnet.
          </p>
          <a href={CIRCLE_FAUCET_URL} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary" size="sm" style={{ width: "100%" }}>
              Open Circle Faucet →
            </Button>
          </a>
          <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 8, fontFamily: "monospace" }}>
            USDC: {USDC_TESTNET.address}
          </p>
        </Card>

        {message && (
          <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: colors.primary }}>{message}</p>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "24px 16px", paddingBottom: 80 }}>
      <header style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <BlitzPayLogo size="sm" href="/" subtitle="Customer Wallet" />
          <Button variant="ghost" size="sm" onClick={handleDisconnect}>Logout</Button>
        </div>
      </header>

      {message && (
        <div style={{ background: colors.primary + "20", border: `1px solid ${colors.primary}`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>
          {message}
          <button onClick={() => setMessage("")} style={{ float: "right", background: "none", border: "none", color: colors.textMuted, cursor: "pointer" }}>×</button>
        </div>
      )}

      {tab === "wallet" && (
        <>
          <Card style={{ textAlign: "center", marginBottom: 20 }}>
            <p style={{ color: colors.textMuted, fontSize: 13, marginBottom: 4 }}>USDC Balance</p>
            <p style={{ fontSize: 40, fontWeight: 700, color: colors.primary }}>${balance}</p>
            <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 8, fontFamily: "monospace", wordBreak: "break-all" }}>
              {address}
            </p>
            <Button variant="ghost" size="sm" onClick={() => refreshBalance(address)} style={{ marginTop: 8 }}>
              Refresh
            </Button>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <Button onClick={() => setTab("send")}>Send</Button>
            <Button variant="secondary" onClick={startScanner}>Scan & Pay</Button>
          </div>

          <Card>
            <h3 style={{ fontSize: 14, marginBottom: 8 }}>Get Testnet USDC</h3>
            <p style={{ color: colors.textMuted, fontSize: 12, marginBottom: 12 }}>
              Fund via Circle Mint faucet — select MONAD-TESTNET and paste your address.
            </p>
            <a href={CIRCLE_FAUCET_URL} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="sm" style={{ width: "100%" }}>
                Circle Faucet →
              </Button>
            </a>
          </Card>
        </>
      )}

      {tab === "send" && (
        <Card>
          <Button variant="ghost" size="sm" onClick={() => setTab("wallet")} style={{ marginBottom: 16 }}>← Back</Button>
          <h2 style={{ marginBottom: 16 }}>Send USDC</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Input label="Recipient Address" value={sendTo} onChange={setSendTo} placeholder="0x..." />
            <Input label="Amount (USDC)" value={sendAmount} onChange={setSendAmount} placeholder="10.00" />
            <Button onClick={handleSend} disabled={loading || !sendTo || !sendAmount}>
              {loading ? "Sending..." : "Send USDC"}
            </Button>
          </div>
          <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 12 }}>
            Gas is sponsored — you only need USDC, not MON
          </p>
        </Card>
      )}

      {tab === "scan" && (
        <Card>
          <Button variant="ghost" size="sm" onClick={() => { stopScanner(); setTab("wallet"); }} style={{ marginBottom: 16 }}>← Back</Button>
          <h2 style={{ marginBottom: 16 }}>Scan QR Code</h2>
          <div style={{ borderRadius: 12, overflow: "hidden", background: "#000", marginBottom: 16 }}>
            <video ref={videoRef} style={{ width: "100%", height: 300, objectFit: "cover" }} />
          </div>
          {scanning && (
            <div style={{ textAlign: "center" }}>
              <Spinner />
              <p style={{ color: colors.textMuted, fontSize: 13, marginTop: 8 }}>Point camera at invoice QR code</p>
            </div>
          )}
        </Card>
      )}

      {tab === "pay" && paymentData && (
        <Card>
          <h2 style={{ marginBottom: 16 }}>Confirm Payment</h2>
          <div style={{ background: colors.bg, borderRadius: 8, padding: 20, marginBottom: 20, textAlign: "center" }}>
            <p style={{ color: colors.textMuted, fontSize: 13 }}>Amount</p>
            <p style={{ fontSize: 36, fontWeight: 700, color: colors.primary }}>${paymentData.amountUsdc}</p>
            <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 8, fontFamily: "monospace" }}>
              To: {paymentData.merchantAddress.slice(0, 8)}...{paymentData.merchantAddress.slice(-6)}
            </p>
          </div>
          <Button onClick={handlePayInvoice} disabled={loading} size="lg" style={{ width: "100%", marginBottom: 12 }}>
            {loading ? "Confirm with passkey…" : "Pay now — passkey + sponsored gas"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setPaymentData(null); setTab("wallet"); }} style={{ width: "100%" }}>
            Cancel
          </Button>
        </Card>
      )}

      {/* Bottom nav */}
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: colors.surface, borderTop: `1px solid ${colors.border}`,
        display: "flex", justifyContent: "center", padding: "8px 0",
      }}>
        <div style={{ display: "flex", gap: 32, maxWidth: 420, width: "100%", justifyContent: "center" }}>
          {([
            { id: "wallet" as Tab, label: "Wallet", icon: "💰" },
            { id: "send" as Tab, label: "Send", icon: "📤" },
            { id: "scan" as Tab, label: "Scan", icon: "📷" },
          ]).map(item => (
            <button key={item.id} onClick={() => { if (item.id === "scan") startScanner(); else { stopScanner(); setTab(item.id); } }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: tab === item.id ? colors.primary : colors.textMuted,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                fontSize: 11, fontWeight: tab === item.id ? 600 : 400,
              }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
