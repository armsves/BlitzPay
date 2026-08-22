"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Button, Card, Input, Badge, colors } from "@blitzpay/ui";
import type { Product, Invoice, InvoiceItem, Merchant } from "@blitzpay/shared";
import { BlitzPayLogo } from "@/components/BlitzPayLogo";

export default function POSApp() {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [showInvoices, setShowInvoices] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [productsLoading, setProductsLoading] = useState(false);

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [pName, setPName] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pQty, setPQty] = useState("99");
  const [pImage, setPImage] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("blitzpay_merchant");
    if (saved) setMerchant(JSON.parse(saved));
  }, []);

  const loadProducts = useCallback(async () => {
    if (!merchant) return;
    setProductsLoading(true);
    try {
      const res = await fetch(`/api/merchants/${merchant.id}/products`);
      const data = await res.json();
      if (data.success) setProducts(data.data || []);
      else setMessage(data.error || "Could not load catalog");
    } finally {
      setProductsLoading(false);
    }
  }, [merchant]);

  const loadInvoices = useCallback(async () => {
    if (!merchant) return;
    const res = await fetch(`/api/merchants/${merchant.id}/invoices`);
    const data = await res.json();
    if (data.success) setInvoices(data.data || []);
  }, [merchant]);

  useEffect(() => {
    if (merchant) {
      loadProducts();
      loadInvoices();
    }
  }, [merchant, loadProducts, loadInvoices]);

  // Poll invoice status while QR is displayed
  useEffect(() => {
    if (!activeInvoice || activeInvoice.status === "paid") return;

    let cancelled = false;

    async function poll() {
      const res = await fetch(`/api/invoices/${activeInvoice!.id}`);
      const data = await res.json();
      if (cancelled || !data.success) return;

      const updated = data.data as Invoice;
      if (updated.status === "paid") {
        setActiveInvoice(updated);
        setMessage(`Payment received — ${updated.invoiceNumber} paid`);
        loadInvoices();
      }
    }

    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeInvoice?.id, activeInvoice?.status, loadInvoices]);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        const qty = existing.quantity + 1;
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: qty, lineTotalUsdc: (parseFloat(i.unitPriceUsdc) * qty).toFixed(2) }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          quantity: 1,
          unitPriceUsdc: product.priceUsdc,
          lineTotalUsdc: product.priceUsdc,
        },
      ];
    });
    setMessage(`Added ${product.name} to sale`);
  }

  function updateCartQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.productId !== productId) return i;
          const qty = Math.max(0, i.quantity + delta);
          return {
            ...i,
            quantity: qty,
            lineTotalUsdc: (parseFloat(i.unitPriceUsdc) * qty).toFixed(2),
          };
        })
        .filter((i) => i.quantity > 0)
    );
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }

  async function createInvoice() {
    if (!merchant || cart.length === 0) return;
    setLoading(true);
    setMessage("");
    const res = await fetch(`/api/merchants/${merchant.id}/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      setActiveInvoice(data.data);
      setCart([]);
      setMessage("Invoice created — show QR to customer");
      loadInvoices();
    } else {
      setMessage(data.error || "Failed to create invoice");
    }
  }

  async function addProduct() {
    if (!merchant) return;
    setLoading(true);
    setMessage("");
    const res = await fetch(`/api/merchants/${merchant.id}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: pName,
        description: pDesc,
        priceUsdc: pPrice,
        quantity: parseInt(pQty, 10) || 99,
        imageUrl: pImage || undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      setShowAddProduct(false);
      setPName("");
      setPDesc("");
      setPPrice("");
      setPQty("99");
      setPImage("");
      await loadProducts();
      setMessage(`"${data.data.name}" added to catalog — tap it to add to sale`);
    } else {
      setMessage(data.error || "Failed to save product");
    }
  }

  const cartTotal = cart.reduce((s, i) => s + parseFloat(i.lineTotalUsdc), 0).toFixed(2);

  if (!merchant) {
    return (
      <div style={{ maxWidth: 480, margin: "80px auto", padding: 20, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <BlitzPayLogo size="lg" href="/" subtitle="Point of Sale" />
        </div>
        <p style={{ color: colors.textMuted, marginBottom: 24 }}>
          Log in as a merchant first — POS uses the same session as the merchant portal.
        </p>
        <Link href="/merchant">
          <Button>Open Merchant Portal →</Button>
        </Link>
      </div>
    );
  }

  if (showInvoices) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px" }}>
        <Button variant="ghost" size="sm" onClick={() => setShowInvoices(false)} style={{ marginBottom: 16 }}>
          ← Back to POS
        </Button>
        <Card>
          <h2 style={{ marginBottom: 16 }}>Invoice history</h2>
          {invoices.length === 0 ? (
            <p style={{ color: colors.textMuted, textAlign: "center", padding: 40 }}>No invoices yet.</p>
          ) : (
            invoices.map((inv) => (
              <div
                key={inv.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 0",
                  borderBottom: `1px solid ${colors.border}`,
                  cursor: "pointer",
                }}
                onClick={() => {
                  setActiveInvoice(inv);
                  setShowInvoices(false);
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{inv.invoiceNumber}</div>
                  <div style={{ fontSize: 12, color: colors.textMuted }}>{new Date(inv.createdAt).toLocaleString()}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 600 }}>${inv.totalUsdc}</div>
                  <Badge variant={inv.status === "paid" ? "success" : inv.status === "expired" ? "error" : "warning"}>
                    {inv.status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px 40px" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <BlitzPayLogo size="md" href="/" subtitle={merchant.businessName} />
        </div>
        <Button variant="secondary" size="sm" onClick={() => setShowInvoices(true)}>
          Invoice history
        </Button>
      </header>

      {message && (
        <div
          style={{
            background: colors.primary + "20",
            border: `1px solid ${colors.primary}`,
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {message}
          <button
            type="button"
            onClick={() => setMessage("")}
            style={{ float: "right", background: "none", border: "none", color: colors.textMuted, cursor: "pointer" }}
          >
            ×
          </button>
        </div>
      )}

      {activeInvoice && (
        <Card style={{ marginBottom: 20, textAlign: "center" }}>
          <h2 style={{ marginBottom: 8 }}>Invoice {activeInvoice.invoiceNumber}</h2>
          <p style={{ fontSize: 32, fontWeight: 700, color: colors.primary, marginBottom: 16 }}>
            ${activeInvoice.totalUsdc} USDC
          </p>

          {activeInvoice.status === "paid" ? (
            <>
              <div
                style={{
                  background: "#00C85320",
                  border: `1px solid ${colors.success}`,
                  borderRadius: 12,
                  padding: 24,
                  marginBottom: 16,
                }}
              >
                <p style={{ fontSize: 28, fontWeight: 700, color: colors.success, marginBottom: 8 }}>✓ PAID</p>
                <p style={{ color: colors.textMuted, fontSize: 13 }}>Payment received — instant settlement</p>
                {activeInvoice.txHash && (
                  <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 12, fontFamily: "monospace", wordBreak: "break-all" }}>
                    TX: {activeInvoice.txHash}
                  </p>
                )}
              </div>
              <Button onClick={() => setActiveInvoice(null)} size="lg">
                New sale
              </Button>
            </>
          ) : (
            <>
              <div style={{ display: "inline-block", background: "#fff", padding: 16, borderRadius: 12, marginBottom: 16 }}>
                <QRCodeSVG value={activeInvoice.paymentQrData} size={200} />
              </div>
              <p style={{ color: colors.textMuted, fontSize: 13, marginBottom: 8 }}>
                Customer scans this QR to pay
              </p>
              <p style={{ color: colors.primary, fontSize: 12, marginBottom: 12 }}>
                Waiting for payment…
              </p>
              <Badge variant="warning">{activeInvoice.status.toUpperCase()}</Badge>
              <div style={{ marginTop: 16 }}>
                <Button variant="secondary" size="sm" onClick={() => setActiveInvoice(null)}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      <div className="pos-split">
        {/* Catalog — always visible */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <h2 style={{ fontSize: 18 }}>Catalog</h2>
              <p style={{ color: colors.textMuted, fontSize: 12 }}>Tap a product to add it to the sale</p>
            </div>
            <Button size="sm" onClick={() => setShowAddProduct(!showAddProduct)}>
              {showAddProduct ? "Cancel" : "+ New product"}
            </Button>
          </div>

          {showAddProduct && (
            <Card style={{ marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Input label="Name" value={pName} onChange={setPName} required />
                <Input label="Price (USDC)" value={pPrice} onChange={setPPrice} required />
                <Input label="Description" value={pDesc} onChange={setPDesc} />
                <Input label="Image URL" value={pImage} onChange={setPImage} />
              </div>
              <Button onClick={addProduct} disabled={loading || !pName || !pPrice} style={{ marginTop: 12 }}>
                Save to catalog
              </Button>
            </Card>
          )}

          {productsLoading ? (
            <p style={{ color: colors.textMuted, padding: 24, textAlign: "center" }}>Loading catalog…</p>
          ) : products.length === 0 ? (
            <Card style={{ textAlign: "center", padding: 32 }}>
              <p style={{ color: colors.textMuted, marginBottom: 16 }}>No products in catalog yet.</p>
              <Button size="sm" onClick={() => setShowAddProduct(true)}>
                Add your first product
              </Button>
            </Card>
          ) : (
            <div className="pos-catalog-grid">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="pos-catalog-item"
                  onClick={() => addToCart(p)}
                >
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt="" className="pos-catalog-img" />
                  ) : (
                    <div className="pos-catalog-img pos-catalog-img-placeholder">{p.name.charAt(0)}</div>
                  )}
                  <div className="pos-catalog-name">{p.name}</div>
                  <div className="pos-catalog-price">${p.priceUsdc}</div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Sale — always visible */}
        <section>
          <Card style={{ position: "sticky", top: 16 }}>
            <h2 style={{ fontSize: 18, marginBottom: 4 }}>Current sale</h2>
            <p style={{ color: colors.textMuted, fontSize: 12, marginBottom: 16 }}>
              {cart.length} item{cart.length !== 1 ? "s" : ""}
            </p>

            {cart.length === 0 ? (
              <p style={{ color: colors.textMuted, textAlign: "center", padding: "32px 0", fontSize: 14 }}>
                Select products from the catalog →
              </p>
            ) : (
              <>
                {cart.map((item) => (
                  <div key={item.productId} className="pos-cart-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: colors.textMuted }}>${item.unitPriceUsdc} each</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Button variant="secondary" size="sm" onClick={() => updateCartQty(item.productId, -1)}>
                        −
                      </Button>
                      <span style={{ minWidth: 20, textAlign: "center", fontWeight: 600 }}>{item.quantity}</span>
                      <Button variant="secondary" size="sm" onClick={() => updateCartQty(item.productId, 1)}>
                        +
                      </Button>
                    </div>
                    <div style={{ fontWeight: 600, minWidth: 56, textAlign: "right" }}>${item.lineTotalUsdc}</div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.productId)}
                      style={{
                        background: "none",
                        border: "none",
                        color: colors.textMuted,
                        cursor: "pointer",
                        fontSize: 18,
                        padding: "0 4px",
                      }}
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "16px 0 8px",
                    fontSize: 22,
                    fontWeight: 700,
                    borderTop: `1px solid ${colors.border}`,
                    marginTop: 8,
                  }}
                >
                  <span>Total</span>
                  <span style={{ color: colors.primary }}>${cartTotal}</span>
                </div>

                <Button onClick={createInvoice} disabled={loading} style={{ width: "100%", marginTop: 12 }} size="lg">
                  {loading ? "Creating…" : "Create invoice & QR"}
                </Button>
              </>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
