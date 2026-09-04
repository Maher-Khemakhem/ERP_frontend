import { useCallback, useEffect, useState } from "react";
import { Tag, Percent, RefreshCw, XCircle, CheckCircle2 } from "lucide-react";
import { useApi } from "../../lib/apiClient.jsx";
import { ShelfTag, Field, Chip, Panel, Message, Empty, Tabs } from "../../design/components.jsx";

export default function PricingModule() {
  const { request } = useApi();
  const [tab, setTab] = useState("prices");

  // Pricing needs product names/units for display - read-only lookup against Inventory's API,
  // the same way any storefront would join product data, not a backend module dependency.
  const [products, setProducts] = useState([]);
  const fetchProducts = useCallback(async () => {
    try {
      const data = await request("/api/inventory/products");
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      // Non-fatal here - product names just won't resolve, IDs still work.
    }
  }, [request]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <div>
      <h1 className="page-title">Pricing</h1>
      <p className="page-sub">Base prices and promotions — what checkout charges for each item.</p>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "prices", label: "Prices" },
          { key: "promotions", label: "Promotions" },
        ]}
      />

      {tab === "prices" && <PricesTab products={products} />}
      {tab === "promotions" && <PromotionsTab products={products} />}
    </div>
  );
}

function productLabel(products, productId) {
  const p = products.find((p) => p.id === productId);
  return p ? `${p.name} (${p.sku})` : productId;
}

function PricesTab({ products }) {
  const { request } = useApi();
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ productId: "", unitPrice: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // GET /api/pricing/prices -> [{ productId, unitPrice: "3.200 TND" }]
      const data = await request("/api/pricing/prices");
      setPrices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Could not reach the pricing service.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.productId || !form.unitPrice) {
      setMsg({ ok: false, text: "Product and price are required." });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      // POST /api/pricing/prices is idempotent - creates or updates the price for this product
      await request("/api/pricing/prices", {
        method: "POST",
        body: { productId: form.productId, unitPrice: Number(form.unitPrice) },
      });
      setMsg({ ok: true, text: "Price saved." });
      setForm({ productId: "", unitPrice: "" });
      fetchPrices();
    } catch (err) {
      setMsg({ ok: false, text: err.message || "Could not save the price." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid">
      <Panel title="Set a price" icon={<Tag size={16} />}>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: -8, marginBottom: 16 }}>
          Submitting again for the same product updates its price — there's no separate edit action.
        </p>
        <Message ok={msg?.ok} text={msg?.text} />
        <form onSubmit={handleSubmit}>
          <Field label="Product">
            <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
              <option value="">Select a product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
          </Field>
          <Field label="Unit price (TND)">
            <input
              type="number"
              min="0"
              step="0.001"
              value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
              placeholder="3.200"
            />
          </Field>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: "100%", justifyContent: "center" }}>
            {saving ? "Saving…" : "Save price"}
          </button>
        </form>
      </Panel>

      <Panel
        title="Current prices"
        icon={<Tag size={16} />}
        right={
          <button className="btn" onClick={fetchPrices} disabled={loading} style={{ padding: "5px 10px" }}>
            <RefreshCw size={13} /> Refresh
          </button>
        }
      >
        <Message ok={false} text={error} />
        {!error && prices.length === 0 && !loading && <Empty>No prices set yet.</Empty>}
        {prices.map((row) => (
          <ShelfTag key={row.productId}>
            <div className="tag-row">
              <div>
                <div className="tag-name">{productLabel(products, row.productId)}</div>
                <div className="tag-sku">{row.productId}</div>
              </div>
              <div className="price-badge">{row.unitPrice}</div>
            </div>
          </ShelfTag>
        ))}
      </Panel>
      <style>{`.price-badge { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 15px; color: var(--green-deep); white-space: nowrap; }`}</style>
    </div>
  );
}

