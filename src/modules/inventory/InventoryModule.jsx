import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, AlertTriangle, Truck, Boxes } from "lucide-react";
import { useApi } from "../../lib/apiClient.jsx";
import { ShelfTag, Field, Chip, Panel, Message, Empty, Tabs } from "../../design/components.jsx";

export default function InventoryModule() {
  const { request } = useApi();
  const [tab, setTab] = useState("products");

  const [products, setProducts] = useState([]);
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

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <div>
      <style>{moduleStyles}</style>
      <h1 className="page-title">Inventory</h1>
      <p className="page-sub">Products, lots and stock levels — the foundation everything else builds on.</p>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "products", label: "Products" },
          { key: "receive", label: "Receive stock" },
          { key: "stock", label: "Stock levels" },
        ]}
      />

      {tab === "products" && (
        <ProductsTab products={products} loading={productsLoading} error={productsError} onRefresh={fetchProducts} onCreated={fetchProducts} />
      )}
      {tab === "receive" && <ReceiveTab products={products} />}
      {tab === "stock" && <StockTab products={products} />}
    </div>
  );
}

function ProductsTab({ products, loading, error, onRefresh, onCreated }) {
  const { request } = useApi();
  const [form, setForm] = useState({ sku: "", name: "", unitType: "EACH", perishable: false, reorderPoint: "10", vatRate: "19" });
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.sku.trim() || !form.name.trim()) {
      setMsg({ ok: false, text: "SKU and name are required." });
      return;
    }
    setCreating(true);
    setMsg(null);
    try {
      // POST /api/inventory/products -> { productId }
      await request("/api/inventory/products", {
        method: "POST",
        body: {
          sku: form.sku.trim(),
          name: form.name.trim(),
          unitType: form.unitType,
          perishable: form.perishable,
          reorderPoint: Number(form.reorderPoint) || 0,
          vatRate: Number(form.vatRate),
        },
      });
      setMsg({ ok: true, text: `Product "${form.name}" added.` });
      setForm({ sku: "", name: "", unitType: "EACH", perishable: false, reorderPoint: "10", vatRate: "19" });
      onCreated();
    } catch (err) {
      setMsg({ ok: false, text: err.message || "Could not add the product." });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="grid">
      <Panel title="Add a product" icon={<Plus size={16} />}>
        <Message ok={msg?.ok} text={msg?.text} />
        <form onSubmit={handleSubmit}>
          <Field label="SKU">
            <input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="0001234567" />
          </Field>
          <Field label="Name">
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Organic bananas" />
          </Field>
          <Field label="Unit type">
            <select value={form.unitType} onChange={(e) => setForm({ ...form, unitType: e.target.value })}>
              <option value="EACH">Each (whole units)</option>
              <option value="WEIGHT">Weight (kg)</option>
            </select>
          </Field>
          <Field label="Reorder point">
            <input type="number" min="0" value={form.reorderPoint} onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })} />
          </Field>
          <Field label="VAT rate (%)">
            <input type="number" min="0" max="100" step="0.01" value={form.vatRate} onChange={(e) => setForm({ ...form, vatRate: e.target.value })} />
          </Field>
          <label className="checkbox-row">
            <input type="checkbox" checked={form.perishable} onChange={(e) => setForm({ ...form, perishable: e.target.checked })} />
            This product is perishable
          </label>
          <button type="submit" className="btn btn-primary" disabled={creating} style={{ width: "100%", justifyContent: "center" }}>
            {creating ? "Adding…" : "Add product"}
          </button>
        </form>
      </Panel>

      <Panel
        title="Products"
        icon={<Boxes size={16} />}
        right={
          <button className="btn" onClick={onRefresh} disabled={loading} style={{ padding: "5px 10px" }}>
            <RefreshCw size={13} /> Refresh
          </button>
        }
      >
        <Message ok={false} text={error} />
        {!error && products.length === 0 && !loading && <Empty>No products yet. Add one to get started.</Empty>}
        {products.map((p) => (
          <ShelfTag key={p.id}>
            <div className="tag-row">
              <div>
                <div className="tag-name">{p.name}</div>
                <div className="tag-sku">{p.sku}</div>
              </div>
            </div>
            <div className="tag-meta">
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

  const reorderPoint = products.find((p) => p.id === productId)?.reorderPoint;

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
                    <div className="tag-name">{lot.quantity} units</div>
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
  .stock-stat { display: flex; align-items: baseline; gap: 10px; margin: 4px 0 2px; }
  .stock-num { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 40px; color: var(--green-deep); }
  .stock-unit { font-size: 13px; color: var(--ink-soft); }
`;
