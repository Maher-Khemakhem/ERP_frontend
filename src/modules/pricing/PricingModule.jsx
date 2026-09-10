import { useCallback, useEffect, useMemo, useState } from "react";
import { Tag, Percent, RefreshCw, XCircle, CheckCircle2, Plus, Search, Trash2 } from "lucide-react";
import { useApi } from "../../lib/apiClient.jsx";
import { ShelfTag, Field, Chip, Panel, Message, Empty, Modal } from "../../design/components.jsx";

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
      <style>{pricingStyles}</style>

      <div className="pricing-actions" role="toolbar" aria-label="Pricing actions">
        <button type="button" className={`pricing-action ${tab === "prices" ? "active" : ""}`} onClick={() => setTab("prices")}>
          <Tag size={16} /><span><strong>Prices</strong><small>Product selling prices</small></span>
        </button>
        <button type="button" className={`pricing-action ${tab === "promotions" ? "active" : ""}`} onClick={() => setTab("promotions")}>
          <Percent size={16} /><span><strong>Promotions</strong><small>Discount campaigns</small></span>
        </button>
      </div>

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
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);

  const filteredPrices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return prices;
    return prices.filter((row) => productLabel(products, row.productId).toLowerCase().includes(normalizedQuery));
  }, [prices, products, query]);

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
      setShowForm(false);
      fetchPrices();
    } catch (err) {
      setMsg({ ok: false, text: err.message || "Could not save the price." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Panel
        title="Current prices"
        icon={<Tag size={16} />}
        right={
          <div className="pricing-panel-actions">
            <button className="btn btn-primary btn-small" onClick={() => { setMsg(null); setShowForm(true); }}><Plus size={13} /> Set price</button>
            <button className="btn btn-small" onClick={fetchPrices} disabled={loading}><RefreshCw size={13} /> Refresh</button>
          </div>
        }
      >
        <Message ok={false} text={error} />
        <Message ok={msg?.ok} text={msg?.text} />
        <label className="pricing-search"><Search size={14} /><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search product or SKU" aria-label="Search prices" /></label>
        {!error && prices.length === 0 && !loading && <Empty>No prices set yet.</Empty>}
        {prices.length > 0 && filteredPrices.length === 0 && <Empty>No prices match “{query}”.</Empty>}
        {filteredPrices.map((row) => (
          <ShelfTag key={row.productId}>
            <div className="tag-row">
              <div>
                <div className="tag-name">{productLabel(products, row.productId)}</div>
                <div className="tag-sku">{row.productId}</div>
              </div>
              <div className="pricing-row-actions">
                <div className="price-badge">{row.unitPrice}</div>
                <button type="button" className="btn-icon danger" title="Remove price" aria-label={`Remove price for ${productLabel(products, row.productId)}`} onClick={async () => {
                  if (!window.confirm(`Remove the price for ${productLabel(products, row.productId)}?`)) return;
                  try { await request(`/api/pricing/prices/${row.productId}`, { method: "DELETE" }); fetchPrices(); }
                  catch (err) { setMsg({ ok: false, text: err.message || "Could not remove the price." }); }
                }}><Trash2 size={14} /></button>
              </div>
            </div>
          </ShelfTag>
        ))}
      </Panel>

      {showForm && <Modal title="Set a price" icon={<Tag size={16} />} onClose={() => !saving && setShowForm(false)}>
        <p className="pricing-note">Saving a price for the same product updates its current selling price.</p>
        <Message ok={msg?.ok} text={msg?.text} />
        <form onSubmit={handleSubmit}>
          <Field label="Product"><select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} autoFocus><option value="">Select a product...</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}</select></Field>
          <Field label="Unit price (TND)"><input type="number" min="0" step="0.001" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} placeholder="3.200" /></Field>
          <div className="modal-actions"><button type="button" className="btn" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Save price"}</button></div>
        </form>
      </Modal>}
    </div>
  );
}