function PromotionsTab({ products }) {
  const { request } = useApi();
  const [productId, setProductId] = useState("");
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ discountPercent: "", validFrom: "", validUntil: "" });
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState(null);
  const [actionMsg, setActionMsg] = useState(null);

  const fetchPromotions = useCallback(
    async (pid) => {
      if (!pid) return;
      setLoading(true);
      setError("");
      try {
        // GET /api/pricing/promotions/{productId} -> [{ id, productId, active }]
        const data = await request(`/api/pricing/promotions/${pid}`);
        setPromotions(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || "Could not load promotions.");
      } finally {
        setLoading(false);
      }
    },
    [request]
  );

  useEffect(() => {
    setPromotions([]);
    if (productId) fetchPromotions(productId);
  }, [productId, fetchPromotions]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!productId) {
      setCreateMsg({ ok: false, text: "Select a product first." });
      return;
    }
    if (!form.discountPercent || !form.validFrom || !form.validUntil) {
      setCreateMsg({ ok: false, text: "Discount, start and end are all required." });
      return;
    }
    setCreating(true);
    setCreateMsg(null);
    try {
      await request("/api/pricing/promotions", {
        method: "POST",
        body: {
          productId,
          discountPercent: Number(form.discountPercent),
          validFrom: new Date(form.validFrom).toISOString(),
          validUntil: new Date(form.validUntil).toISOString(),
        },
      });
      setCreateMsg({ ok: true, text: "Promotion created." });
      setForm({ discountPercent: "", validFrom: "", validUntil: "" });
      fetchPromotions(productId);
    } catch (err) {
      setCreateMsg({ ok: false, text: err.message || "Could not create the promotion." });
    } finally {
      setCreating(false);
    }
  }

  async function handleDeactivate(promotionId) {
    setActionMsg(null);
    try {
      await request(`/api/pricing/promotions/${promotionId}`, { method: "DELETE" });
      setActionMsg({ ok: true, text: "Promotion deactivated." });
      fetchPromotions(productId);
    } catch (err) {
      setActionMsg({ ok: false, text: err.message || "Could not deactivate the promotion." });
    }
  }

  return (
    <div className="grid">
      <Panel title="Create a promotion" icon={<Percent size={16} />}>
        <Field label="Product">
          <select value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Select a product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
            ))}
          </select>
        </Field>
        <Message ok={createMsg?.ok} text={createMsg?.text} />
        <form onSubmit={handleCreate}>
          <Field label="Discount (%)">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.discountPercent}
              onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
              placeholder="15"
            />
          </Field>
          <Field label="Valid from">
            <input type="datetime-local" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
          </Field>
          <Field label="Valid until">
            <input type="datetime-local" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
          </Field>
          <button type="submit" className="btn btn-primary" disabled={creating || !productId} style={{ width: "100%", justifyContent: "center" }}>
            {creating ? "Creating…" : "Create promotion"}
          </button>
        </form>
      </Panel>

      <Panel
        title="Promotions for this product"
        icon={<Percent size={16} />}
        right={
          productId && (
            <button className="btn" onClick={() => fetchPromotions(productId)} disabled={loading} style={{ padding: "5px 10px" }}>
              <RefreshCw size={13} /> Refresh
            </button>
          )
        }
      >
        <Message ok={actionMsg?.ok} text={actionMsg?.text} />
        <Message ok={false} text={error} />
        {!productId && <Empty>Select a product to see its promotions.</Empty>}
        {productId && !error && promotions.length === 0 && !loading && <Empty>No promotions for this product yet.</Empty>}
        {promotions.map((promo) => (
          <ShelfTag key={promo.id}>
            <div className="tag-row">
              <div>
                <div className="tag-name">Promotion</div>
                <div className="tag-sku">{promo.id}</div>
              </div>
              {promo.active ? (
                <button className="btn" onClick={() => handleDeactivate(promo.id)} style={{ padding: "5px 10px" }}>
                  <XCircle size={13} /> Deactivate
                </button>
              ) : (
                <Chip>Inactive</Chip>
              )}
            </div>
            <div className="tag-meta">
              {promo.active && (
                <Chip>
                  <CheckCircle2 size={10} style={{ verticalAlign: -1, marginRight: 3 }} />
                  Active
                </Chip>
              )}
            </div>
          </ShelfTag>
        ))}
      </Panel>
    </div>
  );
}