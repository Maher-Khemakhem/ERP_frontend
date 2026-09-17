import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowRight, Boxes, CircleDollarSign, LayoutGrid, PackagePlus, RefreshCw, ShoppingCart, Tag, TrendingUp, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { useApi } from "../../lib/apiClient.jsx";
import { Panel, Message, Empty } from "../../design/components.jsx";

function formatTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

function productName(products, productId) {
  const match = products.find((p) => p.id === productId);
  return match ? `${match.name} (${match.sku})` : productId;
}

function localDayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function SalesBars({ points, loading }) {
  const maxValue = Math.max(...points.map((point) => point.amount), 1);
  const periodTotal = points.reduce((sum, point) => sum + point.amount, 0);

  return (
    <div className="sales-chart">
      <div className="sales-chart-summary">
        <div><strong>{loading ? "—" : `${periodTotal.toFixed(3)} TND`}</strong><span>ventes des 7 derniers jours</span></div>
        <TrendingUp size={18} aria-hidden="true" />
      </div>
      <div className="sales-bars" role="img" aria-label="Ventes des sept derniers jours">
        {points.map((point) => (
          <div className="sales-bar-column" key={point.key} title={`${point.label}: ${point.amount.toFixed(3)} TND`}>
            <div className="sales-bar-track"><span className="sales-bar" style={{ height: `${Math.max((point.amount / maxValue) * 100, point.amount ? 8 : 2)}%` }} /></div>
            <span className="sales-bar-label">{point.label}</span>
          </div>
        ))}
      </div>
      <div className="sales-chart-foot">Chaque barre indique le montant des tickets terminés ce jour-là.</div>
    </div>
  );
}

function ReadinessChart({ totals, data }) {
  const productCoverage = totals.productCount ? Math.round((totals.priceCount / totals.productCount) * 100) : 0;
  const tillCoverage = data.tills.length ? Math.round((totals.openTills / data.tills.length) * 100) : 0;
  const alertClearance = data.alerts.length ? Math.round((data.alerts.filter((alert) => alert.acknowledged).length / data.alerts.length) * 100) : 100;
  const rows = [
    { label: "Catalogue tarifé", value: productCoverage, detail: `${totals.priceCount} sur ${totals.productCount} produits` },
    { label: "Caisses actives", value: tillCoverage, detail: `${totals.openTills} sur ${data.tills.length} caisses ouvertes` },
    { label: "Alertes traitées", value: alertClearance, detail: `${data.alerts.filter((alert) => alert.acknowledged).length} sur ${data.alerts.length} alertes reconnues` },
  ];

  return (
    <div className="readiness-chart">
      {rows.map((row) => (
        <div className="readiness-row" key={row.label}>
          <div className="readiness-heading"><span>{row.label}</span><strong>{row.value}%</strong></div>
          <div className="readiness-track"><span style={{ width: `${row.value}%` }} /></div>
          <small>{row.detail}</small>
        </div>
      ))}
    </div>
  );
}

