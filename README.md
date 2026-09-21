# Supermarket ERP — Frontend

React 18 / Vite 5 web application for the single-store grocery ERP.  
The UI provides a live dashboard, six business modules (Inventory, Pricing, POS, Procurement, Finance, and Admin), and a standalone phone barcode-scanner page.

---

## Technology stack

| Technology | Version | Purpose |
|---|---|---|
| React | 18 | UI framework |
| React Router DOM | 6 | Client-side routing |
| Vite | 5 | Dev server and production bundler |
| `@vitejs/plugin-basic-ssl` | 1 | Local self-signed HTTPS (dev only) |
| `lucide-react` | — | Icon library |
| `qrcode.react` | — | QR code generation for phone scanner pairing |
| `@zxing/browser` | — | Barcode scanning in the browser (phone scanner page) |

---

## Requirements

| Dependency | Minimum |
|---|---|
| Node.js | 18 |
| npm | bundled with Node.js |
| Backend | Running at `http://localhost:8080` (or configured via `VITE_API_BASE_URL`) |

---

## Install and run

```powershell
npm install
npm run dev
```

Open **`https://localhost:5173`**.  
The dev server uses a self-signed certificate — accept the browser security warning once.

### Build for production

```powershell
npm run build       # Produces dist/
npm run preview     # Serves the production bundle locally
```

---

## Configuration

The Vite dev server listens on `0.0.0.0:5173` and proxies `/api` to `http://localhost:8080`.

Create a `.env.local` file (ignored by git) to override the defaults:

```dotenv
VITE_API_BASE_URL=http://localhost:8080
VITE_PUBLIC_APP_URL=https://192.168.1.25:5173
```

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | empty (uses current origin) | API base URL used by `apiClient.jsx` |
| `VITE_PUBLIC_APP_URL` | current browser origin | URL encoded in the phone-scanner QR code |

Set `VITE_PUBLIC_APP_URL` to the host machine's LAN IP address (e.g. `https://192.168.1.25:5173`) so phones on the store Wi-Fi can open the scanner page.

> **Never put secrets in `VITE_*` variables** — Vite bundles them into browser-visible JavaScript.

Restart Vite after editing `.env.local`.

---

## Application routes

| Route | Screen | Who can access |
|---|---|---|
| `/dashboard` | Operational summary: products, prices, alerts, tills, recent transactions | All roles |
| `/inventory` | Product catalog, stock receiving, stock levels and lots | ADMIN, MANAGER, INVENTORY_MANAGER |
| `/pricing` | Product prices and promotions | ADMIN, MANAGER, INVENTORY_MANAGER |
| `/pos` | Till selection, cashier sessions, sale tickets, checkout, phone pairing | ADMIN, MANAGER, CASHIER |
| `/procurement` | Suppliers, purchase orders, goods receipt, low-stock alerts | ADMIN, MANAGER, INVENTORY_MANAGER |
| `/finance` | Journals, P&L report, supplier invoices, payments | ADMIN, MANAGER, ACCOUNTANT |
| `/users` | User and role management (admin only) | ADMIN |
| `/scanner` | Phone barcode-scanner page (opened via QR link from POS) | Scanner token |

`/` redirects to `/dashboard`. Unknown routes also redirect to `/dashboard`.

---

## Role-to-module visibility

| Role | Visible modules |
|---|---|
| `ADMIN` | Dashboard, Inventory, Pricing, POS, Procurement, Finance, Users |
| `MANAGER` | Dashboard, Inventory, Pricing, POS, Procurement, Finance |
| `CASHIER` | Dashboard, POS |
| `INVENTORY_MANAGER` | Dashboard, Inventory, Pricing, Procurement |
| `ACCOUNTANT` | Dashboard, Finance |

Module visibility is enforced in the navigation and routing. The backend enforces the same rules on every API call — frontend hiding is convenience only.

---

## Source organisation

