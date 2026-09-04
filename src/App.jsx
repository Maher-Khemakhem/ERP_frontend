import { useState } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { LayoutGrid, Package, Tag, ShoppingCart, Truck, Wallet } from "lucide-react";
import { useApi } from "./lib/apiClient.jsx";
import DashboardModule from "./modules/dashboard/DashboardModule.jsx";
import InventoryModule from "./modules/inventory/InventoryModule.jsx";
import PricingModule from "./modules/pricing/PricingModule.jsx";
import POSModule from "./modules/pos/POSModule.jsx";
import ProcurementModule from "./modules/procurement/ProcurementModule.jsx";
import FinanceModule from "./modules/finance/FinanceModule.jsx";
import PhoneScannerPage from "./modules/pos/PhoneScannerPage.jsx";

const MODULES = [
  { key: "dashboard", path: "/dashboard", label: "Dashboard", icon: LayoutGrid, status: "active" },
  { key: "inventory", path: "/inventory", label: "Inventory", icon: Package, status: "active" },
  { key: "pricing", path: "/pricing", label: "Pricing", icon: Tag, status: "active" },
  { key: "pos", path: "/pos", label: "POS", icon: ShoppingCart, status: "active" },
  { key: "procurement", path: "/procurement", label: "Procurement", icon: Truck, status: "active" },
  { key: "finance", path: "/finance", label: "Finance", icon: Wallet, status: "active" },
];

function Sidebar() {
  const location = useLocation();
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">Counter</span>
        <span className="brand-sub">Store operations</span>
        <div className="barcode" aria-hidden="true">
          {[3, 1, 2, 1, 4, 1, 1, 3, 2, 1, 1, 4, 2, 1, 3, 1].map((w, i) => (
            <span key={i} style={{ width: `${w}px` }} />
          ))}
        </div>
      </div>
      <nav className="nav">
        {MODULES.map((m) => {
          const Icon = m.icon;
          const active = location.pathname.startsWith(m.path);
          const content = (
            <>
              <Icon size={16} />
              {m.label}
              {m.status === "soon" && <span className="badge">Next</span>}
            </>
          );
          return m.status === "active" ? (
            <Link key={m.key} to={m.path} className={`nav-item ${active ? "active" : ""}`}>
              {content}
            </Link>
          ) : (
            <div key={m.key} className="nav-item soon">
              {content}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function ApiConnectionControl() {
  const { apiBase, setApiBase, connection } = useApi();
  const [draft, setDraft] = useState(apiBase || window.location.origin);
  return (
    <form
      className="api-row"
      onSubmit={(e) => {
        e.preventDefault();
        setApiBase(draft.trim());
      }}
    >
      <span className={`dot ${connection}`} title={`API: ${connection}`} />
      <input type="text" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="API base URL" />
      <button type="submit" className="btn" style={{ padding: "5px 10px" }}>Set</button>
    </form>
  );
}

export default function App() {
  const normalizedPath = window.location.pathname.replace(/\/+$/, "") || "/";
  if (normalizedPath === "/scanner") {
    return <PhoneScannerPage />;
  }

  return (
    <div className="app">
      <ShellStyles />
      <Sidebar />
      <main className="main">
        <div className="topbar-anchor">
          <ApiConnectionControl />
        </div>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardModule />} />
          <Route path="/inventory" element={<InventoryModule />} />
          <Route path="/pricing" element={<PricingModule />} />
          <Route path="/pos" element={<POSModule />} />
          <Route path="/procurement" element={<ProcurementModule />} />
          <Route path="/finance" element={<FinanceModule />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

/** Shell-only layout styles. Module-specific styles live with their module. */
function ShellStyles() {
  return (
    <style>{`
      .app { display: flex; width: 100%; min-height: 100vh; }
      .sidebar {
        width: 220px; flex-shrink: 0; background: var(--green-deep); color: #EFF1E9;
        padding: 24px 16px; display: flex; flex-direction: column; gap: 28px;
      }
      .brand { display: flex; flex-direction: column; gap: 4px; padding: 0 4px; }
      .brand-mark { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 19px; letter-spacing: 0.02em; }
      .brand-sub { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #9FB4A3; letter-spacing: 0.06em; text-transform: uppercase; }
      .barcode { display: flex; gap: 2px; height: 20px; align-items: stretch; opacity: 0.55; }
      .barcode span { background: #EFF1E9; }
      .nav { display: flex; flex-direction: column; gap: 4px; }
      .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 6px; font-size: 14px; font-weight: 500; color: #C9D6CC; text-decoration: none; }
      .nav-item.active { background: #2F6844; color: #FFFFFF; }
      .nav-item.soon { color: #6E8375; cursor: default; }
      a.nav-item { cursor: pointer; }
      a.nav-item:hover:not(.active) { background: rgba(255,255,255,0.08); }
      .nav-item .badge { margin-left: auto; font-family: 'IBM Plex Mono', monospace; font-size: 9px; letter-spacing: 0.05em; background: rgba(255,255,255,0.12); padding: 2px 6px; border-radius: 3px; text-transform: uppercase; }
      .main { flex: 1; min-width: 0; padding: 28px 36px 48px; }
      .topbar-anchor { display: flex; justify-content: flex-end; margin-bottom: 8px; }
      .api-row { display: flex; align-items: center; gap: 8px; background: var(--surface); border: 1px solid var(--hairline); border-radius: 8px; padding: 6px 10px; }
      .api-row input { border: none; outline: none; font-family: 'IBM Plex Mono', monospace; font-size: 12.5px; width: 190px; background: transparent; color: var(--ink); }
      .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
      .dot.ok { background: var(--green); }
      .dot.fail { background: var(--red); }
      .dot.unknown { background: #B4B6A0; }
      .page-title { font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 26px; margin: 0; }
      .page-sub { color: var(--ink-soft); font-size: 13.5px; margin-top: 4px; margin-bottom: 24px; }
    `}</style>
  );
}
