import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, AlertTriangle, Truck, Boxes, Search, Trash2 } from "lucide-react";
import { useApi } from "../../lib/apiClient.jsx";
import { ShelfTag, Field, Chip, Panel, Message, Empty, Modal } from "../../design/components.jsx";

export default function InventoryModule() {
  const { request } = useApi();
  const [tab, setTab] = useState("products");

  const [products, setProducts] = useState([]);
  const [families, setFamilies] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError("");
    try {
      // GET /api/inventory/products returns a plain array of ProductView
      const data = await request("/api/inventory/products");
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setProductsError(err.message || "Could not reach the inventory service.");
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

  useEffect(() => {
    fetchProducts();
    fetchFamilies();
  }, [fetchFamilies, fetchProducts]);

  return (
    <div>
      <style>{moduleStyles}</style>
      <h1 className="page-title">Inventory</h1>
      <p className="page-sub">Products, lots and stock levels — the foundation everything else builds on.</p>

      <div className="inventory-summary" aria-label="Inventory summary">
        <div><span>Products</span><strong>{products.length}</strong></div>
        <div><span>Perishable</span><strong>{products.filter((product) => product.perishable).length}</strong></div>
        <div><span>Weight items</span><strong>{products.filter((product) => product.unitType === "WEIGHT").length}</strong></div>
      </div>

      <div className="inventory-actions" role="toolbar" aria-label="Inventory actions">
        <button type="button" className={`inventory-action ${tab === "products" ? "active" : ""}`} onClick={() => setTab("products")}>
          <Boxes size={16} />
          <span><strong>Products</strong><small>Catalog and product actions</small></span>
        </button>
        <button type="button" className={`inventory-action ${tab === "receive" ? "active" : ""}`} onClick={() => setTab("receive")}>
          <Truck size={16} />
          <span><strong>Receive stock</strong><small>Add a delivery or lot</small></span>
        </button>
        <button type="button" className={`inventory-action ${tab === "stock" ? "active" : ""}`} onClick={() => setTab("stock")}>
          <Search size={16} />
          <span><strong>Stock levels</strong><small>Check quantity and expiry</small></span>
        </button>
      </div>

      {tab === "products" && (
        <ProductsTab products={products} families={families} loading={productsLoading} error={productsError} onRefresh={fetchProducts} onCreated={() => { fetchProducts(); fetchFamilies(); }} />
      )}
      {tab === "receive" && <ReceiveTab products={products} />}
      {tab === "stock" && <StockTab products={products} />}
    </div>
  );
}

function ProductsTab({ products, families, loading, error, onRefresh, onCreated }) {
  const { request } = useApi();
  const [form, setForm] = useState({ sku: "", name: "", familyId: "", imageUrl: "", unitType: "EACH", perishable: false, reorderPoint: "10", vatRate: "19" });
  const [imageFile, setImageFile] = useState(null);
  const [creatingFamily, setCreatingFamily] = useState(false);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState(null);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [familyForm, setFamilyForm] = useState({ name: "", imageUrl: "" });
  const [familyImageFile, setFamilyImageFile] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return products;
    return products.filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(normalizedQuery));
  }, [products, query]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.sku.trim() || !form.name.trim()) {
      setMsg({ ok: false, text: "SKU and name are required." });
      return;
    }
    setCreating(true);
    setMsg(null);
    try {
      let imageUrl = form.imageUrl.trim() || null;
      if (imageFile) imageUrl = await uploadImage(imageFile);
      // POST /api/inventory/products -> { productId }
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
      setMsg({ ok: true, text: `Product "${form.name}" added.` });
      setForm({ sku: "", name: "", familyId: "", imageUrl: "", unitType: "EACH", perishable: false, reorderPoint: "10", vatRate: "19" });
      setImageFile(null);
      setShowForm(false);
      onCreated();
    } catch (err) {
      setMsg({ ok: false, text: err.message || "Could not add the product." });
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateFamily(event) {
    event.preventDefault();
    if (!familyForm.name.trim()) return;
    setCreatingFamily(true);
    setMsg(null);
    try {
      let imageUrl = familyForm.imageUrl.trim() || null;
      if (familyImageFile) imageUrl = await uploadImage(familyImageFile);
      await request("/api/inventory/product-families", {
        method: "POST",
        body: { name: familyForm.name.trim(), imageUrl },
      });
      setFamilyForm({ name: "", imageUrl: "" });
      setFamilyImageFile(null);
      onCreated();
      setShowFamilyForm(false);
      setMsg({ ok: true, text: "Product family created." });
    } catch (err) {
      setMsg({ ok: false, text: err.message || "Could not create the family." });
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

  return (
    <div>
      <Panel
        title="Products"
        icon={<Boxes size={16} />}
        right={
          <div className="inventory-panel-actions">
            <button className="btn btn-small" onClick={() => { setMsg(null); setShowFamilyForm(true); }}><Plus size={13} /> Add family</button>
            <button className="btn btn-primary btn-small" onClick={() => { setMsg(null); setShowForm(true); }}><Plus size={13} /> Add product</button>
            <button className="btn btn-small" onClick={onRefresh} disabled={loading}><RefreshCw size={13} /> Refresh</button>
          </div>
        }
      >
        <Message ok={false} text={error} />
        <div className="inventory-list-toolbar">
          <label className="inventory-search">
            <Search size={14} />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or SKU" aria-label="Search products" />
          </label>
          <span className="inventory-result-count">{filteredProducts.length} of {products.length}</span>
        </div>
        {!error && products.length === 0 && !loading && <Empty>No products yet. Add one to get started.</Empty>}
        {!error && products.length > 0 && filteredProducts.length === 0 && <Empty>No products match “{query}”.</Empty>}
        {filteredProducts.map((p) => (
          <ShelfTag key={p.id}>
            <div className="tag-row">
              <div>
                <div className="tag-name">{p.name}</div>
                <div className="tag-sku">{p.sku}</div>
              </div>
              <button type="button" className="btn-icon danger" onClick={async () => {
                if (!window.confirm(`Delete ${p.name}? This only works if it has not been used in stock, pricing, or sales.`)) return;
                setDeletingId(p.id);
                setMsg(null);
                try {
                  await request(`/api/inventory/products/${p.id}`, { method: "DELETE" });
                  setMsg({ ok: true, text: `Product "${p.name}" deleted.` });
                  onRefresh();
                } catch (err) {
                  setMsg({ ok: false, text: err.message || "Could not delete the product." });
                } finally {
                  setDeletingId(null);
                }
              }} disabled={deletingId === p.id} aria-label={`Delete ${p.name}`} title="Delete product">
                <Trash2 size={15} />
              </button>
            </div>
            <div className="tag-meta">
              {p.familyName && <Chip>{p.familyName}</Chip>}
              <Chip>{p.unitType}</Chip>
              <Chip>Reorder at {p.reorderPoint}</Chip>
              {p.perishable && (
                <Chip warn>
                  <AlertTriangle size={10} style={{ verticalAlign: -1, marginRight: 3 }} />
                  Perishable
                </Chip>
              )}
            </div>
          </ShelfTag>
        ))}
      </Panel>

      {showForm && (
        <Modal title="Add a product" icon={<Plus size={16} />} onClose={() => !creating && setShowForm(false)}>
          <Message ok={msg?.ok} text={msg?.text} />
          <form onSubmit={handleSubmit}>
            <Field label="SKU"><input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="0001234567" autoFocus /></Field>
            <Field label="Variant name"><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Safia 1.5L" /></Field>
            <Field label="Product family (optional)">
              <select value={form.familyId} onChange={(e) => setForm({ ...form, familyId: e.target.value })}>
                <option value="">No family</option>
                {families.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}
              </select>
            </Field>
            <Field label="Product image from computer (optional)">
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
              {imageFile && <span className="selected-file">{imageFile.name}</span>}
            </Field>
            <Field label="Or use an image URL (optional)"><input type="url" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://.../safia-water.jpg" /></Field>
            <Field label="Unit type">
              <select value={form.unitType} onChange={(e) => setForm({ ...form, unitType: e.target.value })}>
                <option value="EACH">Each (whole units)</option>
                <option value="WEIGHT">Weight (kg)</option>
              </select>
            </Field>
            <Field label="Reorder point"><input type="number" min="0" value={form.reorderPoint} onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })} /></Field>
            <Field label="VAT rate (%)"><input type="number" min="0" max="100" step="0.01" value={form.vatRate} onChange={(e) => setForm({ ...form, vatRate: e.target.value })} /></Field>
            <label className="checkbox-row"><input type="checkbox" checked={form.perishable} onChange={(e) => setForm({ ...form, perishable: e.target.checked })} /> This product is perishable</label>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setShowForm(false)} disabled={creating}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? "Adding..." : "Add product"}</button>
            </div>
          </form>
        </Modal>
      )}

      {showFamilyForm && (
        <Modal title="Add a product family" icon={<Boxes size={16} />} onClose={() => !creatingFamily && setShowFamilyForm(false)}>
          <Message ok={msg?.ok} text={msg?.text} />
          <p className="family-form-intro">Create a top-level catalog card such as Water, Milk, or Soft drinks. Products can be assigned to it afterward.</p>
          <form onSubmit={handleCreateFamily}>
            <Field label="Family name">
              <input type="text" value={familyForm.name} onChange={(e) => setFamilyForm({ ...familyForm, name: e.target.value })} placeholder="Water" autoFocus required />
            </Field>
            <Field label="Family image URL">
              <input type="url" value={familyForm.imageUrl} onChange={(e) => setFamilyForm({ ...familyForm, imageUrl: e.target.value })} placeholder="https://example.com/water.jpg" />
            </Field>
            <Field label="Or choose an image from your computer">
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => setFamilyImageFile(e.target.files?.[0] || null)} />
              {familyImageFile && <span className="selected-file">{familyImageFile.name}</span>}
            </Field>
            {familyForm.imageUrl && (
              <div className="family-image-preview">
                <img src={familyForm.imageUrl} alt="Family preview" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                <span>Preview</span>
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setShowFamilyForm(false)} disabled={creatingFamily}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={creatingFamily}>{creatingFamily ? "Creating..." : "Create family"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function ReceiveTab({ products }) {
  const { request } = useApi();
  const [form, setForm] = useState({
    productId: "",
    lotNumber: "",
    quantityValue: "",
    expiryDate: "",
    supplierReference: "",
    unitCost: "",
  });
  const [receiving, setReceiving] = useState(false);
  const [msg, setMsg] = useState(null);

  const selectedProduct = products.find((p) => p.id === form.productId);
  const unitType = selectedProduct?.unitType; // EACH quantities must be whole numbers, WEIGHT allows 3 decimals

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.productId || !form.quantityValue) {
      setMsg({ ok: false, text: "Product and quantity are required." });
      return;
    }
    if (unitType === "EACH" && !Number.isInteger(Number(form.quantityValue))) {
      setMsg({ ok: false, text: "This product is sold by the each — quantity must be a whole number." });
      return;
    }
    setReceiving(true);
    setMsg(null);
    try {
      // POST /api/inventory/receive-stock -> { status: "received" }
      await request("/api/inventory/receive-stock", {
        method: "POST",
        body: {
          productId: form.productId,
          lotNumber: form.lotNumber.trim() || null,
          quantityValue: Number(form.quantityValue),
          unitType,
          expiryDate: form.expiryDate || null,
          receivedDate: null, // defaults to today on the backend
          supplierReference: form.supplierReference.trim() || null,
          unitCost: form.unitCost ? Number(form.unitCost) : null,
        },
      });
      setMsg({ ok: true, text: "Stock received. A new lot was created." });
      setForm({ productId: "", lotNumber: "", quantityValue: "", expiryDate: "", supplierReference: "", unitCost: "" });
    } catch (err) {
      setMsg({ ok: false, text: err.message || "Could not receive stock." });
    } finally {
      setReceiving(false);
    }
  }

  return (
    <div className="grid">
      <Panel title="Receive stock" icon={<Truck size={16} />}>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: -8, marginBottom: 16 }}>
          Creates a new lot for the product. Give an expiry date for perishable items so FEFO selling knows what to sell first.
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
          <Field label="Lot number (optional)">
            <input type="text" value={form.lotNumber} onChange={(e) => setForm({ ...form, lotNumber: e.target.value })} placeholder="Auto-generated if left blank" />
          </Field>
          <Field label={`Quantity${unitType ? ` (${unitType === "WEIGHT" ? "kg" : "units"})` : ""}`}>
            <input
              type="number"
              min="0"
              step={unitType === "WEIGHT" ? "0.001" : "1"}
              value={form.quantityValue}
              onChange={(e) => setForm({ ...form, quantityValue: e.target.value })}
            />
          </Field>
          <Field label={`Expiry date${selectedProduct?.perishable ? "" : " (optional)"}`}>
            <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
          </Field>
          <Field label="Supplier reference (optional)">
            <input type="text" value={form.supplierReference} onChange={(e) => setForm({ ...form, supplierReference: e.target.value })} />
          </Field>
          <Field label="Unit cost (TND, optional)">
            <input type="number" min="0" step="0.001" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} />
          </Field>
          <button type="submit" className="btn btn-primary" disabled={receiving} style={{ width: "100%", justifyContent: "center" }}>
            {receiving ? "Receiving…" : "Receive stock"}
          </button>
        </form>
      </Panel>
      <Panel title="How this fits in">
        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--ink-soft)" }}>
          Every lot is tracked separately with its own expiry date. When a sale completes at the till, Inventory
          deducts stock oldest-expiry-first (FEFO) across these lots automatically — you never pick a lot manually
          at checkout.
        </p>
      </Panel>
    </div>
  );
}

