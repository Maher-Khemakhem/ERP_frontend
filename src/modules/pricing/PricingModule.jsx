import { useCallback, useEffect, useMemo, useState } from "react";
import { Tag, Percent, RefreshCw, XCircle, CheckCircle2, Plus, Search, Trash2, Package } from "lucide-react";
import { useApi } from "../../lib/apiClient.jsx";
import { ShelfTag, Field, Chip, Panel, Message, Empty, Modal } from "../../design/components.jsx";

function ProductThumb({ src, alt = "", size = 44 }) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div
        className="pricing-thumb-placeholder"
        style={{ width: size, height: size, minWidth: size }}
        aria-hidden="true"
      >
        <Package size={Math.max(14, Math.round(size * 0.42))} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || "Image du produit"}
      className="pricing-thumb-img"
      style={{ width: size, height: size, minWidth: size }}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}

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
      <h1 className="page-title">Tarification</h1>
      <p className="page-sub">Prix de base et promotions — ce que la caisse facture pour chaque article.</p>
      <style>{pricingStyles}</style>

      <div className="pricing-actions" role="toolbar" aria-label="Actions de tarification">
        <button type="button" className={`pricing-action ${tab === "prices" ? "active" : ""}`} onClick={() => setTab("prices")}>
          <Tag size={16} /><span><strong>Prix</strong><small>Prix de vente des produits</small></span>
        </button>
        <button type="button" className={`pricing-action ${tab === "promotions" ? "active" : ""}`} onClick={() => setTab("promotions")}>
          <Percent size={16} /><span><strong>Promotions</strong><small>Campagnes de remise</small></span>
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

  const selectedFormProduct = useMemo(
    () => products.find((p) => p.id === form.productId),
    [products, form.productId]
  );

  const filteredPrices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return prices;
    return prices.filter((row) => productLabel(products, row.productId).toLowerCase().includes(normalizedQuery));
  }, [prices, products, query]);

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await request("/api/pricing/prices");
      setPrices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Impossible de joindre le service de tarification.");
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
      setMsg({ ok: false, text: "Le produit et le prix sont obligatoires." });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await request("/api/pricing/prices", {
        method: "POST",
        body: { productId: form.productId, unitPrice: Number(form.unitPrice) },
      });
      setMsg({ ok: true, text: "Prix enregistré." });
      setForm({ productId: "", unitPrice: "" });
      setShowForm(false);
      fetchPrices();
    } catch (err) {
      setMsg({ ok: false, text: err.message || "Impossible d’enregistrer le prix." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Panel
        title="Prix actuels"
        icon={<Tag size={16} />}
        right={
          <div className="pricing-panel-actions">
            <button className="btn btn-primary btn-small" onClick={() => { setMsg(null); setShowForm(true); }}><Plus size={13} /> Définir un prix</button>
            <button className="btn btn-small" onClick={fetchPrices} disabled={loading}><RefreshCw size={13} /> Actualiser</button>
          </div>
        }
      >
        <Message ok={false} text={error} />
        <Message ok={msg?.ok} text={msg?.text} />
        <label className="pricing-search"><Search size={14} /><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un produit ou un SKU" aria-label="Rechercher des prix" /></label>
        {!error && prices.length === 0 && !loading && <Empty>Aucun prix défini pour le moment.</Empty>}
        {prices.length > 0 && filteredPrices.length === 0 && <Empty>Aucun prix ne correspond à « {query} ».</Empty>}
        {filteredPrices.map((row) => {
          const product = products.find((p) => p.id === row.productId);
          return (
            <ShelfTag key={row.productId}>
              <div className="tag-row">
                <div className="pricing-product-info">
                  <ProductThumb
                    src={product?.imageUrl || product?.familyImageUrl}
                    alt={product?.name}
                    size={46}
                  />
                  <div>
                    <div className="tag-name">{product ? product.name : row.productId}</div>
                    <div className="tag-sku">
                      {product ? `SKU : ${product.sku}${product.unitType === "WEIGHT" ? " · Au kg" : " · À l’unité"}` : row.productId}
                    </div>
                  </div>
                </div>
                <div className="pricing-row-actions">
                  <div className="price-badge">{row.unitPrice}</div>
                  <button
                    type="button"
                    className="btn-icon danger"
                    title="Supprimer le prix"
                    aria-label={`Supprimer le prix de ${productLabel(products, row.productId)}`}
                    onClick={async () => {
                      if (!window.confirm(`Supprimer le prix de ${productLabel(products, row.productId)} ?`)) return;
                      try {
                        await request(`/api/pricing/prices/${row.productId}`, { method: "DELETE" });
                        fetchPrices();
                      } catch (err) {
                        setMsg({ ok: false, text: err.message || "Impossible de supprimer le prix." });
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </ShelfTag>
          );
        })}
      </Panel>

      {showForm && (
        <Modal title="Définir un prix" icon={<Tag size={16} />} onClose={() => !saving && setShowForm(false)}>
          <p className="pricing-note">Enregistrer un prix pour le même produit met à jour son prix de vente actuel.</p>
          <Message ok={msg?.ok} text={msg?.text} />
          <form onSubmit={handleSubmit}>
            <Field label="Produit">
              <select
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
                autoFocus
              >
                <option value="">Sélectionner un produit…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </Field>

            {selectedFormProduct && (
              <div className="pricing-selected-preview">
                <ProductThumb
                  src={selectedFormProduct.imageUrl || selectedFormProduct.familyImageUrl}
                  alt={selectedFormProduct.name}
                  size={46}
                />
                <div>
                  <div className="preview-name">{selectedFormProduct.name}</div>
                  <div className="preview-sku">
                    SKU : <strong>{selectedFormProduct.sku}</strong> · {selectedFormProduct.unitType === "WEIGHT" ? "Vendu au poids (kg)" : "Vendu à l’unité"}
                  </div>
                </div>
              </div>
            )}

            <Field label="Prix unitaire (TND)">
              <input
                type="number"
                min="0"
                step="0.001"
                value={form.unitPrice}
                onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                placeholder="3.200"
              />
            </Field>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setShowForm(false)} disabled={saving}>
                Annuler
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Enregistrement…" : "Enregistrer le prix"}
              </button>
            </div>
          </form>
        </Modal>
      )}
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

  const selectedPromoProduct = useMemo(
    () => products.find((p) => p.id === form.productId),
    [products, form.productId]
  );

  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await request("/api/pricing/promotions");
      setPromotions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Impossible de charger les promotions.");
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
      setCreateMsg({ ok: false, text: "Sélectionnez d’abord un produit." });
      return;
    }
    if (!form.discountPercent || !form.validFrom || !form.validUntil) {
      setCreateMsg({ ok: false, text: "La remise, le début et la fin sont obligatoires." });
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
      setCreateMsg({ ok: true, text: "Promotion créée." });
      setForm({ productId: "", discountPercent: "", validFrom: "", validUntil: "" });
      setShowForm(false);
      fetchPromotions();
    } catch (err) {
      setCreateMsg({ ok: false, text: err.message || "Impossible de créer la promotion." });
    } finally {
      setCreating(false);
    }
  }

  async function handleDeactivate(promotionId) {
    setActionMsg(null);
    try {
      await request(`/api/pricing/promotions/${promotionId}`, { method: "DELETE" });
      setActionMsg({ ok: true, text: "Promotion désactivée." });
      fetchPromotions();
    } catch (err) {
      setActionMsg({ ok: false, text: err.message || "Impossible de désactiver la promotion." });
    }
  }

  return (
    <div>
      <Panel
        title="Campagnes promotionnelles"
        icon={<Percent size={16} />}
        right={
          <div className="pricing-panel-actions">
            <button className="btn btn-primary btn-small" onClick={() => { setCreateMsg(null); setShowForm(true); }}>
              <Plus size={13} /> Créer une promotion
            </button>
            <button className="btn btn-small" onClick={fetchPromotions} disabled={loading}>
              <RefreshCw size={13} /> Actualiser
            </button>
          </div>
        }
      >
        <Message ok={actionMsg?.ok} text={actionMsg?.text} />
        <Message ok={false} text={error} />
        <div className="promotion-toolbar">
          <label className="pricing-search"><Search size={14} /><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un produit ou un SKU" aria-label="Rechercher des promotions" /></label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filtrer les promotions par statut"><option value="all">Tous les statuts</option><option value="active">Actives uniquement</option><option value="inactive">Inactives uniquement</option></select>
        </div>
        {!error && promotions.length === 0 && !loading && <Empty>Aucune promotion créée pour le moment.</Empty>}
        {promotions.length > 0 && filteredPromotions.length === 0 && <Empty>Aucune promotion ne correspond aux filtres actuels.</Empty>}
        {filteredPromotions.map((promo) => {
          const product = products.find((p) => p.id === promo.productId);
          return (
            <ShelfTag key={promo.id}>
              <div className="tag-row">
                <div className="pricing-product-info">
                  <ProductThumb
                    src={product?.imageUrl || product?.familyImageUrl}
                    alt={product?.name}
                    size={46}
                  />
                  <div>
                    <div className="tag-name">{product ? product.name : promo.productId}</div>
                    <div className="tag-sku">{promo.discountPercent}% de remise {product ? `· ${product.sku}` : ""}</div>
                  </div>
                </div>
                {promo.active ? (
                  <button className="btn btn-small" onClick={() => handleDeactivate(promo.id)}><XCircle size={13} /> Désactiver</button>
                ) : (
                  <Chip>Inactive</Chip>
                )}
              </div>
              <div className="tag-meta">
                <Chip warn={promo.active}>{promo.active ? <><CheckCircle2 size={10} style={{ verticalAlign: -1, marginRight: 3 }} /> Active</> : "Inactive"}</Chip>
                <Chip>Du {formatPromotionDate(promo.validFrom)} au {formatPromotionDate(promo.validUntil)}</Chip>
              </div>
            </ShelfTag>
          );
        })}
      </Panel>

      {showForm && (
        <Modal title="Créer une promotion" icon={<Percent size={16} />} onClose={() => !creating && setShowForm(false)}>
          <Message ok={createMsg?.ok} text={createMsg?.text} />
          <form onSubmit={handleCreate}>
            <Field label="Produit">
              <select
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
                autoFocus
              >
                <option value="">Sélectionner un produit…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </Field>

            {selectedPromoProduct && (
              <div className="pricing-selected-preview">
                <ProductThumb
                  src={selectedPromoProduct.imageUrl || selectedPromoProduct.familyImageUrl}
                  alt={selectedPromoProduct.name}
                  size={46}
                />
                <div>
                  <div className="preview-name">{selectedPromoProduct.name}</div>
                  <div className="preview-sku">SKU : <strong>{selectedPromoProduct.sku}</strong></div>
                </div>
              </div>
            )}

            <Field label="Remise (%)"><input type="number" min="0" max="100" step="0.01" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} placeholder="15" /></Field>
            <Field label="Valide à partir du"><input type="datetime-local" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} /></Field>
            <Field label="Valide jusqu’au"><input type="datetime-local" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} /></Field>
            <div className="modal-actions"><button type="button" className="btn" onClick={() => setShowForm(false)} disabled={creating}>Annuler</button><button type="submit" className="btn btn-primary" disabled={creating || !form.productId}>{creating ? "Création…" : "Créer la promotion"}</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function formatPromotionDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
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
  .pricing-product-info { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .pricing-selected-preview { display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: #F9FAF7; border: 1px solid var(--hairline); border-radius: 8px; margin-bottom: 14px; }
  .preview-name { font-weight: 600; font-size: 13.5px; color: var(--ink); }
  .preview-sku { font-size: 11.5px; color: var(--ink-soft); margin-top: 2px; }
  .pricing-thumb-img { border-radius: 8px; object-fit: cover; border: 1px solid var(--hairline); background: #fff; flex-shrink: 0; }
  .pricing-thumb-placeholder { border-radius: 8px; border: 1px solid var(--hairline); background: #F1F4EE; color: var(--ink-soft); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .promotion-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  .promotion-toolbar .pricing-search { flex: 1; margin-bottom: 0; }
  .promotion-toolbar select { border: 1px solid var(--hairline-strong); border-radius: 6px; padding: 8px 9px; background: #FBFBF7; color: var(--ink); font: inherit; font-size: 12px; }
  .price-badge { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 15px; color: var(--green-deep); white-space: nowrap; }
  .pricing-note { margin: -8px 0 16px; color: var(--ink-soft); font-size: 13px; line-height: 1.5; }
  @media (max-width: 560px) { .pricing-actions { grid-template-columns: 1fr; } .pricing-panel-actions { align-items: stretch; flex-direction: column; } .promotion-toolbar { align-items: stretch; flex-direction: column; } }
`;