function PromotionsTab({ products }) {
  const { request } = useApi();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({ productId: "", discountPercent: "", validFrom: "", validUntil: "" });
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState(null);
  const [actionMsg, setActionMsg] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await request("/api/pricing/promotions");
      setPromotions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Could not load promotions.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => { fetchPromotions(); }, [fetchPromotions]);

  const filteredPromotions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return promotions.filter((promotion) => {
      const product = productLabel(products, promotion.productId).toLowerCase();
      const matchesQuery = !normalizedQuery || product.includes(normalizedQuery);
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? promotion.active : !promotion.active);
      return matchesQuery && matchesStatus;
    });
  }, [promotions, products, query, statusFilter]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.productId) {
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
          productId: form.productId,
          discountPercent: Number(form.discountPercent),
          validFrom: new Date(form.validFrom).toISOString(),
          validUntil: new Date(form.validUntil).toISOString(),
        },
      });
      setCreateMsg({ ok: true, text: "Promotion created." });
      setForm({ productId: "", discountPercent: "", validFrom: "", validUntil: "" });
      setShowForm(false);
      fetchPromotions();
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
      fetchPromotions();
    } catch (err) {
      setActionMsg({ ok: false, text: err.message || "Could not deactivate the promotion." });
    }
  }

  return (
    <div>
      <Panel title="Promotion campaigns" icon={<Percent size={16} />} right={<div className="pricing-panel-actions"><button className="btn btn-primary btn-small" onClick={() => { setCreateMsg(null); setShowForm(true); }}><Plus size={13} /> Create promotion</button><button className="btn btn-small" onClick={fetchPromotions} disabled={loading}><RefreshCw size={13} /> Refresh</button></div>}>
        <Message ok={actionMsg?.ok} text={actionMsg?.text} />
        <Message ok={false} text={error} />
        <div className="promotion-toolbar">
          <label className="pricing-search"><Search size={14} /><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search product or SKU" aria-label="Search promotions" /></label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter promotions by status"><option value="all">All statuses</option><option value="active">Active only</option><option value="inactive">Inactive only</option></select>
        </div>
        {!error && promotions.length === 0 && !loading && <Empty>No promotions created yet.</Empty>}
        {promotions.length > 0 && filteredPromotions.length === 0 && <Empty>No promotions match the current filters.</Empty>}
        {filteredPromotions.map((promo) => (
          <ShelfTag key={promo.id}>
            <div className="tag-row">
              <div><div className="tag-name">{productLabel(products, promo.productId)}</div><div className="tag-sku">{promo.discountPercent}% discount</div></div>
              {promo.active ? <button className="btn btn-small" onClick={() => handleDeactivate(promo.id)}><XCircle size={13} /> Deactivate</button> : <Chip>Inactive</Chip>}
            </div>
            <div className="tag-meta"><Chip warn={promo.active}>{promo.active ? <><CheckCircle2 size={10} style={{ verticalAlign: -1, marginRight: 3 }} /> Active</> : "Inactive"}</Chip><Chip>{formatPromotionDate(promo.validFrom)} to {formatPromotionDate(promo.validUntil)}</Chip></div>
          </ShelfTag>
        ))}
      </Panel>

      {showForm && <Modal title="Create a promotion" icon={<Percent size={16} />} onClose={() => !creating && setShowForm(false)}>
        <Message ok={createMsg?.ok} text={createMsg?.text} />
        <form onSubmit={handleCreate}>
          <Field label="Product"><select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} autoFocus><option value="">Select a product...</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}</select></Field>
          <Field label="Discount (%)"><input type="number" min="0" max="100" step="0.01" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} placeholder="15" /></Field>
          <Field label="Valid from"><input type="datetime-local" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} /></Field>
          <Field label="Valid until"><input type="datetime-local" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} /></Field>
          <div className="modal-actions"><button type="button" className="btn" onClick={() => setShowForm(false)} disabled={creating}>Cancel</button><button type="submit" className="btn btn-primary" disabled={creating || !form.productId}>{creating ? "Creating..." : "Create promotion"}</button></div>
        </form>
      </Modal>}
    </div>
  );
}


function formatPromotionDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}
const pricingStyles = `
  .pricing-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 24px; }
  .pricing-action { display: flex; align-items: center; gap: 10px; min-width: 0; padding: 13px 14px; text-align: left; color: var(--ink); background: var(--surface); border: 1px solid var(--hairline); border-radius: 8px; cursor: pointer; }
  .pricing-action:hover { border-color: var(--green); background: #FBFCF8; }
  .pricing-action.active { color: var(--green-deep); border-color: var(--green); box-shadow: inset 0 -3px 0 var(--green); }
  .pricing-action > svg { flex-shrink: 0; color: var(--green); }
  .pricing-action span { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .pricing-action strong { font-size: 13px; }
  .pricing-action small { color: var(--ink-soft); font-size: 11px; }
  .pricing-panel-actions { display: flex; align-items: center; gap: 7px; }
  .pricing-search { display: flex; align-items: center; gap: 7px; margin-bottom: 14px; padding: 8px 10px; background: #FBFBF7; border: 1px solid var(--hairline-strong); border-radius: 6px; color: var(--ink-soft); }
  .pricing-search:focus-within { outline: 2px solid var(--green); outline-offset: 1px; }
  .pricing-search input { width: 100%; padding: 0; border: 0; outline: 0; background: transparent; color: var(--ink); font: inherit; font-size: 13px; }
  .pricing-row-actions { display: flex; align-items: center; gap: 10px; }
  .promotion-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  .promotion-toolbar .pricing-search { flex: 1; margin-bottom: 0; }
  .promotion-toolbar select { border: 1px solid var(--hairline-strong); border-radius: 6px; padding: 8px 9px; background: #FBFBF7; color: var(--ink); font: inherit; font-size: 12px; }
  .price-badge { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 15px; color: var(--green-deep); white-space: nowrap; }
  .pricing-note { margin: -8px 0 16px; color: var(--ink-soft); font-size: 13px; line-height: 1.5; }
  @media (max-width: 560px) { .pricing-actions { grid-template-columns: 1fr; } .pricing-panel-actions { align-items: stretch; flex-direction: column; } .promotion-toolbar { align-items: stretch; flex-direction: column; } }
`;