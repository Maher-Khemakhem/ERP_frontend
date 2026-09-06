# Supermarket ERP Frontend

React/Vite web application for the supermarket ERP. The UI provides a dashboard and six active business modules: Inventory, Pricing, POS, Procurement, and Finance, plus the shared dashboard shell.

## Requirements

- Node.js 18 or newer
- npm
- The backend running locally on `http://localhost:8080` for live data

## Install and run

```powershell
npm install
npm run dev
```

Open `https://localhost:5173`. HTTPS is enabled by `@vitejs/plugin-basic-ssl`; accept the local development certificate warning if the browser shows one.

Create a production bundle with:

```powershell
npm run build
npm run preview
```

## Configuration

The Vite development server listens on `0.0.0.0:5173` and proxies `/api` to `http://localhost:8080`.

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Prefix used by the shared API client | empty, so requests use the current origin |
| `VITE_PUBLIC_APP_URL` | Public URL placed in the phone-scanner flow | current browser origin |

For example, a `.env.local` file can contain:

```dotenv
VITE_API_BASE_URL=http://localhost:8080
VITE_PUBLIC_APP_URL=https://192.168.1.25:5173
```

Restart Vite after changing environment variables. Do not put secrets in `VITE_*` variables; Vite exposes them to browser code.

## Routes

| Route | Screen |
| --- | --- |
| `/dashboard` | Operational summary: products, prices, alerts, tills, and transactions |
| `/inventory` | Products, stock receiving, and stock levels/lots |
| `/pricing` | Product prices and promotions |
| `/pos` | Till selection, cash sessions, tickets, checkout, and phone pairing |
| `/procurement` | Suppliers, purchase orders, receiving, and low-stock alerts |
| `/finance` | Journals, P&L, supplier invoices, and payments |
| `/scanner` | Phone barcode-scanner page opened from a POS pairing |

`/` redirects to `/dashboard`; unknown routes also redirect to `/dashboard`.

## Source organization

```text
src/
├── main.jsx                         React entry point and providers
├── App.jsx                          Shell, navigation, routes, API connection control
├── lib/apiClient.jsx                Shared fetch client and connection status
├── design/
│   ├── tokens.css                   Global colors, typography, and base styles
│   └── components.jsx               Shared UI components
└── modules/
    ├── dashboard/DashboardModule.jsx
    ├── inventory/InventoryModule.jsx
    ├── pricing/PricingModule.jsx
    ├── pos/POSModule.jsx
    ├── pos/PhoneScannerPage.jsx
    ├── procurement/ProcurementModule.jsx
    └── finance/FinanceModule.jsx
```

Each module calls the backend through `useApi()` and imports shared visual components from `design/`. The frontend does not maintain a separate domain store; screens load and mutate data through the REST API and refresh their local state after successful operations.

## API client behavior

`src/lib/apiClient.jsx` exposes `ApiProvider` and `useApi()`:

```jsx
const { request } = useApi();
const products = await request("/api/inventory/products");
await request("/api/inventory/products", {
  method: "POST",
  body: { sku: "MILK-1", name: "Milk", unitType: "EACH" }
});
```

The client:

- Adds `Content-Type: application/json` when a body is present.
- Parses successful JSON responses and returns `null` for empty responses.
- Extracts the backend `message` from error responses when available.
- Tracks `unknown`, `ok`, or `fail` connection status, shown in the top-right API control.

## Phone scanner on a local network

1. Start the frontend with Vite bound to the network, as configured.
2. Find the host computer's LAN address, for example `192.168.1.25`.
3. Open `https://192.168.1.25:5173/pos` on the host computer, not `localhost`.
4. Start a sale, choose **Use phone**, and scan the displayed QR code.
5. Keep both devices on the same Wi-Fi network and accept the development certificate on the phone.

Set `VITE_PUBLIC_APP_URL` when the address encoded in the QR flow must differ from the current browser origin. The backend scanner pairing expires after 30 minutes and is invalidated when the backend restarts.

## Backend dependency

The frontend expects the backend described in [the backend README](../ERP/README.md). Start it from the sibling `ERP` directory:

```powershell
cd ..\ERP
.\mvnw.cmd spring-boot:run
```

If the API is hosted elsewhere, set `VITE_API_BASE_URL` or use the API base URL control in the application shell. The backend must allow the browser origin through its development CORS configuration.

## Development guidelines

- Keep module-specific behavior inside its module folder.
- Reuse `design/components.jsx` and `design/tokens.css` before adding one-off UI styles.
- Use `useApi()` for API calls so connection and error handling remain consistent.
- Keep backend endpoint paths under `/api` so the Vite proxy continues to work.
- Use `npm run build` before committing UI changes to catch JSX and bundling errors.
