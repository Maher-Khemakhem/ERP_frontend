# Supermarket ERP frontend

The `supermarket-erp` directory contains the React/Vite web application for the supermarket ERP. It provides the authenticated desktop shell for store operations plus a separate phone barcode-scanner page used by the POS.

The frontend is a client of the backend in [`../ERP/README.md`](../ERP/README.md). It does not contain business persistence or security enforcement: the API remains the source of truth for permissions and business rules.

## Technology

| Technology | Version | Use |
| --- | --- | --- |
| React | 18.3 | UI |
| React Router | 6.26 | Client-side routes |
| Vite | 5.4 | Development server and production build |
| `@zxing/browser` | 0.2 | Barcode decoding fallback |
| `qrcode.react` | 4.2 | POS scanner pairing QR codes |
| `lucide-react` | 0.383 | Icons |
| `@vitejs/plugin-basic-ssl` | 1.1 | Self-signed HTTPS in development |

## Requirements

- Node.js 18 or newer
- npm
- A running backend at `http://localhost:8080`, or a configured API base URL

## Run locally

From this directory:

```powershell
npm install
npm run dev
```

Open `https://localhost:5173`. Vite listens on `0.0.0.0:5173`, serves HTTPS with a development certificate, and proxies `/api` and `/uploads` to `http://localhost:8080`. Accept the certificate warning in the browser once.

Start the backend in a second terminal:

```powershell
cd ..\ERP
.\mvnw.cmd spring-boot:run
```

## Configuration

Create `.env.local` only when you need to override the defaults:

```dotenv
# Optional in local development: an empty value uses the Vite same-origin proxy.
VITE_API_BASE_URL=

# Optional: URL embedded in the POS phone-scanner QR code.
VITE_PUBLIC_APP_URL=https://192.168.1.25:5173
```

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | empty | Prefix for API requests. Empty uses the current origin and Vite's `/api` proxy during development. |
| `VITE_PUBLIC_APP_URL` | current browser origin | Public URL encoded into phone-scanner pairing links. |

`VITE_*` values are compiled into browser JavaScript. Never put passwords, JWT secrets, or other private values in them. Restart Vite after changing `.env.local`.

For a phone on the store LAN, set `VITE_PUBLIC_APP_URL` to the till computer's reachable LAN URL, not `localhost`.

## Available routes

| Route | Screen | Frontend access |
| --- | --- | --- |
| `/dashboard` | Operational summary | `ADMIN` only |
| `/inventory` | Products, families, stock, lots, receiving | `ADMIN`, `MANAGER`, `INVENTORY_MANAGER` |
| `/pricing` | Prices and promotions | `ADMIN`, `MANAGER`, `INVENTORY_MANAGER` |
| `/pos` | Tills, cash sessions, transactions, checkout, scanner pairing | `ADMIN`, `MANAGER`, `CASHIER` |
| `/procurement` | Suppliers, purchase orders, receiving, alerts | `ADMIN`, `MANAGER`, `INVENTORY_MANAGER` |
| `/finance` | Journals, P&L, supplier invoices, payments | `ADMIN`, `MANAGER`, `ACCOUNTANT` |
| `/users` | User and role administration | `ADMIN` only |
| `/scanner` | Standalone phone barcode scanner | Pairing token in the URL |

`/` and unknown routes redirect to the first module available to the signed-in user's roles. `/scanner` is intentionally outside the desktop authentication shell; the short-lived scanner token is checked by the backend.

The backend enforces these permissions independently. Hiding a route in the frontend is only a usability feature, not a security boundary.

## First login

1. The login page calls `GET /api/auth/setup-status`.
2. If the database has no users, it shows the first-admin form.
3. The first account receives the `ADMIN` role.
4. Later visits show the login form; public registration is closed.
5. A successful login stores the returned session in browser `localStorage` and redirects to the user's first permitted module.
6. Signing out removes the stored session.

Tokens are sent as `Authorization: Bearer <token>`. A `401` from a non-authentication endpoint clears the local session and returns the user to the login state.

## Phone barcode scanner

The POS can pair a phone with one in-progress transaction for 30 minutes.

1. Put the till computer and phone on the same Wi-Fi network.
2. Find the till computer's LAN address, for example `192.168.1.25`.
3. Set `VITE_PUBLIC_APP_URL=https://192.168.1.25:5173` and restart Vite.
4. Open `https://192.168.1.25:5173/pos` on the till computer.
5. Start a transaction, choose **Use phone**, and scan the QR code with the phone.
6. Accept the development certificate on the phone and allow camera access.

The phone page supports camera scanning and manual barcode entry. The scanner resolves the barcode as a product SKU. Pairings are stored in backend memory, expire after 30 minutes, and disappear if the backend restarts.

## Source organisation

```text
src/
├── main.jsx                         React entry point and providers
├── App.jsx                          Shell, navigation, routes, role guards
├── auth/LoginPage.jsx               Setup and login screens
├── lib/apiClient.jsx                API provider, JWT session, request helper
├── design/                          Tokens, shared components, visual styles
└── modules/
    ├── dashboard/DashboardModule.jsx
    ├── inventory/InventoryModule.jsx
    ├── pricing/PricingModule.jsx
    ├── pos/POSModule.jsx
    ├── pos/PhoneScannerPage.jsx
    ├── procurement/ProcurementModule.jsx
    ├── finance/FinanceModule.jsx
    └── admin/UserManagementModule.jsx
```

Each business screen keeps its local loading state and refreshes after mutations. There is no shared domain-state store. Use `useApi()` for backend calls so authentication headers, JSON handling, connection status, and error parsing stay consistent.

Example:

```jsx
const { request } = useApi();

const products = await request("/api/inventory/products");

await request("/api/inventory/products", {
  method: "POST",
  body: { sku: "MILK-001", name: "Full-Fat Milk", unitType: "EACH" },
});
```

The request helper automatically:

- adds the stored bearer token;
- serializes JSON bodies and accepts `FormData` for image uploads;
- parses JSON responses and returns `null` for empty responses;
- extracts the backend `message` from errors; and
- tracks `unknown`, `ok`, and `fail` connection status for the desktop shell.

## Build and preview

```powershell
# Production bundle in dist/
npm run build

# Serve the bundle locally for a smoke test
npm run preview
```

The Vite development proxy is not automatically available when serving `dist/`. For a deployed frontend, either serve it behind the same HTTPS reverse proxy as the API or set `VITE_API_BASE_URL` to the API origin and configure the backend CORS policy for the exact frontend origin.

## Frontend development rules

- Keep screen-specific logic and API calls in the relevant module.
- Reuse `design/components.jsx` and `design/tokens.css` for shared UI.
- Keep API paths under `/api` so local proxying works.
- Keep role checks aligned with backend security rules.
- Use `npm run build` before committing UI changes.
- Do not put secrets in source code or `VITE_*` variables.

## Known runtime limitations

- The phone pairing is in-memory and is not shared across backend instances.
- Development HTTPS uses a self-signed certificate; production needs a trusted certificate.
- The frontend has no offline mode or shared client-side domain store.
- Backend availability, CORS, JWT validity, and business-rule errors are surfaced through the shared API client; check the backend logs for server-side details.