```text
src/
├── main.jsx                              React entry point; mounts <App /> with providers
├── App.jsx                               Application shell: navigation, routes, connection status
├── auth/
│   └── AuthContext.jsx                   JWT storage, login/logout, current-user state
├── lib/
│   └── apiClient.jsx                     Shared fetch client (bearer-token, JSON, connection status)
├── design/
│   ├── tokens.css                        Global design tokens: colors, typography, spacing
│   └── components.jsx                    Shared UI components (Button, Card, Modal, Table, …)
└── modules/
    ├── dashboard/
    │   └── DashboardModule.jsx           Summary cards, alert banners, quick-stats
    ├── inventory/
    │   └── InventoryModule.jsx           Products, product families, stock levels and lots
    ├── pricing/
    │   └── PricingModule.jsx             Product prices and time-bounded promotions
    ├── pos/
    │   ├── POSModule.jsx                 Tills, cashier sessions, transactions, checkout
    │   └── PhoneScannerPage.jsx          Standalone phone scanner (accessed via QR link)
    ├── procurement/
    │   └── ProcurementModule.jsx         Suppliers, purchase orders, receiving, alerts
    ├── finance/
    │   └── FinanceModule.jsx             Journals, P&L, supplier invoices, payments
    └── admin/
        └── UsersModule.jsx               User list, role management, enable/disable
```

Each module is self-contained: it fetches data through `useApi()`, maintains its own local state, and refreshes after mutations. There is no shared global state store.

---

## API client

`src/lib/apiClient.jsx` exposes `<ApiProvider>` (mount at root) and the `useApi()` hook.

```jsx
import { useApi } from '../lib/apiClient';

function MyComponent() {
  const { request } = useApi();

  // GET
  const products = await request('/api/inventory/products');

  // POST with a JSON body
  await request('/api/inventory/products', {
    method: 'POST',
    body: { sku: 'MILK-001', name: 'Full-Fat Milk', unitType: 'EACH' },
  });

  // DELETE
  await request(`/api/pricing/prices/${productId}`, { method: 'DELETE' });
}
```

The client automatically:

- Reads the stored JWT and adds `Authorization: Bearer <token>` to every request.
- Adds `Content-Type: application/json` when a body is provided.
- Parses successful JSON responses; returns `null` for empty `204` responses.
- Extracts the backend `message` field from error responses.
- Tracks connection status (`unknown` / `ok` / `fail`) shown in the top-right corner of the shell.

---

## Authentication flow

1. On load, the frontend calls `GET /api/auth/setup-status`.
2. If no admin exists, the **Admin Setup** form is shown (first-run only).
3. After setup or on subsequent visits, the **Login** page is shown.
4. On successful login the JWT is stored in `localStorage` and the user is redirected to `/dashboard`.
5. Signing out removes the JWT and returns to the login page.
6. Role changes take effect on the next login.

---

## Phone scanner (store LAN)

The phone scanner lets a cashier scan barcodes with a phone while the POS ticket is open on the till computer.

### Setup steps

1. Start the frontend with Vite bound to `0.0.0.0` (the default dev config).
2. Find the till computer's LAN IP address, e.g. `192.168.1.25`.
3. Set `VITE_PUBLIC_APP_URL=https://192.168.1.25:5173` in `.env.local` and restart Vite.
4. Open **`https://192.168.1.25:5173/pos`** on the till computer (not `localhost`).
5. Start a transaction, tap **Use phone**, and scan the displayed QR code with the phone.
6. Both devices must be on the same Wi-Fi network. Accept the self-signed certificate on the phone.

The pairing expires after 30 minutes. Pairings are stored in backend memory and are lost on backend restart.

---

## Development guidelines

- **Module isolation** — keep all screen logic, API calls, and local state inside the module folder.
- **Shared design** — reuse `design/components.jsx` and `design/tokens.css` before adding one-off styles.
- **API calls** — always use `useApi()` so connection status and error handling stay consistent.
- **API paths** — keep all paths under `/api` so the Vite proxy works without extra configuration.
- **Build before committing** — run `npm run build` to catch JSX syntax and bundling errors early.
- **Permissions** — keep frontend role checks aligned with backend security rules; frontend hiding is for UX, not security.

---

## Backend dependency

The frontend expects the backend described in [../ERP/README.md](../ERP/README.md).

```powershell
cd ..\ERP
.\mvnw.cmd spring-boot:run
```

If the backend is hosted elsewhere, set `VITE_API_BASE_URL` to its base URL.  
The backend must allow the browser origin in its CORS configuration.
