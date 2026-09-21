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
  { key: "dashboard", path: "/dashboard", label: "Tableau de bord", icon: LayoutGrid, status: "active", roles: ["ADMIN"], group: "Gérer le magasin" },
  { key: "pos", path: "/pos", label: "Caisse", icon: ShoppingCart, status: "active", roles: ["ADMIN", "MANAGER", "CASHIER"], group: "Gérer le magasin" },
  { key: "inventory", path: "/inventory", label: "Stock", icon: Package, status: "active", roles: ["ADMIN", "MANAGER", "INVENTORY_MANAGER"], group: "Stocks et approvisionnement" },
  { key: "pricing", path: "/pricing", label: "Tarification", icon: Tag, status: "active", roles: ["ADMIN", "MANAGER", "INVENTORY_MANAGER"], group: "Stocks et approvisionnement" },
  { key: "procurement", path: "/procurement", label: "Approvisionnement", icon: Truck, status: "active", roles: ["ADMIN", "MANAGER", "INVENTORY_MANAGER"], group: "Stocks et approvisionnement" },
  { key: "finance", path: "/finance", label: "Finance", icon: Wallet, status: "active", roles: ["ADMIN", "MANAGER", "ACCOUNTANT"], group: "Comptabilité" },
  { key: "users", path: "/users", label: "Utilisateurs", icon: Shield, status: "active", roles: ["ADMIN"], group: "Espace de travail" },
];

const NAV_GROUPS = ["Gérer le magasin", "Stocks et approvisionnement", "Comptabilité", "Espace de travail"];
const rolesFor = (key) => MODULES.find((module) => module.key === key)?.roles || [];

function moduleByKey(key) {
  return MODULES.find((module) => module.key === key);
}

function landingPathForRoles(roles = []) {
  return MODULES.find((module) => module.status === "active" && module.roles.some((role) => roles.includes(role)))?.path || "/";
}

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
        <span className="brand-sub">Opérations du magasin</span>
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
                const content = <><Icon size={17} /><span>{m.label}</span>{m.status === "soon" && <span className="badge">Bientôt</span>}</>;
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
        <button type="button" className="btn sidebar-signout" onClick={logout}><LogOut size={15} /> Se déconnecter</button>
      </div>
    </aside>
  );
}

function RoleRoute({ roles, children }) {
  const { auth, hasAnyRole } = useApi();
  return hasAnyRole(roles) ? children : <Navigate to={landingPathForRoles(auth?.user?.roles)} replace />;
}

function LandingRedirect() {
  const { auth } = useApi();
  return <Navigate to={landingPathForRoles(auth?.user?.roles)} replace />;
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
          <Route path="/" element={<LandingRedirect />} />
          <Route path="/dashboard" element={<RoleRoute roles={moduleByKey("dashboard").roles}><DashboardModule /></RoleRoute>} />
          <Route path="/inventory" element={<RoleRoute roles={moduleByKey("inventory").roles}><InventoryModule /></RoleRoute>} />
          <Route path="/pricing" element={<RoleRoute roles={moduleByKey("pricing").roles}><PricingModule /></RoleRoute>} />
          <Route path="/pos" element={<RoleRoute roles={moduleByKey("pos").roles}><POSModule /></RoleRoute>} />
          <Route path="/procurement" element={<RoleRoute roles={moduleByKey("procurement").roles}><ProcurementModule /></RoleRoute>} />
          <Route path="/finance" element={<RoleRoute roles={moduleByKey("finance").roles}><FinanceModule /></RoleRoute>} />
          <Route path="/users" element={<RoleRoute roles={moduleByKey("users").roles}><UserManagementModule /></RoleRoute>} />
          <Route path="*" element={<LandingRedirect />} />
        </Routes>
        <VisualRefreshStyles />
      </main>
    </div>
  );
}
