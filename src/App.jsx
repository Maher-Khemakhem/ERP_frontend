import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { LayoutGrid, Package, Tag, ShoppingCart, Truck, Wallet, Shield, LogOut } from "lucide-react";
import { useApi } from "./lib/apiClient.jsx";
import LoginPage from "./auth/LoginPage.jsx";
import DashboardModule from "./modules/dashboard/DashboardModule.jsx";
import InventoryModule from "./modules/inventory/InventoryModule.jsx";
import PricingModule from "./modules/pricing/PricingModule.jsx";
import POSModule from "./modules/pos/POSModule.jsx";
import ProcurementModule from "./modules/procurement/ProcurementModule.jsx";
import FinanceModule from "./modules/finance/FinanceModule.jsx";
import UserManagementModule from "./modules/admin/UserManagementModule.jsx";
import PhoneScannerPage from "./modules/pos/PhoneScannerPage.jsx";
import VisualRefreshStyles from "./design/VisualRefreshStyles.jsx";

const MODULES = [
  { key: "dashboard", path: "/dashboard", label: "Dashboard", icon: LayoutGrid, status: "active", roles: [], group: "Run the store" },
  { key: "pos", path: "/pos", label: "Point of sale", icon: ShoppingCart, status: "active", roles: ["ADMIN", "MANAGER", "CASHIER"], group: "Run the store" },
  { key: "inventory", path: "/inventory", label: "Inventory", icon: Package, status: "active", roles: ["ADMIN", "MANAGER", "INVENTORY_MANAGER"], group: "Stock & supply" },
  { key: "pricing", path: "/pricing", label: "Pricing", icon: Tag, status: "active", roles: ["ADMIN", "MANAGER", "INVENTORY_MANAGER"], group: "Stock & supply" },
  { key: "procurement", path: "/procurement", label: "Procurement", icon: Truck, status: "active", roles: ["ADMIN", "MANAGER", "INVENTORY_MANAGER"], group: "Stock & supply" },
  { key: "finance", path: "/finance", label: "Finance", icon: Wallet, status: "active", roles: ["ADMIN", "MANAGER", "ACCOUNTANT"], group: "Keep the books" },
  { key: "users", path: "/users", label: "Users", icon: Shield, status: "active", roles: ["ADMIN"], group: "Workspace" },
];

const NAV_GROUPS = ["Run the store", "Stock & supply", "Keep the books", "Workspace"];
const rolesFor = (key) => MODULES.find((module) => module.key === key)?.roles || [];

function Sidebar() {
  const location = useLocation();
  const { hasAnyRole, auth, logout } = useApi();
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-lockup">
          <span className="brand-symbol" aria-hidden="true">C</span>
          <span className="brand-mark">Counter</span>
        </div>
        <span className="brand-sub">Store operations</span>
      </div>
      <nav className="nav">
        {NAV_GROUPS.map((group) => {
          const groupModules = MODULES.filter((m) => m.group === group && hasAnyRole(m.roles));
          if (!groupModules.length) return null;
          return (
            <div className="nav-group" key={group}>
              <div className="nav-group-label">{group}</div>
              {groupModules.map((m) => {
                const Icon = m.icon;
                const active = location.pathname.startsWith(m.path);
                const content = <><Icon size={17} /><span>{m.label}</span>{m.status === "soon" && <span className="badge">Next</span>}</>;
                return m.status === "active" ? (
                  <Link key={m.key} to={m.path} className={`nav-item ${active ? "active" : ""}`}>{content}</Link>
                ) : <div key={m.key} className="nav-item soon">{content}</div>;
              })}
            </div>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-account">
          <span className="user-avatar">{(auth?.user?.displayName || auth?.user?.username || "U").slice(0, 1).toUpperCase()}</span>
          <span className="sidebar-account-copy">
            <strong>{auth?.user?.displayName || auth?.user?.username}</strong>
            <small>{auth?.user?.roles?.join(" · ")}</small>
          </span>
        </div>
        <button type="button" className="btn sidebar-signout" onClick={logout}><LogOut size={15} /> Sign out</button>
      </div>
    </aside>
  );
}

function RoleRoute({ roles, children }) {
  const { hasAnyRole } = useApi();
  return hasAnyRole(roles) ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  const { auth } = useApi();
  const normalizedPath = window.location.pathname.replace(/\/+$/, "") || "/";
  if (normalizedPath === "/scanner") {
    return <PhoneScannerPage />;
  }
  if (!auth?.user) {
    return <LoginPage />;
  }

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardModule />} />
          <Route path="/inventory" element={<RoleRoute roles={rolesFor("inventory")}><InventoryModule /></RoleRoute>} />
          <Route path="/pricing" element={<RoleRoute roles={rolesFor("pricing")}><PricingModule /></RoleRoute>} />
          <Route path="/pos" element={<RoleRoute roles={rolesFor("pos")}><POSModule /></RoleRoute>} />
          <Route path="/procurement" element={<RoleRoute roles={rolesFor("procurement")}><ProcurementModule /></RoleRoute>} />
          <Route path="/finance" element={<RoleRoute roles={rolesFor("finance")}><FinanceModule /></RoleRoute>} />
          <Route path="/users" element={<RoleRoute roles={rolesFor("users")}><UserManagementModule /></RoleRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <VisualRefreshStyles />
      </main>
    </div>
  );
}
