import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ShoppingCart, Plus, RefreshCw, Receipt, Lock, Unlock, ScanLine,
  CircleDollarSign, Trash2, XCircle, Barcode, Printer, History,
  Search, CreditCard, Banknote, Minus, PackageSearch, AlertTriangle,
  CheckCircle2, ArrowRight, ShoppingBag, Smartphone, Copy, ChevronRight,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useApi } from "../../lib/apiClient.jsx";
import { ShelfTag, Field, Chip, Panel, Message, Empty, Modal } from "../../design/components.jsx";

function parseMoney(str) {
  const n = parseFloat(str);
  return Number.isNaN(n) ? 0 : n;
}

function formatMoney(value) {
  const n = typeof value === "number" ? value : parseMoney(value);
  return `${n.toFixed(3)} TND`;
}

function ticketStatusLabel(status) {
  return { IN_PROGRESS: "En cours", COMPLETED: "Terminé", VOIDED: "Annulé" }[status] || status || "Inconnu";
}

function paymentMethodLabel(method) {
  return { CASH: "Espèces", CARD: "Carte" }[method] || method || "";
}

const PRODUCT_IMAGE_URLS = {
  water: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=640&q=80",
  milk: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=640&q=80",
  bread: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=640&q=80",
  fruit: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=640&q=80",
  vegetable: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=640&q=80",
  coffee: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=640&q=80",
  generic: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=640&q=80",
};

function productFamilyName(name) {
  const match = String(name || "").match(/^(.+?)\s+[-|/]\s+.+$/);
  return match ? match[1].trim() : null;
}

function productFamily(product) {
  return product?.familyName?.trim() || productFamilyName(product?.name);
}

