import { useCallback, useEffect, useMemo, useState } from "react";
import { Truck, RefreshCw, Plus, Package, AlertTriangle, CheckCircle2, Boxes, Send, PackageCheck, Ban } from "lucide-react";
import { useApi } from "../../lib/apiClient.jsx";
import { ShelfTag, Field, Chip, Panel, Message, Empty, Tabs, Modal } from "../../design/components.jsx";

function productLabel(products, productId) {
  const product = products.find((p) => p.id === productId);
  return product ? `${product.name} (${product.sku})` : productId;
}

function statusLabel(status) {
  return {
    DRAFT: "Brouillon",
    PLACED: "Passée",
    RECEIVED: "Réceptionnée",
    CANCELLED: "Annulée",
  }[status] || status;
}

function moneyLabel(value) {
  return `${Number(value ?? 0).toFixed(3)} TND`;
}

export default function ProcurementModule() {
  const { request } = useApi();
  const [tab, setTab] = useState("suppliers");
  const [products, setProducts] = useState([]);

  const fetchProducts = useCallback(async () => {
    try {
      const data = await request("/api/inventory/products");
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setProducts([]);
    }
  }, [request]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <div>
      <h1 className="page-title">Approvisionnement</h1>
      <p className="page-sub">Fournisseurs, achats et suivi du stock faible.</p>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "suppliers", label: "Fournisseurs" },
          { key: "orders", label: "Commandes" },
          { key: "alerts", label: "Alertes" },
        ]}
      />

      {tab === "suppliers" && <SuppliersTab />}
      {tab === "orders" && <OrdersTab products={products} onProductsRefresh={fetchProducts} />}
      {tab === "alerts" && <AlertsTab products={products} />}
    </div>
  );
}

function SuppliersTab() {
  const { request } = useApi();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", contactEmail: "", phone: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await request("/api/procurement/suppliers");
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Impossible de joindre le service fournisseurs.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setMsg({ ok: false, text: "Le nom du fournisseur est obligatoire." });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await request("/api/procurement/suppliers", {
        method: "POST",
        body: {
          name: form.name.trim(),
          contactEmail: form.contactEmail.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
        },
      });
      setMsg({ ok: true, text: `Fournisseur « ${form.name.trim()} » ajouté.` });
      setForm({ name: "", contactEmail: "", phone: "", address: "" });
      fetchSuppliers();
    } catch (err) {
      setMsg({ ok: false, text: err.message || "Impossible de créer le fournisseur." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid">
      <Panel title="Ajouter un fournisseur" icon={<Plus size={16} />}>
        <Message ok={msg?.ok} text={msg?.text} />
        <form onSubmit={handleSubmit}>
          <Field label="Nom du fournisseur">
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Fresh Valley" />
          </Field>
          <Field label="Téléphone">
            <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+216 71 000 000" />
          </Field>
          <Field label="E-mail">
            <input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} placeholder="supplier@example.com" />
          </Field>
          <Field label="Adresse">
            <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Rue de l’usine, Tunis" />
          </Field>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: "100%", justifyContent: "center" }}>
            {saving ? "Enregistrement…" : "Enregistrer le fournisseur"}
          </button>
        </form>
      </Panel>

      <Panel
        title="Fournisseurs"
        icon={<Truck size={16} />}
        right={
          <button className="btn" onClick={fetchSuppliers} disabled={loading} style={{ padding: "5px 10px" }}>
            <RefreshCw size={13} /> Actualiser
          </button>
        }
      >
        <Message ok={false} text={error} />
        {!error && suppliers.length === 0 && !loading && <Empty>Aucun fournisseur enregistré.</Empty>}
        {suppliers.map((supplier) => (
          <ShelfTag key={supplier.id}>
            <div className="tag-row">
              <div>
                <div className="tag-name">{supplier.name}</div>
                <div className="tag-sku">{supplier.phone || "Aucun téléphone"}</div>
              </div>
              <Chip>{supplier.contactEmail || "Aucun e-mail"}</Chip>
            </div>
          </ShelfTag>
        ))}
      </Panel>
    </div>
  );
}

