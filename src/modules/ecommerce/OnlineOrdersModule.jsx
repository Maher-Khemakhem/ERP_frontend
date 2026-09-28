import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, Clock3, PackageCheck, RefreshCw, Search, ShoppingBag } from "lucide-react";
import { useApi } from "../../lib/apiClient.jsx";
import { Empty, Message, Panel } from "../../design/components.jsx";
import "./onlineOrders.css";

const STATUSES = ["ALL", "PENDING_PAYMENT", "EXPIRED", "CONFIRMED", "PREPARING", "READY", "COMPLETED", "CANCELLED"];

function money(value) {
  const amount = Number.parseFloat(String(value ?? "").replace(/\s*TND\s*$/i, ""));
  return Number.isFinite(amount) ? `${amount.toFixed(3)} TND` : "—";
}

function statusLabel(status) {
  return {
    PENDING_PAYMENT: "En attente de paiement",
    EXPIRED: "Expirée",
    CONFIRMED: "Confirmée",
    PREPARING: "En préparation",
    READY: "Prête",
    COMPLETED: "Terminée",
    CANCELLED: "Annulée",
  }[status] || status;
}

function nextStatus(status) {
  return { CONFIRMED: "PREPARING", PREPARING: "READY", READY: "COMPLETED" }[status] || null;
}

function actionLabel(status) {
  return { CONFIRMED: "Commencer la préparation", PREPARING: "Marquer comme prête", READY: "Terminer la commande" }[status] || null;
}

function dateLabel(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("fr-TN", { dateStyle: "medium", timeStyle: "short" });
}

