# Counter — Supermarket ERP UI

## Run it

```bash
npm install
npm run dev
```

Then open `https://localhost:5173`. The app uses same-origin `/api` requests,
which Vite proxies to Spring Boot at `http://localhost:8080` during development.

## Phone scanner on the LAN

1. Find the PC's LAN address, for example `192.168.1.25`.
2. Open `https://192.168.1.25:5173/pos` on the PC, not `localhost`, so the QR
   code contains an address the phone can reach.
3. Start a sale, choose **Use phone**, and scan the QR code with the phone.
4. Keep both devices on the same Wi-Fi network. Phone scans are added to the
   open PC ticket automatically.

Accept the development certificate warning in the browser. Set
`VITE_PUBLIC_APP_URL` when the public browser address differs from the current
page origin.

## How it's organized

```
src/
  main.jsx                     entry point — wraps everything in the router + ApiProvider
  App.jsx                      shell: sidebar nav, top bar, routes to each module
  lib/apiClient.jsx            shared API client: base URL, connection status, request()
  design/
    tokens.css                 colors, fonts, and the base component styles
    components.jsx             shared UI kit: ShelfTag, Field, Panel, Tabs, Message...
  modules/
    inventory/
      InventoryModule.jsx      the Inventory feature — products, receiving, stock levels
    pricing/                   (next)
    pos/                       (next)
    procurement/                (next)
    finance/                   (next)
```

Each module is a folder under `src/modules/`, mirroring the five backend
modules (Inventory, Pricing, POS, Procurement, Finance). A module only ever
imports from `design/` and `lib/apiClient.jsx` — never from another module —
the same "own your own schema, talk through shared contracts" rule the
backend follows.

To add the next module (e.g. Pricing):
1. Create `src/modules/pricing/PricingModule.jsx`
2. Import `useApi()` for data and the shared components from `design/`
3. Add a `<Route path="/pricing" element={<PricingModule />} />` in `App.jsx`
4. Flip its sidebar entry from `soon` to `active` in the `MODULES` array

## Finance accounting API

The finance module now records balanced journal entries from completed POS
sales, goods receipts, cash-session closes, supplier invoices, and payments.

- `GET /api/finance/journals` — balanced journal entries and debit/credit lines
- `GET /api/finance/reports/profit-and-loss` — current-period P&L
- `GET /api/finance/supplier-invoices` — supplier payables
- `POST /api/finance/supplier-invoices` — post an invoice and input VAT
- `POST /api/finance/supplier-invoices/{id}/payments` — record a payment
- `POST /api/finance/settlements/card` — move card clearing to the bank

Sales, receipt, and cash-close events use stable business keys so replaying an
event does not create a second journal entry.

The POS treats product prices as VAT-exclusive. VAT is calculated once on the
final ticket subtotal at the configured POS rate and added to the customer-facing total. A sale debits cash or card clearing,
credits net sales and output VAT, then records COGS against inventory. A goods
receipt records inventory against GRNI; the supplier invoice clears GRNI and
records input VAT and accounts payable.