function resolveAssetUrl(url, apiBase) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = apiBase || window.location.origin;
  return `${base.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
}

function productImage(product, apiBase) {
  if (product?.familyImageUrl) return resolveAssetUrl(product.familyImageUrl, apiBase);
  if (product?.imageUrl) return resolveAssetUrl(product.imageUrl, apiBase);
  const name = String(product?.name || "").toLowerCase();
  if (name.includes("water") || name.includes("eau")) return PRODUCT_IMAGE_URLS.water;
  if (name.includes("milk") || name.includes("lait")) return PRODUCT_IMAGE_URLS.milk;
  if (name.includes("bread") || name.includes("pain")) return PRODUCT_IMAGE_URLS.bread;
  if (name.includes("fruit") || name.includes("apple") || name.includes("banana") || name.includes("orange")) return PRODUCT_IMAGE_URLS.fruit;
  if (name.includes("vegetable") || name.includes("tomato") || name.includes("tomate")) return PRODUCT_IMAGE_URLS.vegetable;
  if (name.includes("coffee") || name.includes("cafe")) return PRODUCT_IMAGE_URLS.coffee;
  return PRODUCT_IMAGE_URLS.generic;
}

function legacyProductGlyph(product) {
  const name = String(product?.name || "").toLowerCase();
  if (name.includes("water") || name.includes("eau")) return "💧";
  if (name.includes("milk") || name.includes("lait")) return "🥛";
  if (name.includes("bread") || name.includes("pain")) return "🥖";
  if (name.includes("fruit") || name.includes("apple") || name.includes("banana") || name.includes("orange")) return "🍎";
  if (name.includes("vegetable") || name.includes("tomato") || name.includes("tomate")) return "🥬";
  if (name.includes("coffee") || name.includes("cafe")) return "☕";
  return "🛍️";
}

function productGlyph(product) {
  const name = String(product?.name || "?").trim();
  return name ? name.slice(0, 1).toUpperCase() : "?";
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

export default function POSModule() {
  const { request } = useApi();
  const [tab, setTab] = useState("checkout");
  const [resumeTicketId, setResumeTicketId] = useState(null);

  const [products, setProducts] = useState([]);
  const [prices, setPrices] = useState([]);
  useEffect(() => {
    Promise.all([
      request("/api/inventory/products"),
      request("/api/pricing/prices"),
    ])
      .then(([productData, priceData]) => {
        setProducts(Array.isArray(productData) ? productData : []);
        setPrices(Array.isArray(priceData) ? priceData : []);
      })
      .catch(() => {});
  }, [request]);

  const [tills, setTills] = useState([]);
  const [tillsLoading, setTillsLoading] = useState(false);
  const [tillsError, setTillsError] = useState("");

  const fetchTills = useCallback(async () => {
    setTillsLoading(true);
    setTillsError("");
    try {
      const data = await request("/api/pos/tills");
      setTills(Array.isArray(data) ? data : []);
    } catch (err) {
      setTillsError(err.message || "Impossible de joindre le service de caisse.");
    } finally {
      setTillsLoading(false);
    }
  }, [request]);

  useEffect(() => {
    fetchTills();
  }, [fetchTills]);

  return (
    <div>
      <h1 className="page-title">POS</h1>
      <p className="page-sub">Ouvrez un tiroir-caisse, enregistrez les articles et encaissez les paiements.</p>
      <style>{posNavigationStyles}</style>

      <div className="pos-navigation" role="toolbar" aria-label="Flux de travail de la caisse">
        <button type="button" className={`pos-navigation-action ${tab === "checkout" ? "active" : ""}`} onClick={() => setTab("checkout")}>
          <ShoppingCart size={16} /><span><strong>Encaissement</strong><small>Scanner et encaisser</small></span>
        </button>
        <button type="button" className={`pos-navigation-action ${tab === "tills" ? "active" : ""}`} onClick={() => setTab("tills")}>
          <Lock size={16} /><span><strong>Caisses</strong><small>Tiroirs et sessions de caisse</small></span>
        </button>
        <button type="button" className={`pos-navigation-action ${tab === "tickets" ? "active" : ""}`} onClick={() => setTab("tickets")}>
          <Receipt size={16} /><span><strong>Tickets</strong><small>Historique des ventes et reçus</small></span>
        </button>
      </div>

      {tab === "tills" && (
        <TillsTab tills={tills} loading={tillsLoading} error={tillsError} onRefresh={fetchTills} />
      )}
      {tab === "checkout" && (
        <CheckoutTab
          tills={tills}
          products={products}
          prices={prices}
          resumeTicketId={resumeTicketId}
          onResumeHandled={() => setResumeTicketId(null)}
          onTillsChanged={fetchTills}
        />
      )}
      {tab === "tickets" && (
        <TicketsTab
          products={products}
          onResumeTicket={(ticketId) => {
            setResumeTicketId(ticketId);
            setTab("checkout");
          }}
        />
      )}
    </div>
  );
}

const posNavigationStyles = `
  .pos-navigation { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 24px; }
  .pos-navigation-action { display: flex; align-items: center; gap: 10px; min-width: 0; padding: 13px 14px; text-align: left; color: var(--ink); background: var(--surface); border: 1px solid var(--hairline); border-radius: 8px; cursor: pointer; }
  .pos-navigation-action:hover { border-color: var(--green); background: #FBFCF8; }
  .pos-navigation-action.active { color: var(--green-deep); border-color: var(--green); box-shadow: inset 0 -3px 0 var(--green); }
  .pos-navigation-action > svg { flex-shrink: 0; color: var(--green); }
  .pos-navigation-action span { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .pos-navigation-action strong { font-size: 13px; }
  .pos-navigation-action small { color: var(--ink-soft); font-size: 11px; }
  @media (max-width: 680px) { .pos-navigation { grid-template-columns: 1fr; } }
`;

function TillsTab({ tills, loading, error, onRefresh }) {
  const { request } = useApi();
  const [newTillNumber, setNewTillNumber] = useState("");
  const [creatingTill, setCreatingTill] = useState(false);
  const [createTillMsg, setCreateTillMsg] = useState(null);

  const openTill = tills.find((t) => t.status === "OPEN");
  const closedTills = tills.filter((t) => t.status !== "OPEN");

  async function handleCreateTill(event) {
    event.preventDefault();
    const tillNumber = newTillNumber.trim();
    if (!tillNumber) {
      setCreateTillMsg({ ok: false, text: "Saisissez un nom ou un numéro de caisse avant de la créer." });
      return;
    }

    setCreatingTill(true);
    setCreateTillMsg(null);
    try {
      await request("/api/pos/tills", {
        method: "POST",
        body: { tillNumber },
      });
      setNewTillNumber("");
      setCreateTillMsg({ ok: true, text: `Caisse « ${tillNumber} » créée.` });
      onRefresh();
    } catch (err) {
      setCreateTillMsg({ ok: false, text: err.message || "Impossible de créer la caisse." });
    } finally {
      setCreatingTill(false);
    }
  }

  return (
    <div className="grid">
      <Panel title="État du tiroir-caisse" icon={<ShoppingCart size={16} />}>
        <Message ok={false} text={error} />
        {!error && (
          <div className={`drawer-state ${openTill ? "is-open" : "is-closed"}`}>
            <div className="drawer-state-icon">
              {openTill ? <Unlock size={28} /> : <Lock size={28} />}
            </div>
            <div>
              <div className="drawer-state-label">{openTill ? "Tiroir ouvert" : "Toutes les caisses sont fermées"}</div>
              <div className="drawer-state-meta">
                {openTill
                  ? `${openTill.tillNumber} · active session in progress`
                  : "Aucune caisse active. Ouvrez un tiroir depuis l’onglet Encaissement pour commencer à vendre."}
              </div>
            </div>
          </div>
        )}
        <button
          className="btn btn-primary"
          onClick={onRefresh}
          disabled={loading}
          style={{ width: "100%", justifyContent: "center", marginTop: 14 }}
        >
          <RefreshCw size={14} /> {loading ? "Actualisation…" : "Actualiser l’état"}
        </button>
      </Panel>

      <Panel
        title="Toutes les caisses"
        icon={<ShoppingBag size={16} />}
        right={
          <button className="btn" onClick={onRefresh} disabled={loading} style={{ padding: "5px 10px" }}>
            <RefreshCw size={13} /> Actualiser
          </button>
        }
      >
        <Message ok={createTillMsg?.ok} text={createTillMsg?.text} />
        <form onSubmit={handleCreateTill} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            value={newTillNumber}
            onChange={(e) => setNewTillNumber(e.target.value)}
            placeholder="Nom de la nouvelle caisse"
            aria-label="Nom de la nouvelle caisse"
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary" disabled={creatingTill || !newTillNumber.trim()}>
            {creatingTill ? "Création…" : "Créer la caisse"}
          </button>
        </form>

        {!error && tills.length === 0 && !loading && <Empty>Aucune caisse pour le moment.</Empty>}
        {[...tills].sort((a, b) => a.tillNumber.localeCompare(b.tillNumber)).map((t) => {
          const lastOpened = t.openedAt ? new Date(t.openedAt).toLocaleString("fr-FR") : "Jamais";
          const lastClosed = t.closedAt ? new Date(t.closedAt).toLocaleString("fr-FR") : "Jamais";
          const cashValue = t.cashInDrawer ? `${t.cashInDrawer} TND` : "0.000 TND";

          return (
            <ShelfTag key={t.id}>
              <div className="tag-row">
                <div>
                  <div className="tag-name">{t.tillNumber}</div>
                  <div className="tag-sku">
                    {t.status === "OPEN"
                      ? `Espèces dans le tiroir : ${cashValue} · Caissier : ${t.cashierName || "Non attribué"}`
                      : `Dernière ouverture : ${lastOpened} · Dernière fermeture : ${lastClosed}`}
                  </div>
                  {t.status === "CLOSED" && <div className="tag-sku">Dernier comptage des espèces : {cashValue}</div>}
                </div>
                <Chip warn={t.status === "CLOSED"}>{t.status === "OPEN" ? "OUVERTE" : "FERMÉE"}</Chip>
              </div>
            </ShelfTag>
          );
        })}
      </Panel>
    </div>
  );
}

// Local-draft quantity input: only pushes to the server on blur / Enter, instead
// of firing a request on every keystroke (which used to race delete+re-add calls).
function BasketQtyInput({ value, isWeight, disabled, onCommit }) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function commit() {
    const num = Number(draft);
    if (Number.isFinite(num) && num !== value) {
      onCommit(num);
    } else {
      setDraft(String(value));
    }
  }

  return (
    <input
      type="number"
      className="qty-input"
      min="0"
      step={isWeight ? "0.005" : "1"}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      disabled={disabled}
      aria-label="Quantity"
    />
  );
}

function CheckoutTab({ tills, products, prices, resumeTicketId, onResumeHandled, onTillsChanged }) {
  const { request, apiBase } = useApi();
  const barcodeRef = useRef(null);
  const searchRef = useRef(null);

  // Session
  const [tillId, setTillId] = useState("");
  const [cashierName, setCashierName] = useState("");
  const [openingFloat, setOpeningFloat] = useState("100");
  const [session, setSession] = useState(null);
  const [sessionMsg, setSessionMsg] = useState(null);
  const [openingSession, setOpeningSession] = useState(false);
  const [sessionModal, setSessionModal] = useState(null); // "open" | "close"

  // Transaction / ticket
  const [transactionId, setTransactionId] = useState("");
  const [lines, setLines] = useState([]);
  const [transactionMsg, setTransactionMsg] = useState(null);
  const [startingTx, setStartingTx] = useState(false);

  // Basket lines currently being updated on the server — used to disable their
  // controls so a second edit can't race the in-flight one.
  const [pendingLineIds, setPendingLineIds] = useState(() => new Set());
  const markLinePending = useCallback((id, isPending) => {
    setPendingLineIds((prev) => {
      const next = new Set(prev);
      if (isPending) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  // Barcode scan
  const [barcodeValue, setBarcodeValue] = useState("");
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState(null);
  const [lastScan, setLastScan] = useState(null); // visual confirmation chip
  const [phonePairing, setPhonePairing] = useState(null);
  const [phonePairingOpen, setPhonePairingOpen] = useState(false);
  const [phonePairingLoading, setPhonePairingLoading] = useState(false);
  const [phonePairingMsg, setPhonePairingMsg] = useState(null);

  // Product browser
  const [productSearch, setProductSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("ALL"); // ALL | EACH | WEIGHT
  const [addingProductId, setAddingProductId] = useState(null);
  const [variantFamily, setVariantFamily] = useState(null);

  // Complete
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [tendered, setTendered] = useState("");
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [completedTicket, setCompletedTicket] = useState(null);

  // Void
  const [voiding, setVoiding] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voidConfirmOpen, setVoidConfirmOpen] = useState(false);

  // Close session
  const [countedCash, setCountedCash] = useState("");
  const [closing, setClosing] = useState(false);
  const [closeMsg, setCloseMsg] = useState(null);
  const [alerts, setAlerts] = useState([]);

  const pushAlert = useCallback((text) => {
    if (!text) return;
    const id = `${Date.now()}-${Math.random()}`;
    setAlerts((current) => [...current, { id, text }].slice(-4));
    window.setTimeout(() => {
      setAlerts((current) => current.filter((alert) => alert.id !== id));
    }, 6000);
  }, []);

  useEffect(() => {
    [sessionMsg, transactionMsg, scanMsg, phonePairingMsg, closeMsg]
      .filter((message) => message && message.ok === false)
      .forEach((message) => pushAlert(message.text));
  }, [sessionMsg, transactionMsg, scanMsg, phonePairingMsg, closeMsg, pushAlert]);

  const netTotal = lines.reduce((sum, l) => {
    if (l.netPrice != null) return sum + parseMoney(l.netPrice);
    if (l.linePrice != null && l.vatAmount != null) return sum + (parseMoney(l.linePrice) - parseMoney(l.vatAmount));
    return sum + parseMoney(l.linePrice);
  }, 0);
  const vatTotal = lines.reduce((sum, l) => {
    if (l.vatAmount != null) return sum + parseMoney(l.vatAmount);
    if (l.linePrice != null && l.netPrice != null) return sum + (parseMoney(l.linePrice) - parseMoney(l.netPrice));
    const product = products.find((p) => p.id === l.productId);
    const rate = product?.vatRate != null ? Number(product.vatRate) : 0;
    return sum + (parseMoney(l.netPrice ?? l.linePrice) * (rate / 100));
  }, 0);
  const total = lines.reduce((sum, l) => {
    if (l.linePrice != null) return sum + parseMoney(l.linePrice);
    return sum + (parseMoney(l.netPrice) + parseMoney(l.vatAmount));
  }, 0);
  const itemCount = lines.length;
  const tenderedNum = parseMoney(tendered);
  const changeDue = paymentMethod === "CASH" ? Math.max(0, tenderedNum - total) : 0;
  const canTender = paymentMethod === "CARD" || (tenderedNum + 0.0005 >= total && total > 0);

  const normalizeSession = useCallback((rawSession) => {
    if (!rawSession) return rawSession;
    return {
      ...rawSession,
      expectedCash: parseMoney(rawSession.expectedCash),
    };
  }, []);

  // Restore an already-open session after changing tabs or refreshing the page.
  useEffect(() => {
    const openTill = tills.find((t) => t.status === "OPEN");
    if (!openTill || session) return;
    request(`/api/pos/sessions/active?tillId=${openTill.id}`)
      .then((data) => {
        if (!data) return;
        setTillId(data.tillId);
        setSession(normalizeSession(data));
      })
      .catch(() => {});
  }, [request, tills, session]);

  // Auto-focus barcode input while a sale is active, but don't steal focus mid-edit elsewhere,
  // and don't try to focus it while it's disabled during a scan.
  useEffect(() => {
    if (transactionId && !completed && !scanning && barcodeRef.current) {
      const active = document.activeElement;
      const isFormField = active && (active.tagName === "INPUT" || active.tagName === "SELECT" || active.tagName === "TEXTAREA");
      const isOurScanner = active === barcodeRef.current;
      if (!isFormField || isOurScanner) {
        barcodeRef.current.focus();
      }
    }
  }, [transactionId, completed, lines.length, scanning]);

  const loadTransaction = useCallback(
    async (ticketId) => {
      if (!ticketId) return;
      try {
        const data = await request(`/api/pos/transactions/${ticketId}`);
        const nextLines = (Array.isArray(data.lines) ? data.lines : []).map((line) => {
          const product = products.find((p) => p.id === line.productId);
          return {
            id: line.id,
            productId: line.productId,
            productName: product?.name || "Produit",
            quantityValue: parseQuantityValue(line.quantity),
            unitType: product?.unitType ?? "EACH",
            linePrice: line.lineTotal,
            netPrice: line.netTotal,
            vatAmount: line.vatAmount,
          };
        });

        setTransactionId(data.id);
        setLines(nextLines);
        setCompleted(data.status === "COMPLETED" || data.status === "VOIDED");
        setCompletedTicket(data.status === "COMPLETED" ? {
          id: data.id, lines: nextLines, total: data.total,
          netTotal: data.netTotal, vatTotal: data.vatTotal,
          paymentMethod: data.paymentMethod, completedAt: data.completedAt,
        } : null);
        setPaymentMethod(data.paymentMethod || "CASH");
        setTransactionMsg(null);
        setVoidReason("");
        setVoidConfirmOpen(false);
        setTendered("");
      } catch (err) {
        setTransactionMsg({ ok: false, text: err.message || "Impossible de charger ce ticket." });
      }
    },
    [products, request]
  );

  useEffect(() => {
    if (!resumeTicketId) return;
    loadTransaction(resumeTicketId);
    onResumeHandled?.();
  }, [resumeTicketId, loadTransaction, onResumeHandled]);

  // The phone writes to the same persisted ticket. Refresh it while pairing is active
  // so scans appear on the PC without duplicating cart logic in the phone page.
  useEffect(() => {
    if (!phonePairing || !transactionId || completed) return undefined;
    const timer = window.setInterval(() => loadTransaction(transactionId), 1000);
    return () => window.clearInterval(timer);
  }, [phonePairing, transactionId, completed, loadTransaction]);

  async function refreshSession(id) {
    try {
      const data = await request(`/api/pos/sessions/${id}`);
      setSession(normalizeSession(data));
    } catch {
      // best effort
    }
  }

  async function handleOpenSession(e) {
    e.preventDefault();
    if (!tillId || !openingFloat) {
      setSessionMsg({ ok: false, text: "Till and opening float are required." });
      return;
    }
    if (!cashierName.trim()) {
      setSessionMsg({ ok: false, text: "Le nom du caissier est obligatoire pour ouvrir une caisse." });
      return;
    }
    setOpeningSession(true);
    setSessionMsg(null);
    try {
      const data = await request("/api/pos/sessions/open", {
        method: "POST",
        body: { tillId, cashierName: cashierName.trim(), openingFloat: Number(openingFloat) },
      });
      setSession({
        id: data.cashSessionId,
        tillId: tillId,
        status: "OPEN",
        cashierName: cashierName.trim(),
        expectedCash: Number(openingFloat),
      });
      setSessionMsg({ ok: true, text: "Session opened." });
      setCashierName("");
      setSessionModal(null);
      onTillsChanged?.();
    } catch (err) {
      setSessionMsg({ ok: false, text: err.message || "Impossible d’ouvrir une session." });
    } finally {
      setOpeningSession(false);
    }
  }

  async function handleStartTransaction() {
    setStartingTx(true);
    setTransactionMsg(null);
    try {
      const data = await request("/api/pos/transactions/start", {
        method: "POST",
        body: { cashSessionId: session.id },
      });
      setTransactionId(data.transactionId);
      setLines([]);
      setCompleted(false);
      setCompletedTicket(null);
      setTendered("");
      setTimeout(() => barcodeRef.current?.focus(), 0);
    } catch (err) {
      setTransactionMsg({ ok: false, text: err.message || "Impossible de démarrer un nouveau ticket." });
    } finally {
      setStartingTx(false);
    }
  }

  async function handleOpenPhoneScanner() {
    if (!transactionId || completed) return;

    // The pairing can remain active while its QR dialog is hidden. Re-open the
    // existing dialog instead of creating a second scanner session.
    if (phonePairing) {
      setPhonePairingOpen(true);
      return;
    }

    setPhonePairingLoading(true);
    setPhonePairingMsg(null);
    try {
      const pairing = await request(`/api/pos/transactions/${transactionId}/scanner-session`, { method: "POST" });
      const publicOrigin = import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin;
      const scannerUrl = `${publicOrigin.replace(/\/$/, "")}/scanner?sessionId=${pairing.sessionId}&token=${encodeURIComponent(pairing.token)}`;
      setPhonePairing({ ...pairing, scannerUrl });
      setPhonePairingOpen(true);
    } catch (err) {
      setPhonePairingMsg({ ok: false, text: err.message || "Impossible d’associer le scanner mobile." });
    } finally {
      setPhonePairingLoading(false);
    }
  }

  function hidePhoneScanner() {
    setPhonePairingOpen(false);
  }

  async function disconnectPhoneScanner() {
    if (!phonePairing) return;
    try {
      await request(`/api/pos/scanner-sessions/${phonePairing.sessionId}`, {
        method: "DELETE",
        headers: { "X-Scanner-Token": phonePairing.token },
      });
    } catch {
      // The pairing may already have expired; closing the dialog is still safe.
    }
    setPhonePairing(null);
    setPhonePairingOpen(false);
  }

  async function checkStockAvailability(productId, qty, ignoreLineId = null) {
    if (!productId || !Number.isFinite(qty) || qty <= 0) return true;
    try {
      const stock = await request(`/api/inventory/stock/${productId}`);
      const available = Number(stock?.totalQuantity ?? 0);
      const alreadyInBasket = lines
        .filter((line) => line.productId === productId && line.id !== ignoreLineId)
        .reduce((sum, line) => sum + Number(line.quantityValue || 0), 0);
      const remaining = available - alreadyInBasket;
      if (remaining < qty) {
        const left = Math.max(0, remaining);
        setScanMsg({
          ok: false,
          text: `Rupture de stock : seuls ${left.toFixed(3).replace(/\.000$/, "").replace(/(\.\d*?)0+$/, "$1")} sont disponibles pour ce produit.`,
        });
        return false;
      }
      return true;
    } catch {
      return true;
    }
  }

  async function addLine(productId, quantityValue, unitType) {
    if (!transactionId) return;
    const product = products.find((p) => p.id === productId);
    const qty = Number(quantityValue);
    if (!Number.isFinite(qty) || qty <= 0) {
      setScanMsg({ ok: false, text: "Quantity must be greater than zero." });
      return;
    }
    if (unitType === "EACH" && !Number.isInteger(qty)) {
      setScanMsg({ ok: false, text: "Cet article est vendu à l’unité : la quantité doit être un nombre entier." });
      return;
    }
    const hasStock = await checkStockAvailability(productId, qty);
    if (!hasStock) return;
    setScanning(true);
    setScanMsg(null);
    try {
      const data = await request(`/api/pos/transactions/${transactionId}/lines`, {
        method: "POST",
        body: { productId, quantityValue: qty, unitType },
      });
      setLines((prev) => {
        // If the same product is already in the basket, merge into that line for less scrolling.
        const existing = prev.findIndex((l) => l.productId === productId);
        if (existing !== -1 && unitType === "EACH") {
          const next = [...prev];
          next[existing] = {
            ...next[existing],
            quantityValue: Number(next[existing].quantityValue) + qty,
            linePrice: (parseMoney(next[existing].linePrice) + parseMoney(data.linePrice)).toFixed(3),
            netPrice: (parseMoney(next[existing].netPrice) + parseMoney(data.netPrice)).toFixed(3),
            vatAmount: (parseMoney(next[existing].vatAmount) + parseMoney(data.vatAmount)).toFixed(3),
          };
          return next;
        }
        return [
          ...prev,
          {
            id: data.lineId,
            productId,
            productName: product?.name || "Produit",
            quantityValue: qty,
            unitType,
            linePrice: data.linePrice,
            netPrice: data.netPrice,
            vatAmount: data.vatAmount,
          },
        ];
      });
      setLastScan({ name: product?.name || "Item", qty, unit: unitType === "WEIGHT" ? "kg" : "×" });
      setTimeout(() => setLastScan(null), 1800);
    } catch (err) {
      setScanMsg({ ok: false, text: err.message || "Impossible d’ajouter cette ligne." });
    } finally {
      setScanning(false);
    }
  }

  async function handleBarcodeScan(e) {
    e?.preventDefault?.();
    const code = barcodeValue.trim();
    if (!code) return;
    const product = products.find((p) => p.sku === code);
    if (!product) {
      setScanMsg({ ok: false, text: `Aucun produit trouvé pour le code-barres « ${code} ».` });
      setBarcodeValue("");
      return;
    }
    const defaultQty = product.unitType === "WEIGHT" ? 0.1 : 1;
    setBarcodeValue("");
    await addLine(product.id, defaultQty, product.unitType);
  }

  function handleQuickAdd(product) {
    if (!transactionId) return;
    const qty = product.unitType === "WEIGHT" ? 0.1 : 1;
    setAddingProductId(product.id);
    addLine(product.id, qty, product.unitType).finally(() => setAddingProductId(null));
  }

  async function handleUpdateLine(line, patch) {
    if (!line?.id || completed || pendingLineIds.has(line.id)) return;
    const product = products.find((p) => p.id === line.productId);
    const unitType = product?.unitType ?? line.unitType;
    const nextQty = patch.quantityValue ?? line.quantityValue;
    const qty = Number(nextQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      // Zero / invalid => remove the line
      await handleRemoveLine(line);
      return;
    }
    if (unitType === "EACH" && !Number.isInteger(qty)) {
      setScanMsg({ ok: false, text: "Cet article est vendu à l’unité : la quantité doit être un nombre entier." });
      return;
    }
    const hasStock = await checkStockAvailability(line.productId, qty, line.id);
    if (!hasStock) return;
    // Backend has no PATCH endpoint; emulate by deleting and re-adding.
    markLinePending(line.id, true);
    try {
      await request(`/api/pos/transactions/${transactionId}/lines/${line.id}`, { method: "DELETE" });
      const data = await request(`/api/pos/transactions/${transactionId}/lines`, {
        method: "POST",
        body: { productId: line.productId, quantityValue: qty, unitType },
      });
      setLines((prev) => prev.map((l) => (l.id === line.id
        ? { ...l, id: data.lineId, quantityValue: qty, linePrice: data.linePrice,
            netPrice: data.netPrice, vatAmount: data.vatAmount }
        : l)));
    } catch (err) {
      setScanMsg({ ok: false, text: err.message || "Impossible de modifier cette ligne." });
      // The delete may have already gone through server-side even though the re-add
      // failed — resync from the server instead of trusting stale local state.
      loadTransaction(transactionId);
    } finally {
      markLinePending(line.id, false);
    }
  }

  async function handleRemoveLine(line) {
    if (!line?.id || pendingLineIds.has(line.id)) return;
    markLinePending(line.id, true);
    try {
      await request(`/api/pos/transactions/${transactionId}/lines/${line.id}`, { method: "DELETE" });
      setLines((prev) => prev.filter((l) => l.id !== line.id));
    } catch (err) {
      setScanMsg({ ok: false, text: err.message || "Impossible de supprimer cette ligne." });
    } finally {
      markLinePending(line.id, false);
    }
  }

  async function handleComplete() {
    if (!canTender) return;
    const stockCheck = await Promise.all(
      lines.map(async (line) => {
        const product = products.find((p) => p.id === line.productId);
        const lineQty = Number(line.quantityValue || 0);
        if (!product || !Number.isFinite(lineQty) || lineQty <= 0) return false;
        return checkStockAvailability(line.productId, lineQty, line.id);
      })
    );
    if (stockCheck.some((ok) => ok === false)) {
      setTransactionMsg({ ok: false, text: "Rupture de stock : un ou plusieurs articles du ticket dépassent le stock disponible." });
      return;
    }
    setCompleting(true);
    setTransactionMsg(null);
    try {
      await request(`/api/pos/transactions/${transactionId}/complete`, {
        method: "POST",
        body: { paymentMethod, amountReceived: paymentMethod === "CASH" ? tenderedNum : total },
      });
      setCompleted(true);
      setCompletedTicket({
        id: transactionId,
        lines,
        total: total.toFixed(3),
        netTotal: netTotal.toFixed(3),
        vatTotal: vatTotal.toFixed(3),
        paymentMethod,
        completedAt: new Date().toISOString(),
      });
      setTransactionMsg({ ok: true, text: "Vente terminée. Stock déduit et chiffre d’affaires enregistré." });
      disconnectPhoneScanner();
      if (paymentMethod === "CASH") {
        try { await refreshSession(session.id); } catch { /* best effort */ }
      }
      onTillsChanged?.();
    } catch (err) {
      setTransactionMsg({ ok: false, text: err.message || "Impossible de terminer la vente." });
    } finally {
      setCompleting(false);
    }
  }

  async function handleVoid() {
    setVoiding(true);
    setTransactionMsg(null);
    try {
      await request(`/api/pos/transactions/${transactionId}/void`, {
        method: "POST",
        body: { reason: voidReason.trim() || "Annulée par le caissier" },
      });
      setCompleted(true);
      disconnectPhoneScanner();
      setVoidConfirmOpen(false);
      setTransactionMsg({ ok: true, text: "Ticket annulé." });
    } catch (err) {
      setTransactionMsg({ ok: false, text: err.message || "Impossible d’annuler le ticket." });
    } finally {
      setVoiding(false);
    }
  }

  function handleNewSale() {
    disconnectPhoneScanner();
    setTransactionId("");
    setLines([]);
    setCompleted(false);
    setCompletedTicket(null);
    setTransactionMsg(null);
    setVoidReason("");
    setVoidConfirmOpen(false);
    setTendered("");
    setScanMsg(null);
    setTimeout(() => barcodeRef.current?.focus(), 0);
  }

  async function handleCloseSession(e) {
    e.preventDefault();
    if (!countedCash) {
      setCloseMsg({ ok: false, text: "Saisissez le montant des espèces comptées." });
      return;
    }
    setClosing(true);
    setCloseMsg(null);
    try {
      await request(`/api/pos/sessions/${session.id}/close`, {
        method: "POST",
        body: { countedCash: Number(countedCash) },
      });
      setCloseMsg({ ok: true, text: "Session fermée et rapprochée." });
      disconnectPhoneScanner();
      setSession((s) => ({ ...s, status: "CLOSED" }));
      setSessionModal(null);
      setTransactionId("");
      setLines([]);
      onTillsChanged?.();
    } catch (err) {
      setCloseMsg({ ok: false, text: err.message || "Impossible de fermer la session." });
    } finally {
      setClosing(false);
    }
  }

  // Stepper state
  const sessionOpen = session && session.status === "OPEN";
  const step = !sessionOpen ? 1 : !transactionId ? 2 : completed ? 4 : 3;

  // Filtered product list
  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (unitFilter !== "ALL" && p.unitType !== unitFilter) return false;
      if (!q) return true;
      return (p.name || "").toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q);
    });
  }, [products, productSearch, unitFilter]);

  const productGroups = useMemo(() => {
    const grouped = new Map();
    filteredProducts.forEach((product) => {
      const family = productFamily(product);
      const key = family || `product:${product.id}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(product);
    });
    return [...grouped.entries()].map(([key, group]) => ({
      key,
      family: !key.startsWith("product:") ? key : null,
      products: group,
    }));
  }, [filteredProducts]);

  const priceByProductId = useMemo(() => new Map(
    prices.map((price) => [price.productId, price.unitPrice])
  ), [prices]);

  return (
    <div className="pos-layout">
      <PosAlertStack alerts={alerts} onDismiss={(id) => setAlerts((current) => current.filter((alert) => alert.id !== id))} />
      {/* Stepper */}
      <div className="pos-stepper">
        <Step n={1} active={step === 1} done={step > 1} label="Ouvrir le tiroir" icon={<Lock size={14} />} />
        <div className="pos-stepper-line" />
        <Step n={2} active={step === 2} done={step > 2} label="Démarrer la vente" icon={<Receipt size={14} />} />
        <div className="pos-stepper-line" />
        <Step n={3} active={step === 3} done={false} label="Scanner les articles" icon={<ScanLine size={14} />} />
        <div className="pos-stepper-line" />
        <Step n={4} active={step === 4} done={false} label="Encaisser" icon={<CircleDollarSign size={14} />} />
      </div>

      <div className="pos-grid">
        {/* LEFT COLUMN */}
        <div className="pos-col pos-col-left">
          {/* Drawer */}
          <div className="pos-action-bar">
            {!sessionOpen && <button className="btn btn-primary" onClick={() => { setSessionMsg(null); setSessionModal("open"); }}><Unlock size={14} /> Ouvrir le tiroir</button>}
            {sessionOpen && !transactionId && <button className="btn btn-primary" onClick={handleStartTransaction} disabled={startingTx}><Receipt size={14} /> {startingTx ? "Démarrage…" : "Démarrer la vente"}</button>}
            {sessionOpen && <button className="btn" onClick={() => { setCloseMsg(null); setSessionModal("close"); }}><Lock size={14} /> Fermer le tiroir</button>}
            {transactionId && !completed && <button className="btn" onClick={() => setScannerModalOpen(true)}><Barcode size={14} /> Scanner un code-barres</button>}
            {transactionId && !completed && <button className="btn" onClick={handleOpenPhoneScanner} disabled={phonePairingLoading}><Smartphone size={14} /> {phonePairingLoading ? "Association…" : "Utiliser le téléphone"}</button>}
          </div>

          {/* Scanner */}
          {phonePairing && <div className="phone-pairing-status pos-phone-status"> <Smartphone size={14} /><span><strong>Scanner mobile associé</strong><small>Les scans apparaissent dans ce ticket.</small></span><button type="button" className="btn btn-small" onClick={() => setPhonePairingOpen(true)}>Afficher le QR</button><button type="button" className="btn btn-small btn-danger" onClick={disconnectPhoneScanner}>Déconnecter</button></div>}

          {/* Totals & payment */}
          {transactionId && (
            <Panel title="Paiement" icon={<CircleDollarSign size={16} />} className="pos-payment-panel">
              <Message ok={transactionMsg?.ok} text={transactionMsg?.text} />
              <div className="totals-card">
                <div className="totals-row">
                  <span>Sous-total (hors TVA)</span>
                  <strong>{formatMoney(netTotal)}</strong>
                </div>
                <div className="totals-row">
                  <span>TVA</span>
                  <strong>{formatMoney(vatTotal)}</strong>
                </div>
                <div className="totals-row">
                  <span>Articles</span>
                  <strong>{itemCount}</strong>
                </div>
                <div className="totals-row big">
                  <span>Total (TTC)</span>
                  <strong>{formatMoney(total)}</strong>
                </div>
              </div>

              {!completed && (
                <>
                  <Field label="Mode de paiement">
                    <div className="payment-toggle">
                      <button type="button" className={`payment-option ${paymentMethod === "CASH" ? "active" : ""}`}
                        onClick={() => setPaymentMethod("CASH")}>
                        <Banknote size={16} /> Espèces
                      </button>
                      <button type="button" className={`payment-option ${paymentMethod === "CARD" ? "active" : ""}`}
                        onClick={() => setPaymentMethod("CARD")}>
                        <CreditCard size={16} /> Carte
                      </button>
                    </div>
                  </Field>

                  {paymentMethod === "CASH" && (
                    <>
                      <Field label="Espèces remises">
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={tendered}
                          onChange={(e) => setTendered(e.target.value)}
                          placeholder={total > 0 ? total.toFixed(3) : "0.000"}
                        />
                      </Field>
                      <div className="quick-tender">
                        {[10, 20, 50, 100].map((v) => (
                          <button
                            type="button"
                            key={v}
                            className="btn"
                            onClick={() => setTendered(String(v))}
                            style={{ padding: "6px 10px" }}
                          >
                            {v}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="btn"
                          onClick={() => setTendered(total > 0 ? total.toFixed(3) : "")}
                          style={{ padding: "6px 10px" }}
                          title="Montant exact"
                        >
                          Exact
                        </button>
                      </div>
                      {tendered && (
                        <div className={`change-due ${changeDue > 0 ? "ok" : tenderedNum < total ? "short" : ""}`}>
                          <span>{changeDue > 0 ? "Monnaie à rendre" : tenderedNum < total ? "Manque" : "Montant remis"}</span>
                          <strong>{formatMoney(changeDue > 0 ? changeDue : Math.abs(total - tenderedNum))}</strong>
                        </div>
                      )}
                    </>
                  )}

                  <button
                    className="btn btn-primary complete-btn"
                    onClick={handleComplete}
                    disabled={completing || lines.length === 0 || !canTender}
                  >
                    {completing ? "Traitement…" : (<><CircleDollarSign size={16} /> {`Charge ${formatMoney(total)}`}</>)}
                  </button>
                  {paymentMethod === "CASH" && tenderedNum < total && total > 0 && (
                    <div className="complete-hint">Il faut au moins {formatMoney(total)} en espèces.</div>
                  )}

                  {!voidConfirmOpen && (
                    <button
                      className="btn-link danger"
                      onClick={() => setVoidConfirmOpen(true)}
                      disabled={voiding || lines.length === 0}
                    >
                      <XCircle size={13} /> Annuler cette vente
                    </button>
                  )}

                  {voidConfirmOpen && (
                    <div className="void-confirm">
                      <div className="void-confirm-title">
                        <AlertTriangle size={14} /> Cette action est irréversible.
                      </div>
                      <Field label="Motif de l’annulation (facultatif)">
                        <input
                          type="text"
                          autoFocus
                          value={voidReason}
                          onChange={(e) => setVoidReason(e.target.value)}
                          placeholder="ex. le client a changé d’avis"
                        />
                      </Field>
                      <div className="modal-actions">
                        <button
                          type="button"
                          className="btn"
                          onClick={() => { setVoidConfirmOpen(false); setVoidReason(""); }}
                          disabled={voiding}
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={handleVoid}
                          disabled={voiding}
                        >
                          {voiding ? "Annulation…" : "Confirmer l’annulation"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {completed && completedTicket && (
                <div className="action-stack" style={{ marginTop: 10 }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => printReceipt(completedTicket, products)}
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    <Printer size={14} /> Imprimer le reçu
                  </button>
                  <button
                    className="btn"
                    onClick={handleNewSale}
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    Démarrer une nouvelle vente
                  </button>
                </div>
              )}
            </Panel>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="pos-col pos-col-right">
          {/* Product browser — only when a sale is active and not yet completed */}
          {transactionId && !completed && (
            <Panel title="Produits" icon={<PackageSearch size={16} />} className="pos-product-panel">
              <div className="browser-controls">
                <div className="scanner-input-wrap" style={{ flex: 1 }}>
                  <Search size={16} className="scanner-icon" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Rechercher par nom ou SKU…"
                    aria-label="Rechercher des produits"
                  />
                </div>
                <div className="filter-chips">
                  <button
                    type="button"
                    className={`filter-chip ${unitFilter === "ALL" ? "active" : ""}`}
                    onClick={() => setUnitFilter("ALL")}
                  >Tous</button>
                  <button
                    type="button"
                    className={`filter-chip ${unitFilter === "EACH" ? "active" : ""}`}
                    onClick={() => setUnitFilter("EACH")}
                  >À l’unité</button>
                  <button
                    type="button"
                    className={`filter-chip ${unitFilter === "WEIGHT" ? "active" : ""}`}
                    onClick={() => setUnitFilter("WEIGHT")}
                  >Poids</button>
                </div>
              </div>
              {filteredProducts.length === 0 ? (
                <Empty>Aucun produit ne correspond.</Empty>
              ) : (
                <div className="product-grid">
                  {productGroups.map((group) => {
                    const product = group.products[0];
                    const hasVariants = Boolean(group.family);
                    return (
                      <button
                        key={group.key}
                        type="button"
                        className={`product-tile ${hasVariants ? "has-variants" : ""} ${addingProductId === product.id ? "is-busy" : ""}`}
                        onClick={() => (hasVariants ? setVariantFamily(group) : handleQuickAdd(product))}
                        disabled={scanning}
                        title={hasVariants ? `Choisir une variante de ${group.family}` : `${product.name} · ${product.sku}`}
                      >
                        <div className="product-image-frame">
                          <div className="product-art" aria-hidden="true">{productGlyph(product)}</div>
                          <img
                            src={productImage(product, apiBase)}
                            alt=""
                            loading="lazy"
                            onError={(event) => { event.currentTarget.style.display = "none"; }}
                          />
                          {hasVariants && <span className="variant-count">{group.products.length} options</span>}
                        </div>
                        <div className="product-tile-name">{group.family || product.name}</div>
                        {!hasVariants && (
                          <div className="product-tile-meta">
                            <span className="product-tile-sku">{product.sku}</span>
                            <Chip>{product.unitType === "WEIGHT" ? "kg" : "unité"}</Chip>
                            {product.vatRate != null && <Chip>TVA {product.vatRate}%</Chip>}
                          </div>
                        )}
                        <div className="product-tile-footer">
                          <strong>{hasVariants ? "Choisir une variante" : formatMoney(priceByProductId.get(product.id) || 0)}</strong>
                          {hasVariants ? <ChevronRight size={15} /> : <Plus size={14} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Panel>
          )}

          {/* Basket */}
          <Panel
            title={transactionId ? `Panier · ${lines.length} article${lines.length === 1 ? "" : "s"}` : "Panier"}
            icon={<ShoppingCart size={16} />}
            className="pos-basket-panel"
          >
            {!transactionId && (
              <div className="empty-sale-state">
                <ShoppingCart size={26} />
                <div>
                  {sessionOpen
                    ? "Démarrez une vente pour commencer à scanner les articles."
                    : "Ouvrez le tiroir et démarrez une vente pour commencer à scanner les articles."}
                </div>
              </div>
            )}
            {transactionId && lines.length === 0 && !completed && (
              <div className="empty-sale-state">
                <ScanLine size={26} />
                <div>Aucun article. Scannez un code-barres ou cliquez sur un produit pour l’ajouter.</div>
              </div>
            )}
            {completed && lines.length === 0 && (
              <Empty>Aucun article dans cette vente.</Empty>
            )}
            {lines.length > 0 && (
              <div className="basket-list">
                {lines.map((l) => {
                  const product = products.find((pr) => pr.id === l.productId);
                  const unitPrice = l.quantityValue > 0 ? parseMoney(l.linePrice) / l.quantityValue : 0;
                  const isWeight = (product?.unitType ?? l.unitType) === "WEIGHT";
                  const isPending = pendingLineIds.has(l.id);
                  return (
                    <div key={l.id} className={`basket-line ${isPending ? "is-pending" : ""}`}>
                      <div className="basket-line-main">
                        <div className="basket-line-name">{product?.name || l.productName}</div>
                        <div className="basket-line-sub">
                          <span className="basket-line-sku">{product?.sku || ""}</span>
                          <span className="basket-line-unitprice">{formatMoney(unitPrice)} / {isWeight ? "kg" : "unité"}</span>
                          {product?.vatRate != null && (
                            <span className="basket-line-vat">· TVA {product.vatRate}%</span>
                          )}
                        </div>
                      </div>
                      <div className="qty-stepper">
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => handleUpdateLine(l, {
                            quantityValue: Math.max(0, Number(l.quantityValue) - (isWeight ? 0.05 : 1)),
                          })}
                          disabled={completed || isPending}
                          aria-label="Diminuer la quantité"
                        >
                          <Minus size={14} />
                        </button>
                        <BasketQtyInput
                          value={l.quantityValue}
                          isWeight={isWeight}
                          disabled={completed || isPending}
                          onCommit={(num) => handleUpdateLine(l, { quantityValue: num })}
                        />
                        <span className="qty-unit">{isWeight ? "kg" : "×"}</span>
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => handleUpdateLine(l, {
                            quantityValue: Number(l.quantityValue) + (isWeight ? 0.05 : 1),
                          })}
                          disabled={completed || isPending}
                          aria-label="Augmenter la quantité"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <div className="basket-line-total">{formatMoney(l.linePrice)}</div>
                      {!completed && (
                        <button
                          type="button"
                          className="btn-icon basket-line-remove"
                          onClick={() => handleRemoveLine(l)}
                          disabled={isPending}
                          aria-label="Supprimer la ligne"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
                <div className="basket-grand-total">
                  <span>Total (TTC)</span>
                  <strong>{formatMoney(total)}</strong>
                </div>
                <div className="basket-vat-summary">
                  <span>Sous-total {formatMoney(netTotal)}</span>
                  <span>TVA {formatMoney(vatTotal)}</span>
                </div>
              </div>
            )}
          </Panel>
        </div>
      </div>

      {/* Modals */}
      {scannerModalOpen && transactionId && !completed && (
        <Modal title="Scanner un code-barres" icon={<Barcode size={16} />} onClose={() => setScannerModalOpen(false)}>
          <Message ok={scanMsg?.ok} text={scanMsg?.text} />
          <form onSubmit={(event) => { handleBarcodeScan(event); setScannerModalOpen(false); }} className="scanner-form">
            <div className="scanner-input-wrap">
              <Barcode size={18} className="scanner-icon" />
              <input
                ref={barcodeRef}
                type="text"
                value={barcodeValue}
                onChange={(event) => setBarcodeValue(event.target.value)}
                placeholder="Scanner ou saisir un code-barres"
                autoFocus
                disabled={scanning}
                aria-label="Code-barres"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={scanning || !barcodeValue.trim()}>
              <ScanLine size={14} /> {scanning ? "Ajout…" : "Ajouter"}
            </button>
          </form>
          {lastScan && <div className="scanner-flash"><CheckCircle2 size={14} /> Ajouté : {lastScan.qty} {lastScan.unit === "kg" ? "kg" : "×"} {lastScan.name}</div>}
        </Modal>
      )}

      {phonePairing && phonePairingOpen && (
        <Modal title="Associer le scanner mobile" icon={<Smartphone size={16} />} onClose={hidePhoneScanner}>
          <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginTop: 0 }}>
            Connectez le téléphone au même réseau Wi-Fi et scannez ce code QR. Une fois le téléphone associé, fermez cette fenêtre — le scanner restera actif.
          </p>
          <div className="phone-pairing-qr">
            <QRCodeSVG value={phonePairing.scannerUrl} size={220} includeMargin />
          </div>
          <div className="phone-pairing-url">
            <code>{phonePairing.scannerUrl}</code>
            <button
              type="button"
              className="btn-icon"
              title="Copier le lien du scanner"
              aria-label="Copier le lien du scanner"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(phonePairing.scannerUrl);
                  setPhonePairingMsg({ ok: true, text: "Lien du scanner copié." });
                } catch {
                  setPhonePairingMsg({ ok: false, text: "Impossible de copier le lien ; utilisez plutôt le QR code." });
                }
              }}
            ><Copy size={15} /></button>
          </div>
          <Message ok={phonePairingMsg?.ok} text={phonePairingMsg?.text} />
          <div className="modal-actions">
            <button type="button" className="btn btn-primary" onClick={hidePhoneScanner}>Terminé</button>
          </div>
        </Modal>
      )}

      {variantFamily && (
        <Modal
          title={variantFamily.family}
          icon={<ShoppingBag size={16} />}
          onClose={() => setVariantFamily(null)}
        >
          <p className="variant-picker-help">Choisissez le produit exact et son prix à ajouter à ce ticket.</p>
          <div className="variant-list">
            {variantFamily.products.map((product) => (
              <button
                key={product.id}
                type="button"
                className="variant-option"
                onClick={() => {
                  setVariantFamily(null);
                  handleQuickAdd(product);
                }}
                disabled={scanning}
              >
                <div className="variant-option-image">
                  <div className="product-art" aria-hidden="true">{productGlyph(product)}</div>
                  <img src={productImage(product, apiBase)} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />
                </div>
                <span className="variant-option-copy">
                  <strong>{product.name}</strong>
                <small>{product.sku} · {product.unitType === "WEIGHT" ? "vendu au kg" : "vendu à l’unité"}</small>
                </span>
                <strong className="variant-option-price">{formatMoney(priceByProductId.get(product.id) || 0)}</strong>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        </Modal>
      )}

      {sessionModal === "open" && (
        <Modal title="Ouvrir le tiroir-caisse" icon={<Unlock size={16} />} onClose={() => !openingSession && setSessionModal(null)}>
          <Message ok={sessionMsg?.ok} text={sessionMsg?.text} />
          <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginTop: 0 }}>
            Comptez les espèces déjà présentes dans le tiroir et saisissez le fonds de caisse initial.
          </p>
          <form onSubmit={handleOpenSession}>
            <Field label="Caisse">
              <select autoFocus value={tillId} onChange={(e) => setTillId(e.target.value)}>
                <option value="">Sélectionner une caisse…</option>
                {tills.filter((t) => t.status !== "OPEN" || t.id === tillId).map((t) => (
                  <option key={t.id} value={t.id}>{t.tillNumber}</option>
                ))}
              </select>
            </Field>
            <Field label="Nom du caissier">
              <input type="text" value={cashierName} onChange={(e) => setCashierName(e.target.value)} placeholder="ex. Sami" />
            </Field>
            <Field label="Fonds de caisse initial (TND)">
              <input type="number" min="0" step="0.001" value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} />
            </Field>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setSessionModal(null)} disabled={openingSession}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={openingSession}>{openingSession ? "Ouverture…" : "Ouvrir le tiroir"}</button>
            </div>
          </form>
        </Modal>
      )}

      {sessionModal === "close" && (
        <Modal title="Fermer le tiroir-caisse" icon={<Lock size={16} />} onClose={() => !closing && setSessionModal(null)}>
          <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginTop: 0 }}>
            Comptez les espèces du tiroir et saisissez le montant final pour rapprocher cette session.
          </p>
          <Message ok={closeMsg?.ok} text={closeMsg?.text} />
          <div className="reconcile-card">
            <div><span>Attendu</span><strong>{formatMoney(parseMoney(session?.expectedCash ?? 0))}</strong></div>
            <div><span>Compté</span><strong>{formatMoney(parseMoney(countedCash))}</strong></div>
            <div className={parseMoney(countedCash) - parseMoney(session?.expectedCash ?? 0) === 0 ? "" : "warn"}>
              <span>Écart</span>
              <strong>{formatMoney(parseMoney(countedCash) - parseMoney(session?.expectedCash ?? 0))}</strong>
            </div>
          </div>
          <form onSubmit={handleCloseSession}>
            <Field label="Espèces comptées à la fermeture (TND)">
              <input
                autoFocus
                type="number"
                min="0"
                step="0.001"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
              />
            </Field>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setSessionModal(null)} disabled={closing}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={closing}>{closing ? "Fermeture…" : "Fermer le tiroir"}</button>
            </div>
          </form>
        </Modal>
      )}

      <style>{`
        .pos-layout { display: flex; flex-direction: column; gap: 18px; }
        .pos-alert-stack { position: fixed; top: 18px; right: 24px; z-index: 120; display: flex; flex-direction: column; gap: 8px; width: min(420px, calc(100vw - 32px)); }
        .pos-alert { display: flex; align-items: flex-start; gap: 9px; padding: 12px 12px 12px 14px; border: 1px solid #E5B5A8; border-left: 4px solid var(--red); border-radius: 9px; background: #FFF9F7; color: var(--red); box-shadow: 0 10px 28px rgba(27,33,25,.16); font-size: 13px; line-height: 1.4; animation: pos-alert-in .18s ease-out; }
        .pos-alert > svg { flex: 0 0 auto; margin-top: 1px; }
        .pos-alert span { flex: 1; min-width: 0; }
        .pos-alert-close { display: inline-grid; place-items: center; flex: 0 0 auto; padding: 2px; border: 0; border-radius: 5px; background: transparent; color: currentColor; cursor: pointer; }
        .pos-alert-close:hover { background: var(--red-bg); }
        @keyframes pos-alert-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }

        /* Stepper */
        .pos-stepper {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px;
          background: var(--surface);
          border: 1px solid var(--hairline);
          border-radius: 10px;
        }
        .pos-stepper-line { flex: 1; height: 2px; background: var(--hairline); border-radius: 2px; }
        .pos-stepper .step.done + .pos-stepper-line { background: var(--green); }
        .step { display: flex; align-items: center; gap: 8px; color: var(--ink-soft); font-size: 13px; font-weight: 600; }
        .step .step-circle {
          width: 28px; height: 28px; border-radius: 50%;
          display: inline-flex; align-items: center; justify-content: center;
          background: var(--paper); border: 1px solid var(--hairline-strong); color: var(--ink-soft);
          font-family: 'Space Grotesk', sans-serif; font-size: 13px;
        }
        .step.active { color: var(--green-deep); }
        .step.active .step-circle { background: var(--green); border-color: var(--green); color: #fff; }
        .step.done .step-circle { background: var(--green-deep); border-color: var(--green-deep); color: #fff; }

        /* Layout */
        .pos-grid { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 20px; align-items: start; }
        .pos-col { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
        .pos-col-left, .pos-col-right { display: contents; }
        .pos-col-left > .panel, .pos-col-right > .panel { grid-column: 2; }
        .pos-payment-panel { grid-column: 1 !important; grid-row: 1 / span 4; position: sticky; top: 20px; align-self: start; }
        .pos-action-bar { grid-column: 2; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 12px 14px; background: var(--surface); border: 1px solid var(--hairline); border-radius: 10px; }
        .pos-action-bar .btn { flex: 1 1 145px; justify-content: center; }
        .pos-phone-status { grid-column: 2; margin: 0; }
        @media (max-width: 1080px) { .pos-grid { grid-template-columns: 1fr; } .pos-col-left, .pos-col-right { display: flex; } .pos-col-left > .panel, .pos-col-right > .panel, .pos-payment-panel, .pos-action-bar, .pos-phone-status { grid-column: auto !important; grid-row: auto; } .pos-payment-panel { position: static; order: -1; } }

        /* Drawer state block */
        .drawer-state {
          display: flex; align-items: center; gap: 14px;
          padding: 14px; border-radius: 10px;
          border: 1px solid var(--hairline-strong);
          background: var(--paper);
        }
        .drawer-state.is-open { background: #E4EFE3; border-color: #B7D4BE; }
        .drawer-state.is-closed { background: var(--paper); }
        .drawer-state-icon {
          width: 44px; height: 44px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          background: var(--surface); border: 1px solid var(--hairline-strong);
          color: var(--ink-soft);
        }
        .drawer-state.is-open .drawer-state-icon { color: var(--green-deep); border-color: var(--green); }
        .drawer-state-label { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 15px; color: var(--ink); }
        .drawer-state-meta { font-size: 12.5px; color: var(--ink-soft); margin-top: 2px; }
        .drawer-state-meta code { font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; }

        /* Scanner */
        .scanner-form { display: flex; gap: 8px; align-items: stretch; }
        .scanner-input-wrap {
          position: relative; flex: 1;
          display: flex; align-items: center;
        }
        .scanner-input-wrap input {
          width: 100%;
          padding: 12px 14px 12px 40px;
          font-size: 15px; font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.04em;
          border: 2px solid var(--green); border-radius: 8px;
          background: #fff; color: var(--ink);
        }
        .scanner-input-wrap input:focus { outline: none; box-shadow: 0 0 0 3px rgba(47,104,68,0.18); }
        .scanner-input-wrap input:disabled { opacity: 0.6; background: var(--paper); }
        .scanner-icon { position: absolute; left: 12px; color: var(--green); pointer-events: none; }
        .scanner-flash {
          margin-top: 10px;
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 10px; border-radius: 6px;
          background: #E4EFE3; color: var(--green-deep); font-size: 13px; font-weight: 600;
        }
        .phone-pairing-status {
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
          margin-top: 12px; padding: 10px 12px;
          border: 1px solid #B9D5BD; border-radius: 8px; background: #F0F8F0; color: var(--green-deep);
        }
        .phone-pairing-status > div:first-child { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .phone-pairing-status span { display: flex; flex-direction: column; gap: 2px; font-size: 12.5px; }
        .phone-pairing-status small { color: var(--ink-soft); font-size: 11px; }
        .phone-pairing-status-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .scanner-hint { margin-top: 10px; font-size: 12.5px; color: var(--ink-soft); }
        .phone-pairing-qr { display: flex; justify-content: center; padding: 12px; margin: 12px 0; background: #fff; border: 1px solid var(--hairline-strong); border-radius: 10px; }
        .phone-pairing-url { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: var(--paper); border-radius: 7px; }
        .phone-pairing-url code { flex: 1; min-width: 0; overflow-wrap: anywhere; font-size: 10px; color: var(--ink-soft); }

        /* Totals & payment */
        .totals-card {
          padding: 14px; border-radius: 10px;
          background: var(--paper);
          border: 1px solid var(--hairline-strong);
          margin-bottom: 14px;
        }
        .totals-row { display: flex; justify-content: space-between; font-size: 14px; color: var(--ink-soft); }
        .totals-row.big { font-family: 'Space Grotesk', sans-serif; font-size: 22px; font-weight: 700; color: var(--ink); margin-top: 6px; }

        .payment-toggle { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
        .payment-option {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 10px; border-radius: 8px; cursor: pointer;
          background: var(--surface); border: 1.5px solid var(--hairline-strong);
          font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; color: var(--ink);
        }
        .payment-option:hover { border-color: var(--green); }
        .payment-option.active { background: var(--green); border-color: var(--green); color: #fff; }

        .quick-tender { display: flex; gap: 6px; flex-wrap: wrap; margin: -6px 0 14px; }
        .change-due {
          display: flex; justify-content: space-between; align-items: center;
          padding: 10px 12px; border-radius: 8px;
          background: var(--paper); border: 1px solid var(--hairline-strong);
          margin-bottom: 12px; font-size: 13.5px;
        }
        .change-due.ok { background: #E4EFE3; border-color: #B7D4BE; color: var(--green-deep); }
        .change-due.short { background: var(--red-bg); border-color: #EBC1B6; color: var(--red); }
        .change-due strong { font-family: 'Space Grotesk', sans-serif; font-weight: 700; }

        .complete-btn {
          width: 100%; justify-content: center;
          padding: 14px; font-size: 15px; font-family: 'Space Grotesk', sans-serif;
        }
        .complete-hint { font-size: 12.5px; color: var(--amber); margin: 6px 0 8px; text-align: center; }

        .btn-link {
          background: none; border: none; cursor: pointer;
          font-family: 'Inter', sans-serif; font-size: 12.5px;
          color: var(--ink-soft); display: inline-flex; align-items: center; gap: 5px;
          margin-top: 10px; padding: 6px; border-radius: 6px;
          width: 100%; justify-content: center;
        }
        .btn-link:hover { background: var(--paper); }
        .btn-link.danger { color: var(--red); }
        .btn-link.danger:hover { background: var(--red-bg); }
        .btn-link:disabled { opacity: 0.5; cursor: default; }

        .void-confirm {
          margin-top: 12px; padding: 12px;
          border: 1px solid #EBC1B6; border-radius: 10px;
          background: var(--red-bg);
        }
        .void-confirm-title {
          display: flex; align-items: center; gap: 6px;
          font-size: 12.5px; font-weight: 600; color: var(--red); margin-bottom: 8px;
        }
        .btn-danger { background: var(--red); border-color: var(--red); color: #fff; }
        .btn-danger:hover { filter: brightness(0.95); }

        /* Product browser */
        .browser-controls { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
        .filter-chips { display: flex; gap: 6px; }
        .filter-chip {
          font-family: 'Inter', sans-serif; font-weight: 600; font-size: 12.5px;
          padding: 7px 12px; border-radius: 999px;
          background: var(--paper); border: 1px solid var(--hairline-strong); color: var(--ink-soft);
          cursor: pointer;
        }
        .filter-chip:hover { border-color: var(--green); color: var(--green-deep); }
        .filter-chip.active { background: var(--green); border-color: var(--green); color: #fff; }

        .product-grid {
          display: grid; gap: 10px;
          grid-template-columns: repeat(auto-fill, minmax(185px, 1fr));
          max-height: 520px; overflow: auto; padding: 2px 4px 4px 2px;
        }
        .product-tile {
          text-align: left;
          min-height: 238px; padding: 9px; border-radius: 12px;
          background: var(--surface);
          border: 1px solid var(--hairline);
          cursor: pointer;
          display: flex; flex-direction: column; gap: 6px;
          font-family: 'Inter', sans-serif; color: var(--ink);
          transition: border-color 0.12s, transform 0.12s, box-shadow 0.12s;
        }
        .product-tile:hover:not(:disabled) { border-color: var(--green); transform: translateY(-2px); box-shadow: 0 8px 18px rgba(31,72,48,.10); }
        .product-tile:disabled { opacity: 0.6; cursor: not-allowed; }
        .product-tile.is-busy { border-color: var(--green); background: #E4EFE3; }
        .product-tile.has-variants { border-color: #C6D7C5; background: #FBFDF9; }
        .product-image-frame, .variant-option-image {
          position: relative; overflow: hidden; display: grid; place-items: center;
          background: #E9EFE7; border-radius: 9px; isolation: isolate;
        }
        .product-image-frame { height: 124px; margin-bottom: 8px; }
        .product-image-frame::after, .variant-option-image::after { content: ""; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,.18), transparent 55%); pointer-events: none; }
        .product-image-frame img, .variant-option-image img { position: absolute; inset: 0; z-index: 1; width: 100%; height: 100%; object-fit: cover; }
        .product-art { position: relative; z-index: 0; font-size: 46px; filter: drop-shadow(0 5px 5px rgba(31,72,48,.15)); }
        .variant-count { position: absolute; z-index: 2; right: 7px; bottom: 7px; padding: 4px 7px; border-radius: 999px; background: var(--green-deep); color: #fff; font-size: 10px; font-weight: 700; }
        .product-tile-name { min-height: 34px; font-weight: 700; font-size: 13.5px; line-height: 1.25; }
        .product-tile-meta { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
        .product-tile-sku { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--ink-soft); }
        .product-tile-footer {
          margin-top: auto;
          display: flex; align-items: center; justify-content: space-between; gap: 4px;
          font-size: 12px; color: var(--green-deep);
        }
        .product-tile-footer strong { font-family: 'Space Grotesk', sans-serif; font-size: 14px; }

        /* Basket */
        .empty-sale-state {
          min-height: 140px; display: flex; flex-direction: column; gap: 10px;
          align-items: center; justify-content: center; text-align: center;
          color: var(--ink-soft); font-size: 14px; line-height: 1.5; padding: 16px;
        }
        .basket-list { display: flex; flex-direction: column; gap: 8px; }
        .basket-line {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto auto;
          gap: 12px; align-items: center;
          padding: 10px 12px;
          background: var(--surface); border: 1px solid var(--hairline); border-radius: 8px;
          transition: opacity 0.12s;
        }
        .basket-line.is-pending { opacity: 0.6; }
        .basket-line-main { min-width: 0; }
        .basket-line-name { font-weight: 600; font-size: 14px; }
        .basket-line-sub { display: flex; gap: 8px; font-size: 12px; color: var(--ink-soft); margin-top: 2px; flex-wrap: wrap; }
        .basket-line-sku { font-family: 'IBM Plex Mono', monospace; }
        .basket-line-total { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 14px; min-width: 90px; text-align: right; }
        .basket-line-remove { color: var(--ink-soft); }
        .basket-line-remove:hover { color: var(--red); background: var(--red-bg); }

        .qty-stepper { display: inline-flex; align-items: center; gap: 4px; background: var(--paper); padding: 3px 4px; border-radius: 8px; border: 1px solid var(--hairline-strong); }
        .qty-btn {
          width: 26px; height: 26px; border-radius: 6px;
          background: var(--surface); border: 1px solid var(--hairline-strong);
          display: inline-flex; align-items: center; justify-content: center;
          cursor: pointer; color: var(--ink-soft);
        }
        .qty-btn:hover:not(:disabled) { color: var(--green-deep); border-color: var(--green); }
        .qty-btn:disabled { opacity: 0.5; cursor: default; }
        .qty-input {
          width: 64px; padding: 4px 6px; text-align: center;
          border: 1px solid var(--hairline-strong); border-radius: 6px;
          background: var(--surface); font-family: 'IBM Plex Mono', monospace; font-size: 13px;
        }
        .qty-input:disabled { opacity: 0.5; }
        .qty-unit { color: var(--ink-soft); font-size: 12px; padding: 0 4px; }

        .basket-grand-total {
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 12px; margin-top: 6px;
          border-top: 2px solid var(--ink); border-bottom: none;
          font-family: 'Space Grotesk', sans-serif; font-size: 16px;
        }
        .basket-grand-total strong { font-size: 20px; }
        .basket-vat-summary {
          display: flex; justify-content: flex-end; gap: 14px;
          margin-top: 2px; color: var(--ink-soft); font-size: 12px;
        }

        .variant-picker-help { margin: -4px 0 14px; color: var(--ink-soft); font-size: 13px; }
        .variant-list { display: flex; flex-direction: column; gap: 8px; }
        .variant-option {
          display: grid; grid-template-columns: 52px minmax(0, 1fr) auto auto; align-items: center; gap: 10px;
          width: 100%; padding: 7px; text-align: left; color: var(--ink);
          background: var(--surface); border: 1px solid var(--hairline); border-radius: 9px; cursor: pointer;
        }
        .variant-option:hover:not(:disabled) { border-color: var(--green); background: #FBFDF9; }
        .variant-option:disabled { opacity: .6; cursor: default; }
        .variant-option-image { width: 52px; height: 52px; }
        .variant-option-image .product-art { font-size: 27px; }
        .variant-option-copy { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .variant-option-copy strong { overflow: hidden; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
        .variant-option-copy small { color: var(--ink-soft); font-family: 'IBM Plex Mono', monospace; font-size: 10px; }
        .variant-option-price { font-family: 'Space Grotesk', sans-serif; font-size: 13px; white-space: nowrap; }

        /* Reconcile modal */
        .reconcile-card {
          display: grid; gap: 6px; padding: 12px;
          border: 1px solid var(--hairline-strong); border-radius: 8px;
          background: var(--paper); margin-bottom: 14px; font-size: 13.5px;
        }
        .reconcile-card > div { display: flex; justify-content: space-between; }
        .reconcile-card strong { font-family: 'Space Grotesk', sans-serif; }
        .reconcile-card .warn { color: var(--amber); }
        .reconcile-card .warn strong { color: var(--amber); }

        /* Action stack (shared) */
        .action-stack { display: flex; flex-direction: column; gap: 8px; }
      `}</style>
    </div>
  );
}

function Step({ n, active, done, label, icon }) {
  return (
    <div className={`step ${active ? "active" : ""} ${done ? "done" : ""}`}>
      <span className="step-circle">{done ? <CheckCircle2 size={14} /> : n}</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{icon} {label}</span>
    </div>
  );
}

function PosAlertStack({ alerts, onDismiss }) {
  if (!alerts.length) return null;
  return (
    <div className="pos-alert-stack" role="alert" aria-live="assertive">
      {alerts.map((alert) => (
        <div key={alert.id} className="pos-alert">
          <AlertTriangle size={17} />
          <span>{alert.text}</span>
          <button type="button" className="pos-alert-close" onClick={() => onDismiss(alert.id)} aria-label="Fermer l’alerte">
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}

function TicketsTab({ products, onResumeTicket }) {
  const { request } = useApi();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request("/api/pos/transactions");
      setTickets(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError(err.message || "Impossible de charger les tickets.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  const handleDeleteTicket = useCallback(async (ticketId) => {
    if (!window.confirm("Supprimer ce ticket en cours ? Cette action est irréversible.")) return;
    try {
      await request(`/api/pos/transactions/${ticketId}`, { method: "DELETE" });
      setTickets((prev) => prev.filter((ticket) => ticket.id !== ticketId));
    } catch (err) {
      setError(err.message || "Impossible de supprimer le ticket.");
    }
  }, [request]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const filtered = useMemo(() => {
    if (statusFilter === "ALL") return tickets;
    return tickets.filter((t) => t.status === statusFilter);
  }, [tickets, statusFilter]);

  const counts = useMemo(() => ({
    ALL: tickets.length,
    IN_PROGRESS: tickets.filter((t) => t.status === "IN_PROGRESS").length,
    COMPLETED: tickets.filter((t) => t.status === "COMPLETED").length,
    VOIDED: tickets.filter((t) => t.status === "VOIDED").length,
  }), [tickets]);

  return (
    <Panel
      title="Historique des tickets"
      icon={<History size={16} />}
      right={
        <button className="btn" onClick={loadTickets} disabled={loading} style={{ padding: "5px 10px" }}>
          <RefreshCw size={13} /> Actualiser
        </button>
      }
    >
      <Message ok={false} text={error} />
      <div className="ticket-filters">
        {[
          { key: "ALL", label: "Tous" },
          { key: "IN_PROGRESS", label: "En cours" },
          { key: "COMPLETED", label: "Terminés" },
          { key: "VOIDED", label: "Annulés" },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            className={`filter-chip ${statusFilter === f.key ? "active" : ""}`}
            onClick={() => setStatusFilter(f.key)}
          >
            {f.label} <span style={{ opacity: 0.7, marginLeft: 4 }}>{counts[f.key] ?? 0}</span>
          </button>
        ))}
      </div>
      {loading && <Empty>Chargement des tickets…</Empty>}
      {!loading && !error && filtered.length === 0 && <Empty>Aucun ticket.</Empty>}
      {!loading && filtered.map((ticket) => (
        <div key={ticket.id} className={`ticket-row status-${ticket.status.toLowerCase()}`}>
          <div className="ticket-row-main">
            <div className="ticket-row-head">
              <span className="ticket-row-id">Ticket {ticket.id.slice(0, 8)}</span>
              <Chip warn={ticket.status !== "COMPLETED"}>{ticketStatusLabel(ticket.status)}</Chip>
              {ticket.paymentMethod && <Chip>{paymentMethodLabel(ticket.paymentMethod)}</Chip>}
            </div>
            <div className="ticket-row-meta">
              {formatDate(ticket.completedAt || ticket.startedAt)} · {ticket.lines.length} article(s)
            </div>
          </div>
          <div className="ticket-row-total">{ticket.total}</div>
          <div className="ticket-row-actions">
            <button className="btn-icon" onClick={() => printReceipt(ticket, products)} title="Imprimer le reçu" aria-label="Imprimer">
              <Printer size={14} />
            </button>
            {ticket.status === "IN_PROGRESS" && onResumeTicket && (
              <>
                <button className="btn btn-primary" onClick={() => onResumeTicket(ticket.id)}>
                  Reprendre
                </button>
                <button
                  className="btn-icon danger"
                  onClick={() => handleDeleteTicket(ticket.id)}
                  title="Supprimer le ticket"
                  aria-label="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      ))}
      <style>{`
        .ticket-filters { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
        /* Defined here (not just borrowed from CheckoutTab) so these chips are styled
           even when CheckoutTab isn't mounted — which is always true while this tab is visible. */
        .filter-chip {
          font-family: 'Inter', sans-serif; font-weight: 600; font-size: 12.5px;
          padding: 7px 12px; border-radius: 999px;
          background: var(--paper); border: 1px solid var(--hairline-strong); color: var(--ink-soft);
          cursor: pointer;
        }
        .filter-chip:hover { border-color: var(--green); color: var(--green-deep); }
        .filter-chip.active { background: var(--green); border-color: var(--green); color: #fff; }
        .ticket-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto;
          gap: 14px; align-items: center;
          padding: 12px 14px;
          border: 1px solid var(--hairline); border-radius: 10px;
          background: var(--surface);
          margin-bottom: 8px;
        }
        .ticket-row.status-in_progress { border-left: 4px solid var(--amber); }
        .ticket-row.status-completed { border-left: 4px solid var(--green); }
        .ticket-row.status-voided { border-left: 4px solid var(--red); opacity: 0.85; }
        .ticket-row-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .ticket-row-id { font-family: 'IBM Plex Mono', monospace; font-size: 13px; font-weight: 600; }
        .ticket-row-meta { font-size: 12.5px; color: var(--ink-soft); margin-top: 4px; }
        .ticket-row-total { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 16px; }
        .ticket-row-actions { display: flex; align-items: center; gap: 6px; }
        .btn-icon.danger { color: var(--ink-soft); }
        .btn-icon.danger:hover { color: var(--red); background: var(--red-bg); }
      `}</style>
    </Panel>
  );
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString("fr-FR") : "Non terminé";
}

function parseQuantityValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const match = value.match(/-?\d+(?:\.\d+)?/);
    if (match) return Number(match[0]);
  }
  return 0;
}

function printReceipt(ticket, products = []) {
  const receipt = window.open("", "_blank", "width=420,height=700");
  if (!receipt) return;

  const lines = (ticket.lines || []).map((line) => {
    const productId = line.productId;
    const product = products.find((p) => p.id === productId);
    const quantity = parseQuantityValue(line.quantity ?? line.quantityValue ?? 0);
    const lineTotal = parseMoney(line.lineTotal ?? line.linePrice ?? 0);
    const unitPrice = quantity > 0 ? lineTotal / quantity : 0;
    const quantityUnit = (typeof line.quantity === "string" && line.quantity.includes("kg")) || product?.unitType === "WEIGHT" ? "kg" : "unit";
    const productName = escapeHtml(
      line.productName || product?.name || (typeof productId === "string" ? productId.slice(0, 8) : "Produit")
    );

    return `<tr>
      <td>${quantity} ${quantityUnit}</td>
      <td>${productName}</td>
      <td class="amount">${unitPrice.toFixed(3)}</td>
      <td class="amount">${lineTotal.toFixed(3)}</td>
    </tr>`;
  }).join("");

  const ticketIdShort = escapeHtml(String(ticket.id).slice(0, 8));
  const ticketIdFull = escapeHtml(ticket.id);
  const paymentMethod = escapeHtml(ticket.paymentMethod || "—");
  const grossTotal = parseMoney(ticket.total);
  const vatTotal = parseMoney(ticket.vatTotal);
  const netTotal = ticket.netTotal == null ? grossTotal - vatTotal : parseMoney(ticket.netTotal);

  receipt.document.write(`<!doctype html><html lang="fr"><head><title>Reçu ${ticketIdShort}</title><style>body{font-family:Arial,sans-serif;width:280px;margin:24px auto;color:#111}h1{text-align:center;font-size:18px;margin:0 0 4px}p{text-align:center;font-size:11px;margin:4px 0 16px}table{width:100%;border-collapse:collapse;font-size:11px}th{font-size:10px;text-align:left;padding:4px 0;border-bottom:1px solid #111}td{padding:5px 0;border-bottom:1px dashed #bbb;vertical-align:top}.amount{text-align:right}.summary{width:100%;font-size:11px;margin-top:10px}.summary td{border:0;padding:3px 0}.summary .grand td{font-weight:bold;font-size:14px;border-top:2px solid #111;padding-top:8px}.footer{text-align:center;margin-top:22px;font-size:11px}</style></head><body><h1>SUPERMARCHÉ</h1><p>Ticket ${ticketIdFull}<br>${formatDate(ticket.completedAt || ticket.startedAt)}<br>Paiement : ${paymentMethodLabel(paymentMethod)}</p><table><thead><tr><th>Qté</th><th>Article</th><th class="amount">Unité</th><th class="amount">Total</th></tr></thead><tbody>${lines}</tbody></table><table class="summary"><tr><td>Sous-total (hors TVA)</td><td class="amount">${netTotal.toFixed(3)} TND</td></tr><tr><td>TVA</td><td class="amount">${vatTotal.toFixed(3)} TND</td></tr><tr class="grand"><td>TOTAL (TTC)</td><td class="amount">${grossTotal.toFixed(3)} TND</td></tr></table><p class="footer">Merci de votre visite</p></body></html>`);
  receipt.document.close();
  receipt.focus();
  receipt.onload = () => receipt.print();
}
