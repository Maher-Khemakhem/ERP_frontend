import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  RefreshCw,
  AlertTriangle,
  Truck,
  Boxes,
  Search,
  Trash2,
  Calendar,
  Layers,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  PackageCheck,
  AlertCircle,
  X,
  History,
  Tag,
  Check,
  ImagePlus,
  Package,
} from "lucide-react";
import { useApi } from "../../lib/apiClient.jsx";
import { ShelfTag, Field, Chip, Panel, Message, Empty, Modal } from "../../design/components.jsx";

function ProductThumb({ src, alt = "", size = 44, className = "" }) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div
        className={`product-thumb-placeholder ${className}`.trim()}
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
      className={`product-thumb-img ${className}`.trim()}
      style={{ width: size, height: size, minWidth: size }}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}

export default function InventoryModule() {
  const { request } = useApi();
  const [tab, setTab] = useState("products"); // "products" | "stock"

  const [products, setProducts] = useState([]);
  const [families, setFamilies] = useState([]);
  const [stockSummaries, setStockSummaries] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");

  // Modal states
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [receiveTargetProduct, setReceiveTargetProduct] = useState(null);
  const [recentDeliveriesOpen, setRecentDeliveriesOpen] = useState(false);

  // Track recent receipts in this browser session
  const [recentReceipts, setRecentReceipts] = useState(() => {
    try {
      const saved = sessionStorage.getItem("erp_recent_receipts");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveReceipt = useCallback((receipt) => {
    setRecentReceipts((prev) => {
      const updated = [receipt, ...prev].slice(0, 20);
      try {
        sessionStorage.setItem("erp_recent_receipts", JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
      return updated;
    });
  }, []);

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError("");
    try {
      const data = await request("/api/inventory/products");
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setProductsError(err.message || "Impossible de joindre le service de stock.");
    } finally {
      setProductsLoading(false);
    }
  }, [request]);

  const fetchFamilies = useCallback(async () => {
    try {
      const data = await request("/api/inventory/product-families");
      setFamilies(Array.isArray(data) ? data : []);
    } catch {
      setFamilies([]);
    }
  }, [request]);

  const fetchStockSummaries = useCallback(async () => {
    try {
      const data = await request("/api/inventory/stock");
      setStockSummaries(Array.isArray(data) ? data : []);
    } catch {
      setStockSummaries([]);
    }
  }, [request]);

  const refreshAll = useCallback(() => {
    fetchProducts();
    fetchFamilies();
    fetchStockSummaries();
  }, [fetchFamilies, fetchProducts, fetchStockSummaries]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Open Receive Stock modal for a specific product or null
  const handleOpenReceive = useCallback((productOrId = null) => {
    if (!productOrId) {
      setReceiveTargetProduct(null);
    } else if (typeof productOrId === "string") {
      const found = products.find((p) => p.id === productOrId);
      setReceiveTargetProduct(found || { id: productOrId });
    } else {
      setReceiveTargetProduct(productOrId);
    }
    setReceiveModalOpen(true);
  }, [products]);

  // Compute top-level summary metrics
  const stats = useMemo(() => {
    const total = products.length;
    const perishableCount = products.filter((p) => p.perishable).length;
    const weightCount = products.filter((p) => p.unitType === "WEIGHT").length;

    let outOfStockCount = 0;
    let lowStockCount = 0;
    let expiringSoonCount = 0;

    const today = new Date();
    stockSummaries.forEach((s) => {
      if (s.status === "OUT_OF_STOCK") outOfStockCount++;
      else if (s.status === "LOW_STOCK") lowStockCount++;

      if (s.earliestExpiryDate) {
        const days = (new Date(s.earliestExpiryDate) - today) / (1000 * 60 * 60 * 24);
        if (days <= 7) expiringSoonCount++;
      }
    });

    return { total, perishableCount, weightCount, outOfStockCount, lowStockCount, expiringSoonCount };
  }, [products, stockSummaries]);

  return (
    <div>
      <style>{moduleStyles}</style>
      <div className="inventory-header-row">
        <div>
          <h1 className="page-title">Stock</h1>
          <p className="page-sub">Produits, lots et niveaux de stock en temps réel — gérés avec précision.</p>
        </div>
        <div className="inventory-top-actions">
          {recentReceipts.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setRecentDeliveriesOpen(true)}
              title="Voir les réceptions de cette session"
            >
              <History size={15} />
              <span>Réceptions récentes ({recentReceipts.length})</span>
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleOpenReceive(null)}
          >
            <Truck size={15} />
            <span>Réceptionner du stock</span>
          </button>
        </div>
      </div>

      <div className="inventory-summary" aria-label="Résumé du stock">
        <div className="summary-stat-card">
          <span>Produits</span>
          <strong>{stats.total}</strong>
        </div>
        <div className={`summary-stat-card ${stats.outOfStockCount > 0 ? "highlight-danger" : ""}`}>
          <span>Rupture de stock</span>
          <strong className={stats.outOfStockCount > 0 ? "text-danger" : ""}>{stats.outOfStockCount}</strong>
        </div>
        <div className={`summary-stat-card ${stats.lowStockCount > 0 ? "highlight-warn" : ""}`}>
          <span>Stock faible</span>
          <strong className={stats.lowStockCount > 0 ? "text-warn" : ""}>{stats.lowStockCount}</strong>
        </div>
        <div className="summary-stat-card">
          <span>Produits périssables</span>
          <strong>{stats.perishableCount}</strong>
        </div>
      </div>

      <div className="inventory-actions" role="toolbar" aria-label="Vues du stock">
        <button
          type="button"
          className={`inventory-action ${tab === "products" ? "active" : ""}`}
          onClick={() => setTab("products")}
        >
          <Boxes size={16} />
            <span><strong>Catalogue produits</strong><small>Variantes, familles et unités de prix</small></span>
        </button>

        <button
          type="button"
          className={`inventory-action ${tab === "stock" ? "active" : ""}`}
          onClick={() => setTab("stock")}
        >
          <Search size={16} />
          <span>
            <strong>Niveaux de stock</strong>
            <small>
              {stats.lowStockCount > 0 ? `${stats.lowStockCount} articles à réapprovisionner` : "Vérifier les quantités et les dates FEFO"}
            </small>
          </span>
        </button>
      </div>

      {tab === "products" && (
        <ProductsTab
          products={products}
          families={families}
          loading={productsLoading}
          error={productsError}
          onRefresh={refreshAll}
          onCreated={refreshAll}
          onOpenReceive={handleOpenReceive}
          onViewStock={(productId) => setTab("stock")}
        />
      )}

      {tab === "stock" && (
        <StockTab
          products={products}
          families={families}
          stockSummaries={stockSummaries}
          loading={productsLoading}
          onRefresh={fetchStockSummaries}
          onOpenReceive={handleOpenReceive}
        />
      )}

      {/* RECEIVE STOCK MODAL */}
      {receiveModalOpen && (
        <ReceiveStockModal
          products={products}
          families={families}
          stockSummaries={stockSummaries}
          initialProduct={receiveTargetProduct}
          onClose={() => setReceiveModalOpen(false)}
          onSuccess={(receipt) => {
            saveReceipt(receipt);
            fetchStockSummaries();
          }}
        />
      )}

      {/* RECENT DELIVERIES DRAWER / MODAL */}
      {recentDeliveriesOpen && (
        <Modal
          title="Réceptions récentes (cette session)"
          icon={<History size={16} />}
          onClose={() => setRecentDeliveriesOpen(false)}
        >
          <div className="recent-deliveries-modal-content">
            <p className="sidebar-description">
              Réceptions enregistrées dans cette session du navigateur. Les lots dont la date d’expiration est la plus proche sont déduits en premier à la caisse.
            </p>
            <div className="recent-list">
              {recentReceipts.map((r) => (
                <div key={r.id} className="recent-item">
                  <div className="recent-item-header">
                    <strong className="recent-product-name">{r.productName}</strong>
                    <span className="recent-time">{r.timestamp}</span>
                  </div>
                  <div className="recent-item-details">
                    <span className="recent-qty">
                      +{r.quantity} {r.unitType === "WEIGHT" ? "kg" : "unités"}
                    </span>
                    <span className="recent-lot">{r.lotNumber}</span>
                  </div>
                  <div className="recent-item-meta">
                    {r.expiryDate ? <span>Exp. : {r.expiryDate}</span> : <span>Sans expiration</span>}
                    {r.supplierReference && <span>Réf. : {r.supplierReference}</span>}
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setRecentDeliveriesOpen(false)}
              >
                Fermer
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. RECEIVE STOCK MODAL (FOCUSED & USER FRIENDLY)
// ---------------------------------------------------------------------------
function ReceiveStockModal({ products, families, stockSummaries, initialProduct, onClose, onSuccess }) {
  const { request } = useApi();
  const [selectedProductId, setSelectedProductId] = useState(initialProduct?.id || "");
  const [productSearch, setProductSearch] = useState("");
  const [isChangingProduct, setIsChangingProduct] = useState(!initialProduct?.id);

  const [form, setForm] = useState({
    lotNumber: "",
    quantityValue: "",
    expiryDate: "",
    supplierReference: "",
    unitCost: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  const unitType = selectedProduct?.unitType;
  const isPerishable = selectedProduct?.perishable;

  const currentStock = useMemo(() => {
    const s = stockSummaries.find((s) => s.productId === selectedProductId);
    return s ? Number(s.totalQuantity) : 0;
  }, [stockSummaries, selectedProductId]);

  // Filter products for modal picker
  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products.slice(0, 15);
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .slice(0, 20);
  }, [products, productSearch]);

  function handleSelectProduct(p) {
    setSelectedProductId(p.id);
    setIsChangingProduct(false);
    setErrorMsg("");
    setSuccessMsg("");
  }

  function addQuantity(amount) {
    const current = Number(form.quantityValue) || 0;
    const next = current + amount;
    setForm((prev) => ({
      ...prev,
      quantityValue: unitType === "WEIGHT" ? next.toFixed(3).replace(/\.?0+$/, "") : String(Math.round(next)),
    }));
  }

  function setDateOffset(days = 0, months = 0) {
    const d = new Date();
    if (months > 0) d.setMonth(d.getMonth() + months);
    if (days > 0) d.setDate(d.getDate() + days);
    const iso = d.toISOString().slice(0, 10);
    setForm((prev) => ({ ...prev, expiryDate: iso }));
  }

  function generateAutoLot() {
    const now = new Date();
    const datePart = now.toISOString().slice(2, 10).replace(/-/g, "");
    const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    setForm((prev) => ({ ...prev, lotNumber: `LOT-${datePart}-${randPart}` }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedProductId) {
      setErrorMsg("Veuillez choisir un produit à réceptionner.");
      return;
    }
    if (!form.quantityValue || Number(form.quantityValue) <= 0) {
      setErrorMsg("La quantité doit être supérieure à zéro.");
      return;
    }
    if (unitType === "EACH" && !Number.isInteger(Number(form.quantityValue))) {
      setErrorMsg("Ce produit est vendu à l’unité (EACH) : la quantité doit être un nombre entier.");
      return;
    }
    if (isPerishable && !form.expiryDate) {
      setErrorMsg("La date d’expiration est obligatoire pour les produits périssables afin d’appliquer la rotation FEFO.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const generatedLot = form.lotNumber.trim() || `LOT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      await request("/api/inventory/receive-stock", {
        method: "POST",
        body: {
          productId: selectedProductId,
          lotNumber: generatedLot,
          quantityValue: Number(form.quantityValue),
          unitType,
          expiryDate: form.expiryDate || null,
          receivedDate: null,
          supplierReference: form.supplierReference.trim() || null,
          unitCost: form.unitCost ? Number(form.unitCost) : null,
        },
      });

      const qtyDisplay = `${form.quantityValue} ${unitType === "WEIGHT" ? "kg" : "unités"}`;
      const receipt = {
        id: Math.random().toString(),
        productId: selectedProductId,
        productName: selectedProduct?.name || "Produit",
        sku: selectedProduct?.sku || "",
        quantity: form.quantityValue,
        unitType,
        lotNumber: generatedLot,
        expiryDate: form.expiryDate || null,
        unitCost: form.unitCost || null,
        supplierReference: form.supplierReference || null,
        timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      };

      onSuccess(receipt);
      setSuccessMsg(`${qtyDisplay} réceptionnés pour « ${selectedProduct?.name} ». Lot ${generatedLot} créé.`);

      // Reset form after short delay or keep open for another receipt
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message || "Impossible de réceptionner le stock.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Réceptionner du stock"
      icon={<Truck size={16} />}
      onClose={onClose}
    >
      <div className="receive-modal-body">
        {errorMsg && <Message ok={false} text={errorMsg} />}
        {successMsg && <Message ok={true} text={successMsg} />}

        {/* 1. PRODUCT SELECTION */}
        {!selectedProduct || isChangingProduct ? (
          <div className="modal-product-picker">
            <label className="field-label">Rechercher et sélectionner un produit</label>
            <div className="modal-search-box">
              <Search size={14} className="picker-search-icon" />
              <input
                type="search"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Rechercher un nom ou un SKU/code-barres…"
                autoFocus
              />
              {selectedProduct && (
                <button
                  type="button"
                  className="btn btn-small"
                  onClick={() => setIsChangingProduct(false)}
                >
                  Conserver {selectedProduct.name}
                </button>
              )}
            </div>

            <div className="modal-picker-list">
              {filteredProducts.length === 0 ? (
                <div className="picker-empty">Aucun produit correspondant trouvé.</div>
              ) : (
                filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`modal-picker-item ${p.id === selectedProductId ? "selected" : ""}`}
                    onClick={() => handleSelectProduct(p)}
                  >
                    <div className="picker-item-left">
                      <ProductThumb src={p.imageUrl || p.familyImageUrl} alt={p.name} size={36} />
                      <div className="picker-item-main">
                        <span className="picker-item-name">{p.name}</span>
                      <span className="picker-item-sku">SKU : {p.sku}</span>
                      </div>
                    </div>
                    <div className="picker-item-badges">
                      {p.familyName && <span className="mini-chip">{p.familyName}</span>}
                      <span className="mini-chip">{p.unitType === "WEIGHT" ? "kg" : "unités"}</span>
                      {p.perishable && <span className="mini-chip warn">Périssable</span>}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="modal-selected-product">
            <div className="selected-product-header">
              <div className="selected-product-title-group">
                <ProductThumb
                  src={selectedProduct.imageUrl || selectedProduct.familyImageUrl}
                  alt={selectedProduct.name}
                  size={48}
                />
                <div>
                  <div className="selected-product-name">{selectedProduct.name}</div>
                  <div className="selected-product-sub">
                    SKU : <strong>{selectedProduct.sku}</strong>
                    {selectedProduct.familyName && ` · Catégorie : ${selectedProduct.familyName}`}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-small btn-secondary"
                onClick={() => setIsChangingProduct(true)}
              >
                Modifier
              </button>
            </div>

            <div className="modal-metric-chips">
              <div className="metric-chip">
                <span className="metric-lbl">Unité</span>
                <strong>{unitType === "WEIGHT" ? "Poids (kg)" : "Unité (pièce)"}</strong>
              </div>
              <div className="metric-chip">
                <span className="metric-lbl">En stock</span>
                <strong>{currentStock} {unitType === "WEIGHT" ? "kg" : "unités"}</strong>
              </div>
              <div className="metric-chip">
                <span className="metric-lbl">Seuil de réapprovisionnement</span>
                <strong>{selectedProduct.reorderPoint}</strong>
              </div>
              <div className="metric-chip">
                <span className="metric-lbl">Périssable</span>
                <strong className={isPerishable ? "text-warn" : ""}>
                  {isPerishable ? "Oui (expiration obligatoire)" : "Non"}
                </strong>
              </div>
            </div>

            {isPerishable && (
              <div className="perishable-alert-banner">
                <AlertTriangle size={14} />
                <span>Produit périssable : la date d’expiration est obligatoire pour la déduction FEFO du stock.</span>
              </div>
            )}
          </div>
        )}

        {/* 2. RECEIPT FORM */}
        {selectedProduct && !isChangingProduct && (
          <form onSubmit={handleSubmit} className="modal-receive-form">
            {/* Quantity */}
            <div className="form-group-card">
              <div className="group-title">
                <span>Quantité à réceptionner</span>
                <span className="group-hint">
                  {unitType === "WEIGHT" ? "Kilogrammes (3 décimales autorisées)" : "Unités entières uniquement"}
                </span>
              </div>
              <div className="quantity-input-row">
                <input
                  type="number"
                  min={unitType === "WEIGHT" ? "0.001" : "1"}
                  step={unitType === "WEIGHT" ? "0.001" : "1"}
                  value={form.quantityValue}
                  onChange={(e) => setForm({ ...form, quantityValue: e.target.value })}
                  placeholder={unitType === "WEIGHT" ? "ex. 15,500" : "ex. 4"}
                  className="large-number-input"
                  required
                  autoFocus
                />
                <span className="quantity-unit-label">{unitType === "WEIGHT" ? "kg" : "unités"}</span>
              </div>

              <div className="preset-buttons-row">
                <span className="preset-label">Ajout rapide :</span>
                {unitType === "WEIGHT" ? (
                  <>
                    <button type="button" className="preset-btn" onClick={() => addQuantity(1)}>+1 kg</button>
                    <button type="button" className="preset-btn" onClick={() => addQuantity(5)}>+5 kg</button>
                    <button type="button" className="preset-btn" onClick={() => addQuantity(10)}>+10 kg</button>
                    <button type="button" className="preset-btn" onClick={() => addQuantity(25)}>+25 kg</button>
                  </>
                ) : (
                  <>
                    <button type="button" className="preset-btn" onClick={() => addQuantity(1)}>+1</button>
                    <button type="button" className="preset-btn" onClick={() => addQuantity(6)}>+6</button>
                    <button type="button" className="preset-btn" onClick={() => addQuantity(12)}>+12 (carton)</button>
                    <button type="button" className="preset-btn" onClick={() => addQuantity(24)}>+24 (case)</button>
                    <button type="button" className="preset-btn" onClick={() => addQuantity(50)}>+50</button>
                  </>
                )}
                {form.quantityValue && (
                  <button
                    type="button"
                    className="preset-btn clear"
                    onClick={() => setForm({ ...form, quantityValue: "" })}
                  >
                    Effacer
                  </button>
                )}
              </div>
            </div>

            {/* Expiry Date */}
            <div className="form-group-card">
              <div className="group-title">
                <span className="flex-center-gap">
                  <Calendar size={13} />
                  Date d’expiration
                  {isPerishable ? (
                    <span className="badge-required">Obligatoire</span>
                  ) : (
                    <span className="badge-optional">Facultatif</span>
                  )}
                </span>
                <span className="group-hint">Priorité FEFO</span>
              </div>
              <input
                type="date"
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                className="field-date-input"
                required={isPerishable}
              />
              <div className="preset-buttons-row">
                <span className="preset-label">Raccourcis :</span>
                <button type="button" className="preset-btn" onClick={() => setDateOffset(7, 0)}>+7 jours</button>
                <button type="button" className="preset-btn" onClick={() => setDateOffset(0, 1)}>+1 mois</button>
                <button type="button" className="preset-btn" onClick={() => setDateOffset(0, 3)}>+3 mois</button>
                <button type="button" className="preset-btn" onClick={() => setDateOffset(0, 6)}>+6 mois</button>
                <button type="button" className="preset-btn" onClick={() => setDateOffset(0, 12)}>+1 an</button>
              </div>
            </div>

            {/* Traceability */}
            <div className="form-two-cols">
              <Field label="Numéro de lot">
                <div className="input-with-action">
                  <input
                    type="text"
                    value={form.lotNumber}
                    onChange={(e) => setForm({ ...form, lotNumber: e.target.value })}
                    placeholder="Automatique si vide"
                  />
                  <button type="button" className="btn btn-small" onClick={generateAutoLot} title="Générer automatiquement le code">
                    <Sparkles size={12} /> Auto
                  </button>
                </div>
              </Field>

              <Field label="Référence fournisseur">
                <input
                  type="text"
                  value={form.supplierReference}
                  onChange={(e) => setForm({ ...form, supplierReference: e.target.value })}
                  placeholder="N° commande ou facture"
                />
              </Field>
            </div>

            {/* Cost */}
            <Field label="Coût d’achat unitaire (TND, facultatif)">
              <input
                type="number"
                min="0"
                step="0.001"
                value={form.unitCost}
                onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
                placeholder="0.000"
              />
            </Field>

            <div className="modal-actions">
              <button type="button" className="btn" onClick={onClose} disabled={submitting}>
                Annuler
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Réception…" : "Confirmer et réceptionner"}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// 2. STOCK LEVELS TAB
// ---------------------------------------------------------------------------
function StockTab({ products, families, stockSummaries, loading, onRefresh, onOpenReceive }) {
  const { request } = useApi();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, LOW_STOCK, OUT_OF_STOCK, EXPIRING_SOON
  const [familyFilter, setFamilyFilter] = useState("ALL");

  // Detailed modal state for a single product
  const [inspectProductId, setInspectProductId] = useState(null);
  const [inspectStock, setInspectStock] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectError, setInspectError] = useState("");

  // Load detailed lots whenever inspectProductId changes
  useEffect(() => {
    if (!inspectProductId) {
      setInspectStock(null);
      return;
    }
    let isMounted = true;
    setInspectLoading(true);
    setInspectError("");

    request(`/api/inventory/stock/${inspectProductId}`)
      .then((data) => {
        if (isMounted) setInspectStock(data);
      })
      .catch((err) => {
        if (isMounted) setInspectError(err.message || "Impossible de récupérer les détails du stock.");
      })
      .finally(() => {
        if (isMounted) setInspectLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [inspectProductId, request]);

  // Combine products with their stock summaries
  const combinedStockList = useMemo(() => {
    const summaryMap = new Map(stockSummaries.map((s) => [s.productId, s]));

    return products.map((p) => {
      const summary = summaryMap.get(p.id);
      const totalQuantity = summary ? Number(summary.totalQuantity) : 0;
      const lotCount = summary ? summary.lotCount : 0;
      const earliestExpiry = summary ? summary.earliestExpiryDate : null;

      let status = "OUT_OF_STOCK";
      if (totalQuantity > p.reorderPoint) {
        status = "IN_STOCK";
      } else if (totalQuantity > 0) {
        status = "LOW_STOCK";
      }

      const daysUntilEarliestExpiry = earliestExpiry
        ? Math.ceil((new Date(earliestExpiry) - new Date()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        product: p,
        totalQuantity,
        lotCount,
        earliestExpiry,
        daysUntilEarliestExpiry,
        status,
        isExpiringSoon: daysUntilEarliestExpiry !== null && daysUntilEarliestExpiry <= 7,
      };
    });
  }, [products, stockSummaries]);

  // Filter combined list
  const filteredList = useMemo(() => {
    const q = query.trim().toLowerCase();
    return combinedStockList.filter((item) => {
      const { product } = item;
      const matchQuery =
        !q ||
        product.name.toLowerCase().includes(q) ||
        product.sku.toLowerCase().includes(q) ||
        (product.familyName && product.familyName.toLowerCase().includes(q));

      const matchFamily = familyFilter === "ALL" || product.familyId === familyFilter;

      let matchStatus = true;
      if (statusFilter === "LOW_STOCK") matchStatus = item.status === "LOW_STOCK";
      else if (statusFilter === "OUT_OF_STOCK") matchStatus = item.status === "OUT_OF_STOCK";
      else if (statusFilter === "EXPIRING_SOON") matchStatus = item.isExpiringSoon;

      return matchQuery && matchFamily && matchStatus;
    });
  }, [combinedStockList, query, familyFilter, statusFilter]);

  // Counts for filter pills
  const counts = useMemo(() => {
    let low = 0;
    let out = 0;
    let expiring = 0;
    combinedStockList.forEach((item) => {
      if (item.status === "LOW_STOCK") low++;
      if (item.status === "OUT_OF_STOCK") out++;
      if (item.isExpiringSoon) expiring++;
    });
    return { all: combinedStockList.length, low, out, expiring };
  }, [combinedStockList]);

  const inspectedProduct = useMemo(
    () => products.find((p) => p.id === inspectProductId),
    [products, inspectProductId]
  );

  // Sorted lots for inspected product (FEFO)
  const sortedLots = useMemo(() => {
    if (!inspectStock?.lots) return [];
    return [...inspectStock.lots].sort((a, b) => {
      if (!a.expiryDate && !b.expiryDate) return 0;
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return a.expiryDate.localeCompare(b.expiryDate);
    });
  }, [inspectStock]);

  return (
    <div>
      <Panel
        title="Niveaux de stock et suivi des expirations"
        icon={<Search size={16} />}
        right={
          <div className="inventory-panel-actions">
            <button className="btn btn-small" onClick={onRefresh} disabled={loading}>
              <RefreshCw size={13} /> Actualiser
            </button>
            <button
              className="btn btn-primary btn-small"
              onClick={() => onOpenReceive(null)}
            >
              <Truck size={13} /> Réceptionner du stock
            </button>
          </div>
        }
      >
        {/* FILTER TOOLBAR */}
        <div className="stock-filter-toolbar">
          <div className="stock-search-wrap">
            <Search size={14} className="stock-search-icon" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrer par nom, SKU ou catégorie…"
              aria-label="Filtrer les articles en stock"
            />
            {query && (
              <button type="button" className="btn-icon" onClick={() => setQuery("")}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className="stock-status-pills">
            <button
              type="button"
              className={`status-pill ${statusFilter === "ALL" ? "active" : ""}`}
              onClick={() => setStatusFilter("ALL")}
            >
              Tous les articles ({counts.all})
            </button>
            <button
              type="button"
              className={`status-pill warn ${statusFilter === "LOW_STOCK" ? "active" : ""}`}
              onClick={() => setStatusFilter("LOW_STOCK")}
            >
              <AlertTriangle size={12} />
              Stock faible ({counts.low})
            </button>
            <button
              type="button"
              className={`status-pill danger ${statusFilter === "OUT_OF_STOCK" ? "active" : ""}`}
              onClick={() => setStatusFilter("OUT_OF_STOCK")}
            >
              <AlertCircle size={12} />
              Rupture de stock ({counts.out})
            </button>
            <button
              type="button"
              className={`status-pill purple ${statusFilter === "EXPIRING_SOON" ? "active" : ""}`}
              onClick={() => setStatusFilter("EXPIRING_SOON")}
            >
              <Clock size={12} />
              Expiration prochaine ({counts.expiring})
            </button>
          </div>
        </div>

        {families.length > 0 && (
          <div className="stock-family-row">
            <span className="family-label">Catégorie :</span>
            <button
              type="button"
              className={`filter-pill ${familyFilter === "ALL" ? "active" : ""}`}
              onClick={() => setFamilyFilter("ALL")}
            >
              All
            </button>
            {families.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`filter-pill ${familyFilter === f.id ? "active" : ""}`}
                onClick={() => setFamilyFilter(f.id)}
              >
                {f.name}
              </button>
            ))}
          </div>
        )}

        {filteredList.length === 0 ? (
          <Empty>Aucun article ne correspond aux filtres actifs.</Empty>
        ) : (
          <div className="stock-cards-grid">
            {filteredList.map((item) => {
              const { product, totalQuantity, lotCount, earliestExpiry, daysUntilEarliestExpiry, status } = item;
              const unitLabel = product.unitType === "WEIGHT" ? "kg" : "unités";
              const reorderRatio = product.reorderPoint > 0
                ? Math.min(100, Math.round((totalQuantity / product.reorderPoint) * 100))
                : 100;

              return (
                <div key={product.id} className={`stock-card ${status.toLowerCase()}`}>
                  <div className="stock-card-top">
                    <div className="stock-card-product-info">
                      <ProductThumb
                        src={product.imageUrl || product.familyImageUrl}
                        alt={product.name}
                        size={44}
                      />
                      <div>
                        <div className="stock-card-name">{product.name}</div>
                        <div className="stock-card-sku">SKU: {product.sku}</div>
                      </div>
                    </div>
                    {status === "OUT_OF_STOCK" ? (
                      <span className="stock-badge danger">Rupture de stock</span>
                    ) : status === "LOW_STOCK" ? (
                      <span className="stock-badge warn">Stock faible</span>
                    ) : (
                      <span className="stock-badge ok">Satisfaisant</span>
                    )}
                  </div>

                  <div className="stock-card-body">
                    <div className="stock-level-display">
                      <span className="stock-level-num">{totalQuantity}</span>
                      <span className="stock-level-unit">{unitLabel} en stock</span>
                    </div>

                    <div className="stock-progress-bar-wrap">
                      <div
                        className={`stock-progress-bar ${status.toLowerCase()}`}
                        style={{ width: `${reorderRatio}%` }}
                      />
                    </div>
                    <div className="stock-reorder-legend">
                      <span>Seuil de réapprovisionnement : {product.reorderPoint} {unitLabel}</span>
                      <span>{lotCount} {lotCount === 1 ? "lot" : "lots"}</span>
                    </div>

                    {/* Expiry Badge */}
                    {product.perishable && (
                      <div className="stock-expiry-line">
                        {earliestExpiry ? (
                          daysUntilEarliestExpiry <= 0 ? (
                            <span className="expiry-pill expired">
                              <AlertTriangle size={11} /> Expiré ({earliestExpiry})
                            </span>
                          ) : daysUntilEarliestExpiry <= 7 ? (
                            <span className="expiry-pill urgent">
                              <Clock size={11} /> Expiration la plus proche : {earliestExpiry} ({daysUntilEarliestExpiry} j restants)
                            </span>
                          ) : (
                            <span className="expiry-pill normal">
                              <Calendar size={11} /> Expiration la plus proche : {earliestExpiry}
                            </span>
                          )
                        ) : (
                          <span className="expiry-pill none">Aucun lot actif</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="stock-card-actions">
                    <button
                      type="button"
                      className="btn btn-small"
                      onClick={() => setInspectProductId(product.id)}
                    >
                      <Layers size={13} /> Voir les lots ({lotCount})
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-small"
                      onClick={() => onOpenReceive(product)}
                    >
                      <Truck size={13} /> Réceptionner
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* LOT DETAILS MODAL */}
      {inspectProductId && (
        <Modal
          title={inspectedProduct ? `Lots : ${inspectedProduct.name}` : "Détails du stock"}
          icon={<Layers size={16} />}
          onClose={() => setInspectProductId(null)}
        >
          {inspectLoading && <div className="modal-loading">Chargement des détails des lots…</div>}
          <Message ok={false} text={inspectError} />

          {inspectStock && (
            <div className="lot-details-content">
              <div className="lot-summary-header">
                <div className="lot-summary-product-info">
                  <ProductThumb
                    src={inspectedProduct?.imageUrl || inspectedProduct?.familyImageUrl}
                    alt={inspectedProduct?.name}
                    size={46}
                  />
                  <div>
                    <div className="lot-product-name">{inspectedProduct?.name}</div>
                  <div className="lot-product-sku">SKU : {inspectedProduct?.sku}</div>
                    <div className="lot-total-stat">
                      <strong>{inspectStock.totalQuantity}</strong>
                      <span>{inspectedProduct?.unitType === "WEIGHT" ? "kg" : "unités"} en stock</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-small"
                  onClick={() => {
                    const p = inspectedProduct;
                    setInspectProductId(null);
                    onOpenReceive(p);
                  }}
                >
                  <Truck size={13} /> Réceptionner davantage
                </button>
              </div>

              <div className="fefo-banner">
                <Sparkles size={14} className="fefo-banner-icon" />
                <div>
                  <strong>Rotation premier expiré, premier sorti (FEFO) activée</strong>
                  <p>Les lots sont triés chronologiquement par date d’expiration. La caisse déduira d’abord le stock du lot n°1.</p>
                </div>
              </div>

              {sortedLots.length === 0 ? (
                <Empty>Aucun lot de stock actif pour ce produit. Réceptionnez une livraison pour initialiser le stock.</Empty>
              ) : (
                <div className="lots-list">
                  {sortedLots.map((lot, idx) => {
                    const isFirst = idx === 0;
                    const daysLeft = lot.expiryDate
                      ? Math.ceil((new Date(lot.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
                      : null;

                    return (
                      <div key={lot.id} className={`lot-card ${isFirst ? "fefo-first" : ""}`}>
                        <div className="lot-card-header">
                          <div className="lot-identity">
                            <span className="lot-code">{lot.lotNumber || `LOT-${lot.id.slice(0, 8)}`}</span>
                            {isFirst && sortedLots.length > 1 && (
                              <span className="fefo-first-badge">🎯 Vendu ensuite (priorité FEFO)</span>
                            )}
                          </div>
                          <div className="lot-quantity">
                            {lot.quantity} {inspectedProduct?.unitType === "WEIGHT" ? "kg" : "unités"}
                          </div>
                        </div>

                        <div className="lot-card-grid">
                          <div className="lot-meta-cell">
                            <span className="meta-lbl">Expiration</span>
                            <span className="meta-val">
                              {lot.expiryDate ? (
                                <span className={daysLeft <= 7 ? "text-danger" : ""}>
                                  {lot.expiryDate} {daysLeft !== null && `(${daysLeft}d left)`}
                                </span>
                              ) : (
                                "Aucune (non périssable)"
                              )}
                            </span>
                          </div>

                          <div className="lot-meta-cell">
                            <span className="meta-lbl">Date de réception</span>
                            <span className="meta-val">{lot.receivedAt ? lot.receivedAt.slice(0, 10) : "—"}</span>
                          </div>

                          <div className="lot-meta-cell">
                            <span className="meta-lbl">Réf. fournisseur</span>
                            <span className="meta-val">{lot.supplierReference || "—"}</span>
                          </div>

                          <div className="lot-meta-cell">
                            <span className="meta-lbl">Coût unitaire</span>
                            <span className="meta-val">
                              {lot.unitCost && Number(lot.unitCost) > 0 ? `${Number(lot.unitCost).toFixed(3)} TND` : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. PRODUCTS TAB
// ---------------------------------------------------------------------------
function ProductsTab({ products, families, loading, error, onRefresh, onCreated, onOpenReceive, onViewStock }) {
  const { request } = useApi();
  const [form, setForm] = useState({ sku: "", name: "", familyId: "", unitType: "EACH", perishable: false, reorderPoint: "10", vatRate: "19" });
  const [imageFile, setImageFile] = useState(null);
  const [creatingFamily, setCreatingFamily] = useState(false);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState(null);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [familyForm, setFamilyForm] = useState({ name: "" });
  const [familyImageFile, setFamilyImageFile] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return products;
    return products.filter((product) => `${product.name} ${product.sku} ${product.familyName || ""}`.toLowerCase().includes(normalizedQuery));
  }, [products, query]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.sku.trim() || !form.name.trim()) {
      setMsg({ ok: false, text: "Le SKU et le nom sont obligatoires." });
      return;
    }
    setCreating(true);
    setMsg(null);
    try {
      const imageUrl = imageFile ? await uploadImage(imageFile) : null;
      await request("/api/inventory/products", {
        method: "POST",
        body: {
          sku: form.sku.trim(),
          name: form.name.trim(),
          familyId: form.familyId || null,
          imageUrl,
          unitType: form.unitType,
          perishable: form.perishable,
          reorderPoint: Number(form.reorderPoint) || 0,
          vatRate: Number(form.vatRate),
        },
      });
      setMsg({ ok: true, text: `Produit « ${form.name} » ajouté.` });
      setForm({ sku: "", name: "", familyId: "", unitType: "EACH", perishable: false, reorderPoint: "10", vatRate: "19" });
      setImageFile(null);
      setShowForm(false);
      onCreated();
    } catch (err) {
      setMsg({ ok: false, text: err.message || "Impossible d’ajouter le produit." });
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateFamily(event) {
    event.preventDefault();
    if (!familyForm.name.trim()) {
      setMsg({ ok: false, text: "Le nom de la famille est obligatoire." });
      return;
    }
    if (!familyImageFile) {
      setMsg({ ok: false, text: "Choisissez une image sur votre ordinateur avant de créer la famille." });
      return;
    }
    setCreatingFamily(true);
    setMsg(null);
    try {
      const imageUrl = await uploadImage(familyImageFile);
      await request("/api/inventory/product-families", {
        method: "POST",
        body: { name: familyForm.name.trim(), imageUrl },
      });
      setFamilyForm({ name: "" });
      setFamilyImageFile(null);
      onCreated();
      setShowFamilyForm(false);
      setMsg({ ok: true, text: "Famille de produits créée." });
    } catch (err) {
      setMsg({ ok: false, text: err.message || "Impossible de créer la famille." });
    } finally {
      setCreatingFamily(false);
    }
  }

  async function uploadImage(file) {
    const body = new FormData();
    body.append("file", file);
    const result = await request("/api/inventory/product-images", { method: "POST", body });
    return result.url;
  }

  function closeFamilyForm() {
    if (creatingFamily) return;
    setShowFamilyForm(false);
    setFamilyForm({ name: "" });
    setFamilyImageFile(null);
  }

  return (
    <div>
      <Panel
        title="Produits"
        icon={<Boxes size={16} />}
        right={
          <div className="inventory-panel-actions">
            <button className="btn btn-small" onClick={() => { setMsg(null); setShowFamilyForm(true); }}><Plus size={13} /> Ajouter une famille</button>
            <button className="btn btn-primary btn-small" onClick={() => { setMsg(null); setShowForm(true); }}><Plus size={13} /> Ajouter un produit</button>
            <button className="btn btn-small" onClick={onRefresh} disabled={loading}><RefreshCw size={13} /> Actualiser</button>
          </div>
        }
      >
        <Message ok={false} text={error} />
        <div className="inventory-list-toolbar">
          <label className="inventory-search">
            <Search size={14} />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un nom, un SKU ou une catégorie" aria-label="Rechercher des produits" />
          </label>
          <span className="inventory-result-count">{filteredProducts.length} sur {products.length}</span>
        </div>
        {!error && products.length === 0 && !loading && <Empty>Aucun produit pour le moment. Ajoutez-en un pour commencer.</Empty>}
        {!error && products.length > 0 && filteredProducts.length === 0 && <Empty>Aucun produit ne correspond à « {query} ».</Empty>}
        <div className="products-grid">
          {filteredProducts.map((p) => (
            <ShelfTag key={p.id}>
              <div className="tag-row">
                <div className="tag-product-info">
                  <ProductThumb src={p.imageUrl || p.familyImageUrl} alt={p.name} size={48} />
                  <div>
                    <div className="tag-name">{p.name}</div>
                    <div className="tag-sku">{p.sku}</div>
                  </div>
                </div>
                <div className="tag-row-actions">
                  <button
                    type="button"
                    className="btn btn-small btn-ghost"
                    onClick={() => onOpenReceive(p)}
                    title="Réceptionner du stock pour ce produit"
                  >
                    <Truck size={13} /> Réceptionner
                  </button>
                  <button
                    type="button"
                    className="btn btn-small btn-ghost"
                    onClick={() => onViewStock(p.id)}
                    title="Voir le niveau de stock et les lots"
                  >
                    <Search size={13} /> Stock
                  </button>
                  <button
                    type="button"
                    className="btn-icon danger"
                    onClick={async () => {
                      if (!window.confirm(`Supprimer ${p.name} ? Cela fonctionne uniquement s’il n’a pas été utilisé dans le stock, la tarification ou les ventes.`)) return;
                      setDeletingId(p.id);
                      setMsg(null);
                      try {
                        await request(`/api/inventory/products/${p.id}`, { method: "DELETE" });
                        setMsg({ ok: true, text: `Produit « ${p.name} » supprimé.` });
                        onRefresh();
                      } catch (err) {
                        setMsg({ ok: false, text: err.message || "Impossible de supprimer le produit." });
                      } finally {
                        setDeletingId(null);
                      }
                    }}
                    disabled={deletingId === p.id}
                    aria-label={`Supprimer ${p.name}`}
                    title="Supprimer le produit"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="tag-meta">
                {p.familyName && <Chip>{p.familyName}</Chip>}
                <Chip>{p.unitType === "WEIGHT" ? "Poids (kg)" : "À l’unité"}</Chip>
                <Chip>Réapprovisionnement à {p.reorderPoint}</Chip>
                {p.perishable && (
                  <Chip warn>
                    <AlertTriangle size={10} style={{ verticalAlign: -1, marginRight: 3 }} />
                    Périssable
                  </Chip>
                )}
              </div>
            </ShelfTag>
          ))}
        </div>
      </Panel>

      {showForm && (
        <Modal title="Ajouter un produit" icon={<Plus size={16} />} onClose={() => !creating && setShowForm(false)}>
          <Message ok={msg?.ok} text={msg?.text} />
          <form className="product-form" onSubmit={handleSubmit}>
            <div className="product-basic-grid">
              <Field label="SKU"><input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="0001234567" autoFocus /></Field>
              <Field label="Nom de la variante"><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Safia 1,5 L" /></Field>
            </div>
            <Field label="Famille de produits (facultatif)">
              <select value={form.familyId} onChange={(e) => setForm({ ...form, familyId: e.target.value })}>
                <option value="">Aucune famille</option>
                {families.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}
              </select>
            </Field>
            <div className="product-image-source">
              <div className="family-upload-field product-image-upload-field">
                <span className="field-label">Image du produit depuis votre ordinateur <em>Facultatif</em></span>
                <input id="product-image-upload" className="family-file-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                <label htmlFor="product-image-upload" className="family-upload-control">
                  <span className="family-upload-icon"><ImagePlus size={18} aria-hidden="true" /></span>
                  <span><strong>{imageFile ? "Remplacer l’image" : "Choisir une image sur votre ordinateur"}</strong><small>PNG, JPG, WEBP ou GIF</small></span>
                </label>
              </div>
              {imageFile && <span className="selected-file">{imageFile.name}</span>}
            </div>
            <div className="product-settings-grid">
              <Field label="Type d’unité">
                <select value={form.unitType} onChange={(e) => setForm({ ...form, unitType: e.target.value })}>
                  <option value="EACH">À l’unité (unités entières)</option>
                  <option value="WEIGHT">Poids (kg)</option>
                </select>
              </Field>
              <Field label="Seuil de réapprovisionnement"><input type="number" min="0" value={form.reorderPoint} onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })} /></Field>
              <Field label="Taux de TVA (%)"><input type="number" min="0" max="100" step="0.01" value={form.vatRate} onChange={(e) => setForm({ ...form, vatRate: e.target.value })} /></Field>
            </div>
            <label className="checkbox-row"><input type="checkbox" checked={form.perishable} onChange={(e) => setForm({ ...form, perishable: e.target.checked })} /> Ce produit est périssable</label>
            <div className="modal-actions product-modal-actions">
              <button type="button" className="btn" onClick={() => setShowForm(false)} disabled={creating}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? "Ajout…" : "Ajouter le produit"}</button>
            </div>
          </form>
        </Modal>
      )}

      {showFamilyForm && (
        <Modal title="Ajouter une famille de produits" icon={<Boxes size={16} />} onClose={closeFamilyForm}>
          <Message ok={msg?.ok} text={msg?.text} />
          <form className="family-form" onSubmit={handleCreateFamily}>
            <Field label="Nom de la famille" className="family-name-field">
              <input type="text" value={familyForm.name} onChange={(e) => setFamilyForm({ ...familyForm, name: e.target.value })} placeholder="ex. Eau et boissons gazeuses" autoFocus required />
            </Field>
            <div className="family-image-layout">
              <div className="family-image-fields">
                <div className="family-upload-field">
                  <span className="field-label">Image de la famille <em>Obligatoire</em></span>
                  <input id="family-image-upload" className="family-file-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => setFamilyImageFile(e.target.files?.[0] || null)} />
                  <label htmlFor="family-image-upload" className="family-upload-control">
                    <span className="family-upload-icon"><ImagePlus size={18} aria-hidden="true" /></span>
                    <span><strong>{familyImageFile ? "Remplacer l’image" : "Choisir une image sur votre ordinateur"}</strong><small>PNG, JPG, WEBP ou GIF</small></span>
                  </label>
                  {familyImageFile && <span className="selected-file"><Check size={14} /> {familyImageFile.name}</span>}
                </div>
              </div>
            </div>
            <div className="modal-actions family-modal-actions">
              <button type="button" className="btn" onClick={closeFamilyForm} disabled={creatingFamily}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={creatingFamily}>{creatingFamily ? "Création…" : "Créer la famille"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// STYLES
// ---------------------------------------------------------------------------
const moduleStyles = `
  .inventory-header-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
  .inventory-top-actions { display: flex; align-items: center; gap: 10px; }

  .inventory-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 24px; }
  .inventory-action { display: flex; align-items: center; gap: 12px; min-width: 0; padding: 14px 16px; text-align: left; color: var(--ink); background: var(--surface); border: 1px solid var(--hairline); border-radius: 10px; cursor: pointer; transition: all 0.15s ease; }
  .inventory-action:hover { border-color: var(--green); background: #FBFCF8; transform: translateY(-1px); }
  .inventory-action.active { color: var(--green-deep); border-color: var(--green); box-shadow: inset 0 -3px 0 var(--green), 0 2px 8px rgba(34,139,34,0.06); }
  .inventory-action > svg { flex-shrink: 0; color: var(--green); }
  .inventory-action span { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .inventory-action strong { font-size: 13.5px; }
  .inventory-action small { overflow: hidden; color: var(--ink-soft); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }

  .inventory-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 24px; }
  .summary-stat-card { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 14px 16px; background: var(--surface); border: 1px solid var(--hairline); border-radius: 10px; transition: border-color 0.15s ease; }
  .summary-stat-card span { color: var(--ink-soft); font-size: 12.5px; font-weight: 500; }
  .summary-stat-card strong { color: var(--green-deep); font-family: 'Space Grotesk', sans-serif; font-size: 24px; font-weight: 700; }
  .summary-stat-card.highlight-danger { border-color: #F87171; background: #FEF2F2; }
  .summary-stat-card.highlight-warn { border-color: #FBBF24; background: #FFFBEB; }
  .text-danger { color: #DC2626 !important; }
  .text-warn { color: #D97706 !important; }

  .inventory-panel-actions { display: flex; align-items: center; gap: 8px; }
  .inventory-list-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
  .inventory-search { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; padding: 9px 12px; background: #FBFBF7; border: 1px solid var(--hairline-strong); border-radius: 8px; color: var(--ink-soft); }
  .inventory-search:focus-within { outline: 2px solid var(--green); outline-offset: 1px; }
  .inventory-search input { width: 100%; min-width: 0; padding: 0; border: 0; outline: 0; background: transparent; color: var(--ink); font: inherit; font-size: 13.5px; }
  .inventory-result-count { flex-shrink: 0; color: var(--ink-soft); font-family: 'IBM Plex Mono', monospace; font-size: 11px; }

  .products-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
  .tag-row-actions { display: flex; align-items: center; gap: 6px; }
  .btn-ghost { background: transparent; border-color: var(--hairline); }
  .btn-ghost:hover { background: #F4F6F2; border-color: var(--hairline-strong); }

  .product-thumb-img { border-radius: 8px; object-fit: cover; border: 1px solid var(--hairline); background: #fff; flex-shrink: 0; }
  .product-thumb-placeholder { border-radius: 8px; border: 1px solid var(--hairline); background: #F1F4EE; color: var(--ink-soft); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .tag-product-info { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .stock-card-product-info { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .lot-summary-product-info { display: flex; align-items: center; gap: 12px; }
  .picker-item-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .selected-product-title-group { display: flex; align-items: center; gap: 12px; }

  /* RECEIVE MODAL STYLES */
  .receive-modal-body { display: flex; flex-direction: column; gap: 14px; }
  .modal-product-picker { border: 1px solid var(--hairline); border-radius: 8px; background: #FBFBF8; padding: 12px; margin-bottom: 4px; }
  .modal-search-box { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: #fff; border: 1px solid var(--hairline-strong); border-radius: 6px; margin-bottom: 8px; }
  .modal-search-box input { flex: 1; border: 0; outline: 0; font: inherit; font-size: 13px; color: var(--ink); background: transparent; }
  .modal-picker-list { max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
  .modal-picker-item { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px; background: #fff; border: 1px solid var(--hairline); border-radius: 6px; text-align: left; cursor: pointer; transition: all 0.1s; }
  .modal-picker-item:hover { border-color: var(--green); background: #FAFDF8; }
  .modal-picker-item.selected { border-color: var(--green); background: #F2F8EE; }
  .picker-item-main { display: flex; flex-direction: column; gap: 1px; }
  .picker-item-name { font-weight: 600; font-size: 13px; color: var(--ink); }
  .picker-item-sku { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; color: var(--ink-soft); }
  .picker-item-badges { display: flex; align-items: center; gap: 4px; }
  .mini-chip { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: #F1F4EE; color: var(--ink); }
  .mini-chip.warn { background: #FEF3C7; color: #92400E; }
  .picker-empty { padding: 14px; text-align: center; color: var(--ink-soft); font-size: 12px; }

  .modal-selected-product { border: 1px solid var(--green); background: #FAFDF8; border-radius: 8px; padding: 12px 14px; }
  .selected-product-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
  .selected-product-name { font-size: 15px; font-weight: 700; color: var(--ink); }
  .selected-product-sub { font-size: 11.5px; color: var(--ink-soft); margin-top: 1px; }
  .modal-metric-chips { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .metric-chip { background: #fff; border: 1px solid var(--hairline); border-radius: 6px; padding: 6px 8px; display: flex; flex-direction: column; gap: 1px; }
  .metric-lbl { font-size: 9.5px; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.3px; }
  .metric-chip strong { font-size: 12px; color: var(--ink); }

  .perishable-alert-banner { display: flex; align-items: center; gap: 8px; margin-top: 8px; padding: 8px 10px; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 6px; color: #92400E; font-size: 11.5px; line-height: 1.3; }
  .perishable-alert-banner svg { flex-shrink: 0; color: #D97706; }

  .modal-receive-form { display: flex; flex-direction: column; gap: 12px; }
  .form-group-card { border: 1px solid var(--hairline); border-radius: 8px; background: #fff; padding: 12px 14px; }
  .group-title { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; font-size: 12.5px; font-weight: 600; color: var(--ink); }
  .group-hint { font-size: 11px; font-weight: 400; color: var(--ink-soft); }
  .quantity-input-row { display: flex; align-items: center; gap: 8px; }
  .large-number-input { flex: 1; font-family: 'Space Grotesk', sans-serif; font-size: 22px; font-weight: 700; padding: 6px 12px; border: 1px solid var(--hairline-strong); border-radius: 6px; color: var(--green-deep); background: #FBFBF9; }
  .large-number-input:focus { outline: 2px solid var(--green); background: #fff; }
  .quantity-unit-label { font-size: 14px; font-weight: 600; color: var(--ink-soft); }
  .preset-buttons-row { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
  .preset-label { font-size: 11px; color: var(--ink-soft); margin-right: 2px; }
  .preset-btn { font-size: 11px; padding: 3px 8px; border-radius: 5px; border: 1px solid var(--hairline); background: #F8FAF6; color: var(--ink); cursor: pointer; transition: all 0.1s; }
  .preset-btn:hover { border-color: var(--green); background: #F0F6EB; }
  .preset-btn.clear { border-color: #FECACA; background: #FEF2F2; color: #DC2626; }
  .field-date-input { width: 100%; padding: 8px 10px; border: 1px solid var(--hairline-strong); border-radius: 6px; font: inherit; font-size: 13px; color: var(--ink); background: #FBFBF9; }
  .badge-required { font-size: 10px; background: #FEE2E2; color: #DC2626; padding: 1px 6px; border-radius: 10px; font-weight: 600; }
  .badge-optional { font-size: 10px; background: #F3F4F6; color: var(--ink-soft); padding: 1px 6px; border-radius: 10px; font-weight: 400; }
  .input-with-action { display: flex; gap: 6px; }
  .input-with-action input { flex: 1; }
  .form-two-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

  /* RECENT DELIVERIES MODAL */
  .recent-deliveries-modal-content { display: flex; flex-direction: column; gap: 12px; }
  .sidebar-description { font-size: 12px; color: var(--ink-soft); margin-top: -6px; margin-bottom: 10px; line-height: 1.4; }
  .recent-list { display: flex; flex-direction: column; gap: 6px; max-height: 340px; overflow-y: auto; }
  .recent-item { padding: 8px 10px; border: 1px solid var(--hairline); border-radius: 6px; background: #fff; display: flex; flex-direction: column; gap: 3px; }
  .recent-item-header { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
  .recent-product-name { font-size: 12.5px; color: var(--ink); }
  .recent-time { font-size: 10px; color: var(--ink-soft); font-family: 'IBM Plex Mono', monospace; }
  .recent-item-details { display: flex; justify-content: space-between; align-items: center; }
  .recent-qty { font-weight: 700; color: var(--green-deep); font-size: 13px; }
  .recent-lot { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; color: var(--ink-soft); background: #F1F4EE; padding: 2px 5px; border-radius: 4px; }
  .recent-item-meta { display: flex; gap: 8px; font-size: 10.5px; color: var(--ink-soft); }

  /* STOCK LEVELS TAB STYLES */
  .stock-filter-toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 12px; }
  .stock-search-wrap { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 260px; padding: 8px 12px; background: #FBFBF7; border: 1px solid var(--hairline-strong); border-radius: 8px; color: var(--ink-soft); }
  .stock-search-wrap:focus-within { outline: 2px solid var(--green); }
  .stock-search-wrap input { flex: 1; border: 0; outline: 0; font: inherit; font-size: 13px; color: var(--ink); background: transparent; }
  .stock-status-pills { display: flex; gap: 6px; flex-wrap: wrap; }
  .status-pill { display: flex; align-items: center; gap: 5px; font-size: 12px; padding: 6px 11px; border-radius: 20px; border: 1px solid var(--hairline); background: #fff; color: var(--ink-soft); cursor: pointer; transition: all 0.12s; }
  .status-pill:hover { border-color: var(--hairline-strong); color: var(--ink); }
  .status-pill.active { background: var(--green); color: #fff; border-color: var(--green); font-weight: 500; }
  .status-pill.warn.active { background: #D97706; border-color: #D97706; color: #fff; }
  .status-pill.danger.active { background: #DC2626; border-color: #DC2626; color: #fff; }
  .status-pill.purple.active { background: #7C3AED; border-color: #7C3AED; color: #fff; }

  .stock-family-row { display: flex; align-items: center; gap: 6px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 4px; }
  .family-label { font-size: 11.5px; color: var(--ink-soft); margin-right: 4px; }
  .filter-pill { font-size: 11.5px; padding: 4px 10px; border-radius: 16px; border: 1px solid var(--hairline); background: #fff; color: var(--ink-soft); cursor: pointer; white-space: nowrap; transition: all 0.15s; }
  .filter-pill:hover { border-color: var(--green); color: var(--ink); }
  .filter-pill.active { background: var(--green); color: #fff; border-color: var(--green); font-weight: 500; }

  .stock-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
  .stock-card { border: 1px solid var(--hairline); border-radius: 10px; background: #fff; padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.15s ease; }
  .stock-card:hover { border-color: var(--hairline-strong); box-shadow: 0 4px 12px rgba(0,0,0,0.03); transform: translateY(-1px); }
  .stock-card.low_stock { border-left: 4px solid #F59E0B; }
  .stock-card.out_of_stock { border-left: 4px solid #EF4444; background: #FFFAF9; }
  .stock-card.in_stock { border-left: 4px solid #10B981; }

  .stock-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 10px; }
  .stock-card-name { font-weight: 600; font-size: 14px; color: var(--ink); line-height: 1.3; }
  .stock-card-sku { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--ink-soft); margin-top: 2px; }
  
  .stock-badge { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 12px; white-space: nowrap; }
  .stock-badge.ok { background: #ECFDF5; color: #065F46; }
  .stock-badge.warn { background: #FFFBEB; color: #92400E; }
  .stock-badge.danger { background: #FEF2F2; color: #991B1B; }

  .stock-card-body { margin-bottom: 14px; }
  .stock-level-display { display: flex; align-items: baseline; gap: 6px; margin-bottom: 8px; }
  .stock-level-num { font-family: 'Space Grotesk', sans-serif; font-size: 28px; font-weight: 700; color: var(--ink); }
  .stock-level-unit { font-size: 12px; color: var(--ink-soft); }

  .stock-progress-bar-wrap { height: 6px; background: #F1F4EE; border-radius: 3px; overflow: hidden; margin-bottom: 6px; }
  .stock-progress-bar { height: 100%; border-radius: 3px; transition: width 0.3s ease; }
  .stock-progress-bar.in_stock { background: #10B981; }
  .stock-progress-bar.low_stock { background: #F59E0B; }
  .stock-progress-bar.out_of_stock { background: #EF4444; }
  
  .stock-reorder-legend { display: flex; justify-content: space-between; font-size: 11px; color: var(--ink-soft); }

  .stock-expiry-line { margin-top: 10px; }
  .expiry-pill { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; padding: 2px 7px; border-radius: 4px; font-weight: 500; }
  .expiry-pill.normal { background: #F1F5F9; color: #475569; }
  .expiry-pill.urgent { background: #FEF3C7; color: #B45309; font-weight: 600; }
  .expiry-pill.expired { background: #FEE2E2; color: #B91C1C; font-weight: 600; }
  .expiry-pill.none { background: #F8FAFC; color: #94A3B8; }

  .stock-card-actions { display: flex; gap: 8px; border-top: 1px solid var(--hairline); padding-top: 12px; }
  .stock-card-actions button { flex: 1; justify-content: center; }

  /* LOT MODAL STYLES */
  .lot-details-content { display: flex; flex-direction: column; gap: 16px; }
  .lot-summary-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: #FBFBF8; border: 1px solid var(--hairline); border-radius: 8px; }
  .lot-product-sku { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--ink-soft); }
  .lot-total-stat { display: flex; align-items: baseline; gap: 6px; }
  .lot-total-stat strong { font-family: 'Space Grotesk', sans-serif; font-size: 22px; color: var(--green-deep); }
  .lot-total-stat span { font-size: 12.5px; color: var(--ink-soft); }

  .fefo-banner { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; color: #166534; font-size: 12px; line-height: 1.4; }
  .fefo-banner-icon { color: #16A34A; flex-shrink: 0; margin-top: 1px; }
  .fefo-banner strong { display: block; margin-bottom: 2px; }
  .fefo-banner p { margin: 0; }

  .lots-list { display: flex; flex-direction: column; gap: 10px; max-height: 420px; overflow-y: auto; }
  .lot-card { border: 1px solid var(--hairline); border-radius: 8px; background: #fff; padding: 12px 14px; transition: border-color 0.12s; }
  .lot-card.fefo-first { border-color: var(--green); background: #FAFDF8; box-shadow: 0 2px 6px rgba(34,139,34,0.06); }
  .lot-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .lot-identity { display: flex; align-items: center; gap: 8px; }
  .lot-code { font-family: 'IBM Plex Mono', monospace; font-weight: 600; font-size: 13px; color: var(--ink); }
  .fefo-first-badge { font-size: 11px; font-weight: 600; background: #DCFCE7; color: #15803D; padding: 2px 8px; border-radius: 12px; }
  .lot-quantity { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 16px; color: var(--green-deep); }

  .lot-card-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; background: #F9FBF8; padding: 8px 10px; border-radius: 6px; }
  .lot-meta-cell { display: flex; flex-direction: column; gap: 2px; }
  .meta-lbl { font-size: 10.5px; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.3px; }
  .meta-val { font-size: 12px; font-weight: 500; color: var(--ink); }

  .flex-center-gap { display: flex; align-items: center; gap: 6px; }

  @media (max-width: 860px) {
    .inventory-summary { grid-template-columns: repeat(2, 1fr); }
    .modal-metric-chips { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 580px) {
    .inventory-header-row { flex-direction: column; align-items: stretch; }
    .inventory-top-actions { justify-content: space-between; }
    .inventory-actions { grid-template-columns: 1fr; }
    .inventory-summary { grid-template-columns: 1fr; }
    .form-two-cols { grid-template-columns: 1fr; }
    .lot-card-grid { grid-template-columns: repeat(2, 1fr); }
  }
`;
