import { useCallback, useEffect, useState } from "react";
import { CircleDollarSign, FileText, RefreshCw, Scale, Wallet } from "lucide-react";
import { useApi } from "../../lib/apiClient.jsx";
import { Chip, Empty, Field, Message, Panel, ShelfTag } from "../../design/components.jsx";

function amountValue(value) {
  const amount = Number.parseFloat(String(value ?? "0").replace(/[^\d.-]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function amountLabel(value) { return `${amountValue(value).toFixed(3)} TND`; }

function invoiceStatusLabel(status) {
  return { DRAFT: "Brouillon", PENDING: "En attente", PARTIALLY_PAID: "Partiellement payée", PAID: "Payée", OVERDUE: "En retard" }[status] || status || "Inconnue";
}

export default function FinanceModule() {
  const { request } = useApi();
  const [journals, setJournals] = useState([]);
  const [report, setReport] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [invoiceForm, setInvoiceForm] = useState({ supplierId: "", invoiceNumber: "", subtotal: "", vatRate: "19" });
  const [invoiceMsg, setInvoiceMsg] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [journalResult, reportResult, invoiceResult, supplierResult] = await Promise.allSettled([
      request("/api/finance/journals"),
      request("/api/finance/reports/profit-and-loss"),
      request("/api/finance/supplier-invoices"),
      request("/api/procurement/suppliers"),
    ]);
    if (journalResult.status === "fulfilled") setJournals(journalResult.value || []);
    if (reportResult.status === "fulfilled") setReport(reportResult.value);
    if (invoiceResult.status === "fulfilled") setInvoices(invoiceResult.value || []);
    if (supplierResult.status === "fulfilled") setSuppliers(supplierResult.value || []);
    if ([journalResult, reportResult, invoiceResult].every((result) => result.status === "rejected")) {
      setError("Le service financier est indisponible.");
    }
    setLoading(false);
  }, [request]);

  useEffect(() => { load(); }, [load]);

  async function createInvoice(event) {
    event.preventDefault();
    setInvoiceMsg(null);
    try {
      await request("/api/finance/supplier-invoices", {
        method: "POST",
        body: {
          supplierId: invoiceForm.supplierId,
          invoiceNumber: invoiceForm.invoiceNumber.trim(),
          subtotal: Number(invoiceForm.subtotal),
          vatRate: Number(invoiceForm.vatRate),
        },
      });
      setInvoiceMsg({ ok: true, text: "Facture fournisseur enregistrée." });
      setInvoiceForm({ supplierId: "", invoiceNumber: "", subtotal: "", vatRate: "19" });
      load();
    } catch (err) {
      setInvoiceMsg({ ok: false, text: err.message || "Impossible d’enregistrer la facture." });
    }
  }

  async function payInvoice(invoice) {
    const amount = window.prompt(`Montant à payer (solde restant ${amountLabel(invoice.outstanding)})`, invoice.outstanding?.replace(/[^\d.-]/g, ""));
    if (!amount) return;
    const reference = window.prompt("Référence du paiement");
    if (!reference) return;
    try {
      await request(`/api/finance/supplier-invoices/${invoice.id}/payments`, {
        method: "POST",
        body: { paymentReference: reference, amount: Number(amount), paymentMethod: "BANK" },
      });
      load();
    } catch (err) {
      setError(err.message || "Impossible d’enregistrer le paiement.");
    }
  }

  const cards = [
    ["Chiffre d’affaires", report?.revenue, CircleDollarSign, "green"],
    ["Coût des marchandises vendues", report?.costOfGoodsSold, FileText, "amber"],
    ["Marge brute", report?.grossProfit, Scale, "green"],
    ["Résultat net", report?.netProfit, CircleDollarSign, "green"],
    ["TVA collectée", report?.outputVat, Wallet, "red"],
  ];

  return (
    <div>
      <h1 className="page-title">Finance</h1>
      <p className="page-sub">Journaux équilibrés, dettes fournisseurs, TVA et compte de résultat.</p>
      <Message ok={false} text={error} />

      <div className="dashboard-grid">
        {cards.map(([label, value, Icon, tone]) => (
          <div className={`stat-card ${tone}`} key={label}>
            <div className="stat-head"><div className="stat-icon"><Icon size={18} /></div><span className="stat-label">{label}</span></div>
            <div className="stat-value">{loading ? "..." : amountLabel(value)}</div>
            <div className="stat-detail">Période comptable en cours</div>
          </div>
        ))}
      </div>

      <div className="finance-layout">
        <Panel title="Enregistrer une facture fournisseur" icon={<FileText size={16} />}>
          <Message ok={invoiceMsg?.ok} text={invoiceMsg?.text} />
          <form onSubmit={createInvoice}>
            <Field label="Fournisseur">
              <select value={invoiceForm.supplierId} onChange={(e) => setInvoiceForm({ ...invoiceForm, supplierId: e.target.value })} required>
                <option value="">Sélectionner un fournisseur…</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
            </Field>
            <Field label="Numéro de facture"><input value={invoiceForm.invoiceNumber} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })} required /></Field>
            <Field label="Sous-total (TND)"><input type="number" min="0.001" step="0.001" value={invoiceForm.subtotal} onChange={(e) => setInvoiceForm({ ...invoiceForm, subtotal: e.target.value })} required /></Field>
            <Field label="TVA (%)"><input type="number" min="0" max="100" step="0.01" value={invoiceForm.vatRate} onChange={(e) => setInvoiceForm({ ...invoiceForm, vatRate: e.target.value })} required /></Field>
            <button className="btn btn-primary" type="submit" style={{ width: "100%", justifyContent: "center" }}>Enregistrer la facture</button>
          </form>
        </Panel>

        <Panel title="Factures fournisseurs" icon={<FileText size={16} />} right={<button className="btn btn-small" onClick={load} disabled={loading}><RefreshCw size={13} /> Actualiser</button>}>
          {invoices.length === 0 ? <Empty>Aucune facture fournisseur enregistrée.</Empty> : invoices.map((invoice) => (
            <ShelfTag key={invoice.id}>
              <div className="tag-row"><div><div className="tag-name">{invoice.invoiceNumber}</div><div className="tag-sku">{invoiceStatusLabel(invoice.status)} · {invoice.issueDate}</div></div><Chip>{amountLabel(invoice.total)}</Chip></div>
              <div className="tag-meta"><span>Solde restant : {amountLabel(invoice.outstanding)}</span>{invoice.status !== "PAID" && <button className="btn" onClick={() => payInvoice(invoice)}>Enregistrer le paiement</button>}</div>
            </ShelfTag>
          ))}
        </Panel>
      </div>

      <Panel title="Écritures comptables" icon={<Wallet size={16} />} right={<Chip>{journals.length} écritures</Chip>}>
        {journals.length === 0 ? <Empty>Aucune écriture comptable enregistrée.</Empty> : journals.map((journal) => (
          <ShelfTag key={journal.id}>
            <div className="tag-row"><div><div className="tag-name">{journal.description}</div><div className="tag-sku">{new Date(journal.postedAt).toLocaleString("fr-FR")}</div></div><Chip>{journal.eventKey.split(":")[0]}</Chip></div>
            <div className="journal-lines">
              {journal.lines.map((line) => <div className="journal-line" key={line.id}><span>{line.account}</span><span>{line.debit !== "0.000 TND" ? `Dr ${line.debit}` : `Cr ${line.credit}`}</span></div>)}
            </div>
          </ShelfTag>
        ))}
      </Panel>
    </div>
  );
}