export default function DashboardModule() {
  const { request, hasAnyRole } = useApi();
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
        setError("Certains services sont actuellement injoignables.");
      }
    } catch {
      setError("Impossible de charger le tableau de bord du magasin.");
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

  const salesTrend = useMemo(() => {
    const now = new Date();
    const points = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setHours(0, 0, 0, 0);
      date.setDate(now.getDate() - (6 - index));
      return {
        key: localDayKey(date),
        label: date.toLocaleDateString("fr-FR", { weekday: "short" }),
        amount: 0,
      };
    });
    const pointByDay = new Map(points.map((point) => [point.key, point]));

    data.transactions.forEach((transaction) => {
      if ((transaction.status || "").toUpperCase() !== "COMPLETED") return;
      const date = new Date(transaction.completedAt || transaction.startedAt);
      if (Number.isNaN(date.getTime())) return;
      const point = pointByDay.get(localDayKey(date));
      if (!point) return;
      const amount = Number.parseFloat(String(transaction.total).replace(/[^\d.-]/g, ""));
      if (Number.isFinite(amount)) point.amount += amount;
    });

    return points;
  }, [data.transactions]);

  const recentActivity = useMemo(() => {
    const activity = [
      ...data.alerts
        .filter((alert) => alert && alert.id)
        .map((alert) => ({
          id: `alert-${alert.id}`,
          type: "alert",
          label: `${productName(data.products, alert.productId)} est sous le seuil de réapprovisionnement`,
          detail: `Stock ${alert.currentStock ?? 0} / seuil ${alert.reorderPoint ?? 0}`,
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
          label: tx.status === "COMPLETED" ? "Vente terminée" : `Transaction ${tx.status?.toLowerCase() || "mise à jour"}`,
          detail: tx.total ? `${tx.total} TND` : "Aucun total enregistré",
          when: tx.completedAt || tx.startedAt,
          tone: tx.status === "COMPLETED" ? "ok" : "muted",
        })),
    ]
      .sort((a, b) => new Date(b.when || 0) - new Date(a.when || 0))
      .slice(0, 6);

    return activity;
  }, [data]);

  const statCards = [
    { label: "Produits", value: totals.productCount, detail: `${totals.priceCount} avec un prix de vente`, icon: Boxes, tone: "green" },
    {
      label: "Chiffre d’affaires total",
      value: `${totals.ticketEarnings.toFixed(3)} TND`,
      detail: `${totals.completedSales} tickets terminés`,
      icon: CircleDollarSign,
      tone: "green",
    },
    { label: "Caisses ouvertes", value: totals.openTills, detail: totals.openTills ? "tiroirs-caisses actifs" : "aucune session active", icon: ShoppingCart, tone: "amber" },
    { label: "Alertes ouvertes", value: totals.openAlerts, detail: totals.openAlerts ? "nécessite une attention" : "aucune alerte", icon: AlertTriangle, tone: "red" },
  ];

  return (
    <div>
      <div className="dashboard-heading">
        <div>
          <div className="dashboard-kicker">Vue d’ensemble des opérations</div>
          <h1 className="page-title">Aujourd’hui au magasin</h1>
          <p className="page-sub">Une vue claire de la surface de vente, des caisses et des points nécessitant votre attention.</p>
        </div>
        <button className="btn" onClick={loadDashboard} disabled={loading}>
          <RefreshCw size={14} className={loading ? "spin" : ""} />
          {loading ? "Actualisation…" : "Actualiser"}
        </button>
      </div>

      <Message ok={false} text={error} />

      {totals.openAlerts > 0 && (
        <div className="dashboard-alert-strip" role="status">
          <span className="dashboard-alert-icon"><AlertTriangle size={17} /></span>
          <div><strong>{totals.openAlerts} {totals.openAlerts === 1 ? "article nécessite" : "articles nécessitent"} une attention</strong><span>Consultez les alertes de stock faible avant la prochaine livraison.</span></div>
          <Link to="/procurement" className="dashboard-alert-link">Consulter les alertes <ArrowRight size={14} /></Link>
        </div>
      )}

      <div className="dashboard-actions" aria-label="Actions rapides">
        {hasAnyRole(["ADMIN", "MANAGER", "CASHIER"]) && (
          <Link className="dashboard-action" to="/pos">
            <ShoppingCart size={16} />
            <span><strong>Démarrer une vente</strong><small>Ouvrir la caisse</small></span>
            <ArrowRight size={15} />
          </Link>
        )}
        {hasAnyRole(["ADMIN", "MANAGER", "INVENTORY_MANAGER"]) && (
          <Link className="dashboard-action" to="/inventory">
            <PackagePlus size={16} />
            <span><strong>Réceptionner du stock</strong><small>Ajouter des produits ou des lots</small></span>
            <ArrowRight size={15} />
          </Link>
        )}
        {hasAnyRole(["ADMIN", "MANAGER", "INVENTORY_MANAGER"]) && (
          <Link className="dashboard-action" to="/procurement">
            <Truck size={16} />
            <span><strong>Suivre l’approvisionnement</strong><small>Commandes et alertes</small></span>
            <ArrowRight size={15} />
          </Link>
        )}
        {hasAnyRole(["ADMIN", "MANAGER", "INVENTORY_MANAGER"]) && (
          <Link className="dashboard-action" to="/pricing">
            <Tag size={16} />
            <span><strong>Modifier les prix</strong><small>Prix et promotions</small></span>
            <ArrowRight size={15} />
          </Link>
        )}
      </div>

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

      <div className="dashboard-grid two-up dashboard-analytics-grid">
        <Panel title="Rythme des ventes" icon={<TrendingUp size={16} />} className="dashboard-panel dashboard-chart-panel">
          <SalesBars points={salesTrend} loading={loading} />
        </Panel>
        <Panel title="Préparation du magasin" icon={<Activity size={16} />} className="dashboard-panel dashboard-chart-panel">
          <ReadinessChart totals={totals} data={data} />
        </Panel>
      </div>

      <div className="dashboard-grid two-up">
        <Panel title="Activité du magasin" icon={<Activity size={16} />} className="dashboard-panel">
          <div className="pulse-stack">
            <div className="pulse-row">
              <span>Ventes terminées</span>
              <strong>{totals.completedSales}</strong>
            </div>
            <div className="pulse-row">
              <span>Chiffre d’affaires des tickets</span>
              <strong>{totals.ticketEarnings.toFixed(3)} TND</strong>
            </div>
            <div className="pulse-row">
              <span>Suivi des approvisionnements</span>
              <strong>{totals.openAlerts === 0 ? "Satisfaisant" : `${totals.openAlerts} en attente`}</strong>
            </div>
          </div>
        </Panel>

        <Panel title="Activité récente" icon={<LayoutGrid size={16} />} className="dashboard-panel">
          {recentActivity.length === 0 ? (
            <Empty>Aucune activité pour le moment. Commencez par ajouter du stock ou ouvrir une caisse.</Empty>
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

    </div>
  );
}