export default function OnlineOrdersModule() {
  const { request } = useApi();
  const [orders, setOrders] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await request("/api/online-orders");
      const list = Array.isArray(data) ? data : [];
      setOrders(list);
      setSelectedId((current) => current && list.some((order) => order.id === current) ? current : list[0]?.id || null);
    } catch (err) {
      setError(err.message || "Impossible de charger les commandes en ligne.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    refresh();
    const intervalId = window.setInterval(refresh, 60000);
    return () => window.clearInterval(intervalId);
  }, [refresh]);

  const visibleOrders = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = statusFilter === "ALL" || order.status === statusFilter;
      const matchesSearch = !needle || order.orderNumber?.toLowerCase().includes(needle)
        || order.customerId?.toLowerCase().includes(needle)
        || order.customerUsername?.toLowerCase().includes(needle)
        || order.customerName?.toLowerCase().includes(needle);
      return matchesStatus && matchesSearch;
    });
  }, [orders, search, statusFilter]);

  const selected = visibleOrders.find((order) => order.id === selectedId) || visibleOrders[0] || null;
  const counts = useMemo(() => ({
    active: orders.filter((order) => ["CONFIRMED", "PREPARING", "READY"].includes(order.status)).length,
    preparing: orders.filter((order) => order.status === "PREPARING").length,
    ready: orders.filter((order) => order.status === "READY").length,
    completed: orders.filter((order) => order.status === "COMPLETED").length,
  }), [orders]);

  async function advanceOrder(order) {
    const status = nextStatus(order.status);
    if (!status) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await request(`/api/online-orders/${order.id}/status`, {
        method: "PATCH",
        body: { status },
      });
      setOrders((current) => current.map((item) => item.id === updated.id ? updated : item));
      setMessage({ ok: true, text: `${order.orderNumber} : ${statusLabel(status).toLowerCase()}.` });
    } catch (err) {
      setMessage({ ok: false, text: err.message || "Impossible de modifier le statut." });
    } finally {
      setSaving(false);
    }
  }

  async function cancelOrder(order) {
    if (!window.confirm(`Annuler la commande impayée ${order.orderNumber} et libérer son stock réservé ?`)) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await request(`/api/online-orders/${order.id}/cancel`, { method: "POST" });
      setOrders((current) => current.map((item) => item.id === updated.id ? updated : item));
      setMessage({ ok: true, text: `${order.orderNumber} : ${statusLabel(updated.status).toLowerCase()}.` });
    } catch (err) {
      setMessage({ ok: false, text: err.message || "Impossible d'annuler la commande." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="online-orders-module">
      <div className="online-orders-heading">
        <div>
          <p className="online-orders-kicker">Ventes e-commerce</p>
          <h1 className="page-title">Commandes en ligne</h1>
          <p className="online-orders-subtitle">Consultez les achats clients et suivez leur préparation.</p>
        </div>
        <button className="btn" onClick={refresh} disabled={loading}><RefreshCw size={15} /> Actualiser</button>
      </div>

      <div className="online-order-stats">
        <StatCard icon={<ShoppingBag size={17} />} label="En cours" value={counts.active} />
        <StatCard icon={<Clock3 size={17} />} label="En préparation" value={counts.preparing} />
        <StatCard icon={<PackageCheck size={17} />} label="Prêtes" value={counts.ready} />
        <StatCard icon={<BadgeCheck size={17} />} label="Terminées" value={counts.completed} />
      </div>

      <Message ok={message?.ok} text={message?.text || error} />

      <div className="online-orders-workspace">
        <Panel title={`File des commandes (${visibleOrders.length})`} icon={<ShoppingBag size={16} />}>
          <div className="online-order-filters">
            <label className="online-order-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="N° commande ou client" /></label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrer par statut">
              {STATUSES.map((status) => <option key={status} value={status}>{status === "ALL" ? "Tous les statuts" : statusLabel(status)}</option>)}
            </select>
          </div>

          {loading ? <div className="online-orders-loading">Chargement des commandes…</div>
            : visibleOrders.length === 0 ? <Empty>Aucune commande ne correspond à ce filtre.</Empty>
              : <div className="online-order-list">{visibleOrders.map((order) => (
                <button key={order.id} className={`online-order-list-item ${selected?.id === order.id ? "selected" : ""}`} onClick={() => setSelectedId(order.id)}>
                  <span className="online-order-list-main"><strong>{order.orderNumber}</strong><small>{dateLabel(order.createdAt)}</small><small>{order.customerName || order.customerUsername || order.customerId?.slice(0, 8) || "Client inconnu"}</small></span>
                  <span className="online-order-list-side"><b>{money(order.totalAmount)}</b><StatusPill status={order.status} /></span>
                </button>
              ))}</div>}
        </Panel>

        <Panel title="Détail de la commande" icon={<PackageCheck size={16} />}>
          {!selected ? <Empty>Sélectionnez une commande pour afficher ses détails.</Empty> : <OrderDetails order={selected} saving={saving} onAdvance={() => advanceOrder(selected)} onCancel={() => cancelOrder(selected)} />}
        </Panel>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return <div className="online-order-stat"><span>{icon}</span><small>{label}</small><strong>{value}</strong></div>;
}

function StatusPill({ status }) {
  return <span className={`online-order-status status-${status?.toLowerCase()}`}>{statusLabel(status)}</span>;
}

function OrderDetails({ order, saving, onAdvance, onCancel }) {
  const next = nextStatus(order.status);
  return <div className="online-order-detail">
    <div className="online-order-detail-head"><div><small>Référence</small><h2>{order.orderNumber}</h2></div><StatusPill status={order.status} /></div>
    <div className="online-order-meta">
      <div><small>Client</small><strong title={order.customerId}>{order.customerName || order.customerUsername || "Client"}</strong></div>
      <div><small>Identifiant client</small><strong title={order.customerId}>{order.customerUsername || order.customerId}</strong></div>
      <div><small>Créée le</small><strong>{dateLabel(order.createdAt)}</strong></div>
      <div><small>Confirmée le</small><strong>{dateLabel(order.confirmedAt)}</strong></div>
      <div><small>Échéance de paiement</small><strong>{dateLabel(order.expiresAt)}</strong></div>
      {order.cancelledAt && <div><small>Annulée le</small><strong>{dateLabel(order.cancelledAt)}</strong></div>}
      {order.expiredAt && <div><small>Expirée le</small><strong>{dateLabel(order.expiredAt)}</strong></div>}
      <div><small>Référence paiement</small><strong>{order.paymentReference || "En attente"}</strong></div>
    </div>

    <div className="online-order-lines-heading"><h3>Articles commandés</h3><span>{order.lines?.length || 0} article(s)</span></div>
    <div className="online-order-lines">{(order.lines || []).map((line) => <div className="online-order-line" key={line.productId}>
      <div><strong>{line.productName}</strong><small>{line.quantity} · {money(line.unitPrice)} / {line.unitType === "WEIGHT" ? "kg" : "unité"}</small></div>
      <strong>{money(line.lineTotal)}</strong>
    </div>)}</div>

    <div className="online-order-totals">
      <div><span>Montant net</span><strong>{money(order.netAmount)}</strong></div>
      <div><span>TVA</span><strong>{money(order.vatAmount)}</strong></div>
      <div className="grand-total"><span>Total</span><strong>{money(order.totalAmount)}</strong></div>
    </div>
    {next && <button className="btn btn-primary online-order-advance" onClick={onAdvance} disabled={saving}>{saving ? "Mise à jour…" : actionLabel(order.status)}</button>}
    {order.status === "PENDING_PAYMENT" && <button className="btn online-order-cancel" onClick={onCancel} disabled={saving}>{saving ? "Mise à jour…" : "Annuler et libérer le stock"}</button>}
  </div>;
}