function StockTab({ products }) {
  const { request } = useApi();
  const [productId, setProductId] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedProduct = products.find((p) => p.id === productId);
  const reorderPoint = selectedProduct?.reorderPoint;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!productId) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      // GET /api/inventory/stock/{productId} -> { productId, productName, totalQuantity, lots: [...] }
      const data = await request(`/api/inventory/stock/${productId}`);
      setResult(data);
    } catch (err) {
      setError(err.message || "Could not fetch stock level.");
    } finally {
      setLoading(false);
    }
  }

  // Soonest-expiring first, mirroring the FEFO order the backend sells in. Non-perishable
  // lots (no expiryDate) sort last since there's no urgency to move them.
  const sortedLots = result?.lots
    ? [...result.lots].sort((a, b) => {
        if (!a.expiryDate && !b.expiryDate) return 0;
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return a.expiryDate.localeCompare(b.expiryDate);
      })
    : [];

  const belowReorder = result && typeof reorderPoint === "number" && Number(result.totalQuantity) <= reorderPoint;

  return (
    <div className="grid">
      <Panel title="Look up stock" icon={<Boxes size={16} />}>
        <form onSubmit={handleSubmit}>
          <Field label="Product">
            <select value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">Select a product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
          </Field>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
            {loading ? "Looking up…" : "View stock"}
          </button>
        </form>
      </Panel>
      <Panel title="Current level">
        <Message ok={false} text={error} />
        {!result && !error && <Empty>Choose a product to see how much is on the shelf.</Empty>}
        {result && (
          <>
            <div className="stock-stat">
              <span className="stock-num">{result.totalQuantity}</span>
              <span className="stock-unit">on hand{result.productName ? ` · ${result.productName}` : ""}</span>
            </div>
            {typeof reorderPoint === "number" && (
              <div className="tag-meta" style={{ marginBottom: 16 }}>
                <Chip>Reorder at {reorderPoint}</Chip>
                {belowReorder && (
                  <Chip warn>
                    <AlertTriangle size={10} style={{ verticalAlign: -1, marginRight: 3 }} />
                    Below reorder point
                  </Chip>
                )}
              </div>
            )}

            {sortedLots.length === 0 && <Empty>No lots with stock on hand.</Empty>}
            {sortedLots.map((lot, i) => (
              <ShelfTag key={lot.id}>
                <div className="tag-row">
                  <div>
                    <div className="tag-name">{lot.quantity} {selectedProduct?.unitType === "WEIGHT" ? "kg" : "units"}</div>
                    <div className="tag-sku">Lot {lot.id.slice(0, 8)}</div>
                  </div>
                  {i === 0 && sortedLots.length > 1 && <Chip>Sells first (FEFO)</Chip>}
                </div>
                <div className="tag-meta">
                  {lot.expiryDate ? (
                    <Chip warn={isSoonToExpire(lot.expiryDate)}>
                      {isSoonToExpire(lot.expiryDate) && <AlertTriangle size={10} style={{ verticalAlign: -1, marginRight: 3 }} />}
                      Expires {lot.expiryDate}
                    </Chip>
                  ) : (
                    <Chip>No expiry</Chip>
                  )}
                  {lot.receivedAt && <Chip>Received {lot.receivedAt.slice(0, 10)}</Chip>}
                </div>
              </ShelfTag>
            ))}
          </>
        )}
      </Panel>
    </div>
  );
}

