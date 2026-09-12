import { CheckCircle2, XCircle, X } from "lucide-react";
import { useEffect, useRef } from "react";

/** A "shelf label" card - the signature visual element reused across all modules
 *  (product cards in Inventory, price tags in Pricing, alert cards in Procurement, etc). */
export function ShelfTag({ children, style = {} }) {
  return (
    <div className="tag-card" style={style}>
      {children}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export function Chip({ children, warn = false }) {
  return <span className={`chip ${warn ? "warn" : ""}`}>{children}</span>;
}

export function Panel({ title, icon, right, className = "", children }) {
  return (
    <section className={`panel ${className}`.trim()}>
      <h2 className="panel-title" style={right ? { justifyContent: "space-between" } : undefined}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {icon} {title}
        </span>
        {right}
      </h2>
      {children}
    </section>
  );
}

/** Success/error banner used after form submissions across every module. */
export function Message({ ok, text }) {
  if (!text) return null;
  return (
    <div className={`msg ${ok ? "ok" : "err"}`}>
      {ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
      {text}
    </div>
  );
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

export function Tabs({ tabs, active, onChange }) {
  function handleKeyDown(e, index) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + dir + tabs.length) % tabs.length;
    onChange(tabs[nextIndex].key);
    // Move focus to the newly active tab so keyboard users can keep arrowing through.
    const nextEl = e.currentTarget.parentElement?.children[nextIndex];
    nextEl?.focus();
  }

  return (
    <div className="tabs" role="tablist">
      {tabs.map((t, i) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={active === t.key}
          tabIndex={active === t.key ? 0 : -1}
          className={`tab ${active === t.key ? "active" : ""}`}
          onClick={() => onChange(t.key)}
          onKeyDown={(e) => handleKeyDown(e, i)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({ title, icon, onClose, children }) {
  const modalRef = useRef(null);
  const previouslyFocused = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Lock background scroll, trap focus inside the dialog, and restore both
  // the scroll position and the triggering element's focus on close.
  useEffect(() => {
    previouslyFocused.current = document.activeElement;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = () =>
      modalRef.current?.querySelectorAll(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
      ) ?? [];

    const first = focusables()[0];
    first?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = Array.from(focusables());
      if (nodes.length === 0) return;
      const firstEl = nodes[0];
      const lastEl = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, []);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={modalRef}>
        <div className="modal-header">
          <h2 id="modal-title" className="panel-title">{icon} {title}</h2>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close dialog"><X size={17} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}