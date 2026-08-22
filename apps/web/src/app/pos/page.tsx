"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Button, Card, Input, Badge, colors } from "@blitzpay/ui";
import type { Product, Invoice, InvoiceItem, Merchant } from "@blitzpay/shared";

type Tab = "products" | "cart" | "invoices";

function emptyLineItem(): { name: string; price: string; qty: string } {
  return { name: "", price: "", qty: "1" };
}

export default function POSApp() {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [tab, setTab] = useState<Tab>("cart");
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Quick sale line (no catalog required)
  const [lineItem, setLineItem] = useState(emptyLineItem());

  // Product catalog form
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
    const res = await fetch(`/api/merchants/${merchant.id}/products`);
    const data = await res.json();
    if (data.success) setProducts(data.data || []);
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
    setTab("cart");
  }

  function addQuickLineToCart() {
    const name = lineItem.name.trim();
    const price = lineItem.price.trim();
    const qty = parseInt(lineItem.qty, 10) || 1;
    if (!name || !price || parseFloat(price) <= 0) {
      setMessage("Enter item name and price to add to sale");
      return;
    }
    const lineTotal = (parseFloat(price) * qty).toFixed(2);
    setCart((prev) => [
      ...prev,
      {
        productId: `quick-${Date.now()}`,
        name,
        quantity: qty,
        unitPriceUsdc: price,
        lineTotalUsdc: lineTotal,
      },
    ]);
    setLineItem(emptyLineItem());
    setMessage(`Added ${name} to sale`);
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
      setMessage(`Product "${data.data.name}" saved — click Add to sale or use Quick sale below`);
      loadProducts();
    } else {
      setMessage(data.error || "Failed to save product");
    }
  }

  const cartTotal = cart.reduce((s, i) => s + parseFloat(i.lineTotalUsdc), 0).toFixed(2);

  if (!merchant) {
    return (
      <div style={{ maxWidth: 480, margin: "80px auto", padding: 20, textAlign: "center" }}>
        <h1 style={{ fontSize: 28, marginBottom: 12 }}>
          <span style={{ color: colors.primary }}>Blitz</span>Pay POS
        </h1>
        <p style={{ color: colors.textMuted, marginBottom: 24 }}>
          Log in as a merchant first — POS uses the same session as the merchant portal.
        </p>
        <Link href="/merchant">
          <Button>Open Merchant Portal →</Button>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>
            <span style={{ color: colors.primary }}>Blitz</span>Pay POS
          </h1>
          <p style={{ color: colors.textMuted, fontSize: 13 }}>{merchant.businessName}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["cart", "products", "invoices"] as Tab[]).map((t) => (
            <Button key={t} variant={tab === t ? "primary" : "secondary"} size="sm" onClick={() => setTab(t)}>
              {t === "cart" ? `Sale (${cart.length})` : t.charAt(0).toUpperCase() + t.slice(1)}
            </Button>
          ))}
        </div>
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
        <Card style={{ marginBottom: 24, textAlign: "center" }}>
          <h2 style={{ marginBottom: 8 }}>Invoice {activeInvoice.invoiceNumber}</h2>
          <p style={{ fontSize: 32, fontWeight: 700, color: colors.primary, marginBottom: 16 }}>
            ${activeInvoice.totalUsdc} USDC
          </p>
          <div style={{ display: "inline-block", background: "#fff", padding: 16, borderRadius: 12, marginBottom: 16 }}>
            <QRCodeSVG value={activeInvoice.paymentQrData} size={200} />
          </div>
          <p style={{ color: colors.textMuted, fontSize: 13, marginBottom: 12 }}>
            Customer scans this QR to pay instantly via BlitzPay wallet
          </p>
          <Badge variant={activeInvoice.status === "paid" ? "success" : "warning"}>
            {activeInvoice.status.toUpperCase()}
          </Badge>
          {activeInvoice.txHash && (
            <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 8, fontFamily: "monospace" }}>
              TX: {activeInvoice.txHash}
            </p>
          )}
          <div style={{ marginTop: 16 }}>
            <Button variant="secondary" size="sm" onClick={() => setActiveInvoice(null)}>
              Close
            </Button>
          </div>
        </Card>
      )}

      {tab === "cart" && (
        <>
          <Card style={{ marginBottom: 20 }}>
            <h2 style={{ marginBottom: 8, fontSize: 18 }}>Quick sale</h2>
            <p style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16 }}>
              Add items directly — no catalog required. Then create invoice &amp; QR.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 80px auto", gap: 10, alignItems: "end" }}>
              <Input label="Item name" value={lineItem.name} onChange={(v) => setLineItem({ ...lineItem, name: v })} placeholder="Coffee" />
              <Input label="Price (USDC)" value={lineItem.price} onChange={(v) => setLineItem({ ...lineItem, price: v })} placeholder="3.50" />
              <Input label="Qty" value={lineItem.qty} onChange={(v) => setLineItem({ ...lineItem, qty: v })} type="number" />
              <Button onClick={addQuickLineToCart} disabled={!lineItem.name.trim() || !lineItem.price.trim()}>
                Add
              </Button>
            </div>
          </Card>

          <Card>
            <h2 style={{ marginBottom: 16 }}>Current sale</h2>
            {cart.length === 0 ? (
              <p style={{ color: colors.textMuted, textAlign: "center", padding: 32 }}>
                No items yet. Use Quick sale above, or add from the Products tab.
              </p>
            ) : (
              <>
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 0",
                      borderBottom: `1px solid ${colors.border}`,
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: 13, color: colors.textMuted }}>
                        {item.quantity} × ${item.unitPriceUsdc}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontWeight: 600 }}>${item.lineTotalUsdc}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeFromCart(item.productId)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "16px 0",
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  <span>Total</span>
                  <span style={{ color: colors.primary }}>${cartTotal} USDC</span>
                </div>
                <Button onClick={createInvoice} disabled={loading} style={{ width: "100%" }} size="lg">
                  {loading ? "Creating invoice…" : "Create invoice & show QR"}
                </Button>
              </>
            )}
          </Card>
        </>
      )}

      {tab === "products" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, alignItems: "center" }}>
            <div>
              <h2>Product catalog</h2>
              <p style={{ color: colors.textMuted, fontSize: 13 }}>Optional — save products to reuse in future sales</p>
            </div>
            <Button size="sm" onClick={() => setShowAddProduct(!showAddProduct)}>
              {showAddProduct ? "Cancel" : "+ Add product"}
            </Button>
          </div>

          {showAddProduct && (
            <Card style={{ marginBottom: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Input label="Name" value={pName} onChange={setPName} required />
                <Input label="Price (USDC)" value={pPrice} onChange={setPPrice} required />
                <Input label="Description" value={pDesc} onChange={setPDesc} />
                <Input label="Stock (display only)" value={pQty} onChange={setPQty} type="number" />
                <Input label="Image URL" value={pImage} onChange={setPImage} />
              </div>
              <Button onClick={addProduct} disabled={loading || !pName || !pPrice} style={{ marginTop: 16 }}>
                Save product
              </Button>
            </Card>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {products.map((p) => (
              <Card key={p.id}>
                {p.imageUrl && (
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8, marginBottom: 12 }}
                  />
                )}
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 4, minHeight: 36 }}>{p.description || "—"}</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, alignItems: "center" }}>
                  <span style={{ fontWeight: 700, color: colors.primary }}>${p.priceUsdc}</span>
                  <Button size="sm" onClick={() => addToCart(p)}>
                    Add to sale
                  </Button>
                </div>
              </Card>
            ))}
            {products.length === 0 && (
              <p style={{ color: colors.textMuted, gridColumn: "1 / -1", textAlign: "center", padding: 40 }}>
                No saved products. Use Quick sale on the Sale tab, or add products here to reuse them.
              </p>
            )}
          </div>
        </>
      )}

      {tab === "invoices" && (
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
                onClick={() => setActiveInvoice(inv)}
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
      )}
    </div>
  );
}