function OrdersTab({ products, onProductsRefresh }) {
  const { request } = useApi();
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ supplierId: "", productId: "", quantity: "10", unitCost: "" });
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState(null);
  const [receivingOrder, setReceivingOrder] = useState(null);
  const [receiptForm, setReceiptForm] = useState({});
  const [receiving, setReceiving] = useState(false);
  const [receiveMsg, setReceiveMsg] = useState(null);
  const [actionKey, setActionKey] = useState(null);

  const spendBreakdown = useMemo(() => {
    const totals = new Map();
    orders.forEach((order) => {
      const supplierKey = order.supplierId || "Fournisseur inconnu";
      const supplierName = order.supplierName || supplierKey;
      const value = Number(parseFloat(String(order.totalCost ?? "0").replace(/[^0-9.-]/g, "")) || 0);
      totals.set(supplierKey, {
        supplierId: supplierKey,
        name: supplierName,
        total: (totals.get(supplierKey)?.total || 0) + value,
        orders: (totals.get(supplierKey)?.orders || 0) + 1,
      });
    });
    return [...totals.values()].sort((a, b) => b.total - a.total);
  }, [orders]);

  const totalSpend = spendBreakdown.reduce((sum, row) => sum + row.total, 0);
  const selectedProduct = products.find((product) => product.id === form.productId);
  const orderSummary = useMemo(() => ({
    open: orders.filter((order) => order.status === "DRAFT" || order.status === "PLACED").length,
    placed: orders.filter((order) => order.status === "PLACED").length,
    received: orders.filter((order) => order.status === "RECEIVED").length,
    cancelled: orders.filter((order) => order.status === "CANCELLED").length,
  }), [orders]);

  function openReceive(order) {
    setReceivingOrder(order);
    setReceiveMsg(null);
    setReceiptForm(Object.fromEntries((order.lines || []).map((line) => {
      const product = products.find((candidate) => candidate.id === line.productId);
      return [line.id, {
        quantityValue: line.quantity,
        unitType: product?.unitType || line.unitType || "EACH",
        lotNumber: "",
        expiryDate: "",
        supplierReference: "",
      }];
    })));
  }

  function updateReceiptLine(lineId, field, value) {
    setReceiptForm((previous) => ({
      ...previous,
      [lineId]: { ...previous[lineId], [field]: value },
    }));
  }

  const fetchSuppliers = useCallback(async () => {
    try {
      const data = await request("/api/procurement/suppliers");
      setSuppliers(Array.isArray(data) ? data : []);
    } catch {
      setSuppliers([]);
    }
  }, [request]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await request("/api/procurement/orders");
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Impossible de joindre le service des commandes d’achat.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    fetchSuppliers();
    fetchOrders();
    onProductsRefresh();
  }, [fetchOrders, fetchSuppliers, onProductsRefresh]);

  async function handleCreateOrder(e) {
    e.preventDefault();
    if (!form.supplierId || !form.productId || !form.quantity || !form.unitCost) {
      setMsg({ ok: false, text: "Le fournisseur, le produit, la quantité et le coût unitaire sont obligatoires." });
      return;
    }
    setCreating(true);
    setMsg(null);
    try {
      await request("/api/procurement/orders", {
        method: "POST",
        body: {
          supplierId: form.supplierId,
          lines: [{
            productId: form.productId,
            quantityValue: Number(form.quantity),
            unitType: selectedProduct?.unitType || "EACH",
            unitCost: Number(form.unitCost),
          }],
        },
      });
      setMsg({ ok: true, text: "Commande d’achat créée." });
      setForm({ supplierId: "", productId: "", quantity: "10", unitCost: "" });
      fetchOrders();
    } catch (err) {
      setMsg({ ok: false, text: err.message || "Impossible de créer la commande." });
    } finally {
      setCreating(false);
    }
  }

  async function handleAction(orderId, action) {
    if (action === "cancel" && !window.confirm("Annuler cette commande d’achat ?")) return;
    setActionKey(`${orderId}:${action}`);
    try {
      await request(`/api/procurement/orders/${orderId}/${action}`, { method: "POST" });
      fetchOrders();
    } catch (err) {
      setError(err.message || `Impossible d’exécuter l’action « ${action} » sur la commande.`);
    } finally {
      setActionKey(null);
    }
  }

  async function handleReceive(e) {
    e.preventDefault();
    if (!receivingOrder) return;

    for (const line of receivingOrder.lines || []) {
      const draft = receiptForm[line.id];
      const quantity = Number(draft?.quantityValue);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        setReceiveMsg({ ok: false, text: "Chaque quantité réceptionnée doit être supérieure à zéro." });
        return;
      }
      if (draft.unitType === "EACH" && !Number.isInteger(quantity)) {
        setReceiveMsg({ ok: false, text: "Les quantités à l’unité doivent être des nombres entiers." });
        return;
      }
      const product = products.find((candidate) => candidate.id === line.productId);
      if (product?.perishable && !draft.expiryDate) {
        setReceiveMsg({ ok: false, text: `${product.name} nécessite une date d’expiration.` });
        return;
      }
    }

    setReceiving(true);
    setReceiveMsg(null);
    try {
      await request(`/api/procurement/orders/${receivingOrder.id}/receive`, {
        method: "POST",
        body: {
          lines: (receivingOrder.lines || []).map((line) => {
            const draft = receiptForm[line.id];
            return {
              purchaseOrderLineId: line.id,
              quantityValue: Number(draft.quantityValue),
              unitType: draft.unitType,
              lotNumber: draft.lotNumber.trim() || null,
              expiryDate: draft.expiryDate || null,
              receivedDate: null,
              supplierReference: draft.supplierReference.trim() || null,
            };
          }),
        },
      });
      setMsg({ ok: true, text: "Marchandises réceptionnées et ajoutées au stock." });
      setReceivingOrder(null);
      setReceiptForm({});
      fetchOrders();
      onProductsRefresh();
    } catch (err) {
      setReceiveMsg({ ok: false, text: err.message || "Impossible de réceptionner la commande." });
    } finally {
      setReceiving(false);
    }
  }

  return (
    <div>
      <div className="procurement-summary" aria-label="Résumé des commandes d’achat">
        <div className="procurement-summary-card">
          <div className="procurement-summary-label">Commandes ouvertes</div>
          <div className="procurement-summary-value">{orderSummary.open}</div>
          <div className="procurement-summary-help">Brouillon ou en attente de livraison</div>
        </div>
        <div className="procurement-summary-card">
          <div className="procurement-summary-label">À réceptionner</div>
          <div className="procurement-summary-value">{orderSummary.placed}</div>
          <div className="procurement-summary-help">Passées auprès d’un fournisseur</div>
        </div>
        <div className="procurement-summary-card">
          <div className="procurement-summary-label">Réceptionnées</div>
          <div className="procurement-summary-value">{orderSummary.received}</div>
          <div className="procurement-summary-help">Ajoutées au stock</div>
        </div>
        <div className="procurement-summary-card">
          <div className="procurement-summary-label">Valeur des commandes</div>
          <div className="procurement-summary-value">{moneyLabel(totalSpend)}</div>
          <div className="procurement-summary-help">Toutes les commandes d’achat</div>
        </div>
      </div>

      <div className="grid">
      <Panel title="Vue d’ensemble des achats" icon={<Boxes size={16} />}>
        <div className="tag-meta" style={{ marginBottom: 12 }}>
          <Chip>{`Dépenses totales : ${totalSpend.toFixed(3)} TND`}</Chip>
          <Chip>{`${orders.length} commande(s) au total`}</Chip>
          <Chip>{`${orderSummary.cancelled} cancelled`}</Chip>
        </div>
        {spendBreakdown.length === 0 ? (
          <Empty>Aucune commande — les totaux apparaîtront ici une fois les achats créés.</Empty>
        ) : (
          spendBreakdown.map((row) => (
            <ShelfTag key={row.supplierId} style={{ marginBottom: 8 }}>
              <div className="tag-row">
                <div>
                  <div className="tag-name">{row.name}</div>
                  <div className="tag-sku">{row.orders} commande(s) d’achat</div>
                </div>
                <Chip>{row.total.toFixed(3)} TND</Chip>
              </div>
            </ShelfTag>
          ))
        )}
      </Panel>

      <Panel title="Nouvelle commande d’achat" icon={<Plus size={16} />}>
        <Message ok={msg?.ok} text={msg?.text} />
        <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "-4px 0 16px" }}>
          Indiquez ce que vous souhaitez acheter. Le stock ne change qu’après réception des marchandises.
        </p>
        <form onSubmit={handleCreateOrder}>
          <Field label="Fournisseur">
            <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
              <option value="">Sélectionner un fournisseur…</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Produit">
            <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
              <option value="">Sélectionner un produit…</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>
              ))}
            </select>
          </Field>
          <Field label="Quantité">
            <input
              type="number"
              min="0.001"
              step={selectedProduct?.unitType === "WEIGHT" ? "0.001" : "1"}
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </Field>
          <Field label="Coût unitaire (TND)">
            <input type="number" min="0" step="0.001" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} placeholder="2.300" />
          </Field>
          <button type="submit" className="btn btn-primary" disabled={creating} style={{ width: "100%", justifyContent: "center" }}>
            <Plus size={15} />
            {creating ? "Création…" : "Créer la commande"}
          </button>
        </form>
      </Panel>

      <Panel
        title="Commandes d’achat"
        icon={<Package size={16} />}
        right={
          <button className="btn" onClick={fetchOrders} disabled={loading} style={{ padding: "5px 10px" }}>
            <RefreshCw size={13} /> Actualiser
          </button>
        }
      >
        <Message ok={false} text={error} />
        {!error && orders.length === 0 && !loading && <Empty>Aucune commande d’achat pour le moment.</Empty>}
        {orders.map((order) => (
          <ShelfTag key={order.id}>
            <div className="procurement-order-header">
              <div>
                <div className="tag-name">{order.supplierName || order.supplierId}</div>
                <div className="tag-sku">Commande d’achat · {order.id.slice(0, 8)}</div>
              </div>
              <span className={`chip order-status order-status-${String(order.status || "").toLowerCase()}`}>
                {statusLabel(order.status)}
              </span>
            </div>
            <div className="procurement-order-lines">
              {(order.lines || []).slice(0, 3).map((line) => (
                <div className="procurement-order-line" key={line.id}>
                  <span>{productLabel(products, line.productId)}</span>
                  <strong>{line.quantity} {line.unitType === "WEIGHT" ? "kg" : "unités"}</strong>
                </div>
              ))}
              {(order.lines || []).length > 3 && <span>+ {(order.lines || []).length - 3} produit(s) supplémentaire(s)</span>}
              {(order.lines || []).length === 0 && <span>Aucun produit dans cette commande</span>}
            </div>
            <div className="procurement-order-actions">
              <Chip>{order.lines?.length ? order.lines.length + " ligne(s)" : "Aucune ligne"}</Chip>
              <Chip>{moneyLabel(order.totalCost)}</Chip>
              {order.status === "DRAFT" && (
                <button type="button" className="btn btn-primary btn-small" disabled={actionKey} onClick={() => handleAction(order.id, "place")}>
                  <Send size={13} /> {actionKey === `${order.id}:place` ? "Passage…" : "Passer la commande"}
                </button>
              )}
              {order.status === "PLACED" && (
                <button type="button" className="btn btn-primary btn-small" disabled={actionKey} onClick={() => openReceive(order)}>
                  <PackageCheck size={13} /> Réceptionner les marchandises
                </button>
              )}
              {(order.status === "DRAFT" || order.status === "PLACED") && (
                <button type="button" className="btn btn-danger btn-small" disabled={actionKey} onClick={() => handleAction(order.id, "cancel")}>
                  <Ban size={13} /> Annuler
                </button>
              )}
            </div>
          </ShelfTag>
        ))}
      </Panel>

      </div>

      {receivingOrder && (
        <Modal
          title={`Réceptionner la commande de ${receivingOrder.supplierName || receivingOrder.supplierId}`}
          icon={<Truck size={16} />}
          onClose={() => setReceivingOrder(null)}
        >
          <Message ok={receiveMsg?.ok} text={receiveMsg?.text} />
          <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: -6 }}>
            Saisissez les informations de lot et d’expiration pour chaque produit commandé. Les numéros de lot vides sont générés automatiquement.
          </p>
          <form onSubmit={handleReceive}>
            {(receivingOrder.lines || []).map((line) => {
              const product = products.find((candidate) => candidate.id === line.productId);
              const draft = receiptForm[line.id] || {};
              const unitLabel = draft.unitType === "WEIGHT" ? "kg" : "unités";
              return (
                <div key={line.id} style={{ borderTop: "1px solid var(--hairline)", paddingTop: 12, marginTop: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>{product?.name || line.productId}</div>
                  <Field label={`Quantité (${unitLabel})`}>
                    <input
                      type="number"
                      min="0.001"
                      step={draft.unitType === "WEIGHT" ? "0.001" : "1"}
                      value={draft.quantityValue || ""}
                      onChange={(event) => updateReceiptLine(line.id, "quantityValue", event.target.value)}
                    />
                  </Field>
                  <Field label="Numéro de lot (facultatif)">
                    <input
                      type="text"
                      value={draft.lotNumber || ""}
                      onChange={(event) => updateReceiptLine(line.id, "lotNumber", event.target.value)}
                      placeholder="Généré automatiquement"
                    />
                  </Field>
                  <Field label={`Date d’expiration${product?.perishable ? " (obligatoire)" : " (facultatif)"}`}>
                    <input
                      type="date"
                      value={draft.expiryDate || ""}
                      onChange={(event) => updateReceiptLine(line.id, "expiryDate", event.target.value)}
                    />
                  </Field>
                  <Field label="Référence fournisseur (facultatif)">
                    <input
                      type="text"
                      value={draft.supplierReference || ""}
                      onChange={(event) => updateReceiptLine(line.id, "supplierReference", event.target.value)}
                    />
                  </Field>
                </div>
              );
            })}
            <button type="submit" className="btn btn-primary" disabled={receiving} style={{ width: "100%", justifyContent: "center", marginTop: 12 }}>
              {receiving ? "Réception…" : "Confirmer la réception"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function AlertsTab({ products }) {
  const { request } = useApi();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await request("/api/procurement/alerts");
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Impossible de joindre le service des alertes.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  async function acknowledge(alertId) {
    try {
      await request(`/api/procurement/alerts/${alertId}/acknowledge`, { method: "POST" });
      fetchAlerts();
    } catch (err) {
      setError(err.message || "Impossible de traiter l’alerte.");
    }
  }

  return (
    <div className="grid">
      <Panel
        title="Alertes de stock faible"
        icon={<AlertTriangle size={16} />}
        right={
          <button className="btn" onClick={fetchAlerts} disabled={loading} style={{ padding: "5px 10px" }}>
            <RefreshCw size={13} /> Actualiser
          </button>
        }
      >
        <Message ok={false} text={error} />
        {!error && alerts.length === 0 && !loading && <Empty>Aucune alerte de stock faible pour le moment.</Empty>}
        {alerts.map((alert) => (
          <ShelfTag key={alert.id}>
            <div className="tag-row">
              <div>
                <div className="tag-name">{productLabel(products, alert.productId)}</div>
              <div className="tag-sku">Créée le {new Date(alert.createdAt).toLocaleString("fr-FR")}</div>
              </div>
              <Chip warn={!alert.acknowledged}>{alert.acknowledged ? "Traitée" : "Ouverte"}</Chip>
            </div>
            {!alert.acknowledged && (
              <div className="tag-meta">
                <button type="button" className="btn" onClick={() => acknowledge(alert.id)} style={{ padding: "5px 8px" }}>
                  <CheckCircle2 size={13} style={{ marginRight: 4 }} /> Marquer comme traitée
                </button>
              </div>
            )}
          </ShelfTag>
        ))}
      </Panel>
    </div>
  );
}
