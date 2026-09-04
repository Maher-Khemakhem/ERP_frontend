import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Boxes, CircleDollarSign, LayoutGrid, ShoppingCart } from "lucide-react";
import { useApi } from "../../lib/apiClient.jsx";
import { Panel, Message, Empty } from "../../design/components.jsx";

function formatTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function productName(products, productId) {
  const match = products.find((p) => p.id === productId);
  return match ? `${match.name} (${match.sku})` : productId;
}

export default function DashboardModule() {
  const { request } = useApi();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    products: [],
    prices: [],
    alerts: [],
    tills: [],
    transactions: [],
  });

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [productsResult, pricesResult, alertsResult, tillsResult, transactionsResult] = await Promise.allSettled([
        request("/api/inventory/products"),
        request("/api/pricing/prices"),
        request("/api/procurement/alerts"),
        request("/api/pos/tills"),
        request("/api/pos/transactions"),
      ]);

      const products = productsResult.status === "fulfilled" && Array.isArray(productsResult.value) ? productsResult.value : [];
      const prices = pricesResult.status === "fulfilled" && Array.isArray(pricesResult.value) ? pricesResult.value : [];
      const alerts = alertsResult.status === "fulfilled" && Array.isArray(alertsResult.value) ? alertsResult.value : [];
      const tills = tillsResult.status === "fulfilled" && Array.isArray(tillsResult.value) ? tillsResult.value : [];
      const transactions = transactionsResult.status === "fulfilled" && Array.isArray(transactionsResult.value) ? transactionsResult.value : [];

      setData({ products, prices, alerts, tills, transactions });

      const failed = [productsResult, pricesResult, alertsResult, tillsResult, transactionsResult].filter((result) => result.status === "rejected");
      if (failed.length > 0 && products.length === 0 && prices.length === 0 && alerts.length === 0 && tills.length === 0 && transactions.length === 0) {
        setError("Some services are unreachable right now.");
      }
    } catch {
      setError("Could not load the store dashboard.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const totals = useMemo(() => {
    const openTills = data.tills.filter((t) => t.status === "OPEN").length;
    const openAlerts = data.alerts.filter((a) => !a.acknowledged).length;
    const completedTransactions = data.transactions.filter((t) => (t.status || "").toUpperCase() === "COMPLETED");
    const completedSales = completedTransactions.length;
    const ticketEarnings = completedTransactions.reduce((sum, txn) => {
      const value = Number.parseFloat(String(txn.total).replace(/[^\d.-]/g, ""));
      return Number.isFinite(value) ? sum + value : sum;
    }, 0);

    return {
      productCount: data.products.length,
      priceCount: data.prices.length,
      ticketEarnings,
      openTills,
      openAlerts,
      completedSales,
    };
  }, [data]);

  const recentActivity = useMemo(() => {
    const activity = [
      ...data.alerts
        .filter((alert) => alert && alert.id)
        .map((alert) => ({
          id: `alert-${alert.id}`,
          type: "alert",
          label: `${productName(data.products, alert.productId)} is below reorder point`,
          detail: `Stock ${alert.currentStock ?? 0} / reorder ${alert.reorderPoint ?? 0}`,
          when: alert.createdAt || alert.raisedAt,
          tone: "warn",
        })),
      ...data.transactions
        .filter((tx) => tx && tx.id)
        .slice()
        .sort((a, b) => new Date(b.completedAt || b.startedAt) - new Date(a.completedAt || a.startedAt))
        .slice(0, 4)
        .map((tx) => ({
          id: `txn-${tx.id}`,
          type: "transaction",
          label: tx.status === "COMPLETED" ? "Sale completed" : `Transaction ${tx.status?.toLowerCase() || "updated"}`,
          detail: tx.total ? `${tx.total} TND` : "No total recorded",
          when: tx.completedAt || tx.startedAt,
          tone: tx.status === "COMPLETED" ? "ok" : "muted",
        })),
    ]
      .sort((a, b) => new Date(b.when || 0) - new Date(a.when || 0))
      .slice(0, 6);

    return activity;
  }, [data]);

  const statCards = [
    { label: "Products", value: totals.productCount, detail: "active SKUs", icon: Boxes, tone: "green" },
    {
      label: "Total earnings",
      value: `${totals.ticketEarnings.toFixed(3)} TND`,
      detail: `${totals.completedSales} completed tickets`,
      icon: CircleDollarSign,
      tone: "green",
    },
    { label: "Open tills", value: totals.openTills, detail: totals.openTills ? "cash drawers live" : "no active session", icon: ShoppingCart, tone: "amber" },
    { label: "Open alerts", value: totals.openAlerts, detail: totals.openAlerts ? "needs attention" : "all clear", icon: AlertTriangle, tone: "red" },
  ];

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-sub">A quick view of the store: stock, pricing, cash and operational alerts.</p>

      <Message ok={false} text={error} />

      <div className="dashboard-grid">
        {statCards.map(({ label, value, detail, icon: Icon, tone }) => (
          <div key={label} className={`stat-card ${tone}`}>
            <div className="stat-head">
              <div className="stat-icon">
                <Icon size={18} />
              </div>
              <span className="stat-label">{label}</span>
            </div>
            <div className="stat-value">{loading ? "…" : value}</div>
            <div className="stat-detail">{detail}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid two-up">
        <Panel title="Store pulse" icon={<Activity size={16} />}>
          <div className="pulse-stack">
            <div className="pulse-row">
              <span>Completed sales</span>
              <strong>{totals.completedSales}</strong>
            </div>
            <div className="pulse-row">
              <span>Total ticket earnings</span>
              <strong>{totals.ticketEarnings.toFixed(3)} TND</strong>
            </div>
            <div className="pulse-row">
              <span>Procurement follow-up</span>
              <strong>{totals.openAlerts === 0 ? "Healthy" : `${totals.openAlerts} waiting`}</strong>
            </div>
          </div>
        </Panel>

        <Panel title="Recent activity" icon={<LayoutGrid size={16} />}>
          {recentActivity.length === 0 ? (
            <Empty>No live activity yet. Start by adding stock or opening a till.</Empty>
          ) : (
            <div className="activity-list">
              {recentActivity.map((item) => (
                <div key={item.id} className="activity-item">
                  <div className={`activity-dot ${item.tone}`} />
                  <div className="activity-copy">
                    <div className="activity-label">{item.label}</div>
                    <div className="activity-detail">{item.detail}</div>
                  </div>
                  <div className="activity-time">{formatTime(item.when)}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <button className="btn btn-primary" onClick={loadDashboard} disabled={loading} style={{ marginTop: 8 }}>
        {loading ? "Refreshing…" : "Refresh dashboard"}
      </button>
    </div>
  );
}