function isSoonToExpire(isoDate) {
  const days = (new Date(isoDate) - new Date()) / (1000 * 60 * 60 * 24);
  return days <= 3;
}

const moduleStyles = `
  .inventory-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 24px; }
  .inventory-action { display: flex; align-items: center; gap: 10px; min-width: 0; padding: 13px 14px; text-align: left; color: var(--ink); background: var(--surface); border: 1px solid var(--hairline); border-radius: 8px; cursor: pointer; }
  .inventory-action:hover { border-color: var(--green); background: #FBFCF8; }
  .inventory-action.active { color: var(--green-deep); border-color: var(--green); box-shadow: inset 0 -3px 0 var(--green); }
  .inventory-action > svg { flex-shrink: 0; color: var(--green); }
  .inventory-action span { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .inventory-action strong { font-size: 13px; }
  .inventory-action small { overflow: hidden; color: var(--ink-soft); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
  .inventory-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 24px; }
  .inventory-summary div { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 12px 14px; background: var(--surface); border: 1px solid var(--hairline); border-radius: 8px; }
  .inventory-summary span { color: var(--ink-soft); font-size: 12px; }
  .inventory-summary strong { color: var(--green-deep); font-family: 'Space Grotesk', sans-serif; font-size: 20px; }
  .inventory-list-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  .inventory-search { display: flex; align-items: center; gap: 7px; flex: 1; min-width: 0; padding: 8px 10px; background: #FBFBF7; border: 1px solid var(--hairline-strong); border-radius: 6px; color: var(--ink-soft); }
  .inventory-search:focus-within { outline: 2px solid var(--green); outline-offset: 1px; }
  .inventory-search input { width: 100%; min-width: 0; padding: 0; border: 0; outline: 0; background: transparent; color: var(--ink); font: inherit; font-size: 13px; }
  .inventory-result-count { flex-shrink: 0; color: var(--ink-soft); font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; }
  .family-form-intro { margin: -4px 0 18px; color: var(--ink-soft); font-size: 13px; line-height: 1.5; }
  .family-image-preview { position: relative; overflow: hidden; height: 120px; margin: -2px 0 16px; border: 1px solid var(--hairline); border-radius: 8px; background: #E9EFE7; }
  .family-image-preview img { width: 100%; height: 100%; object-fit: cover; }
  .family-image-preview span { position: absolute; left: 8px; bottom: 8px; padding: 4px 7px; border-radius: 5px; background: rgba(27,33,25,.72); color: #fff; font-size: 11px; }
  .selected-file { display: block; margin-top: 6px; color: var(--ink-soft); font-size: 12px; overflow-wrap: anywhere; }
  .stock-stat { display: flex; align-items: baseline; gap: 10px; margin: 4px 0 2px; }
  .stock-num { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 40px; color: var(--green-deep); }
  .stock-unit { font-size: 13px; color: var(--ink-soft); }
  @media (max-width: 680px) { .inventory-actions { grid-template-columns: 1fr; } }
  @media (max-width: 560px) { .inventory-summary { grid-template-columns: 1fr; } .inventory-list-toolbar { align-items: stretch; flex-direction: column; } }
`;
