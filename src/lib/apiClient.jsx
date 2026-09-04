import { createContext, useCallback, useContext, useState } from "react";

const ApiContext = createContext(null);

export function ApiProvider({ children }) {
  // Empty means same-origin. Vite proxies /api to Spring Boot in development,
  // which also lets a phone use the PC's hostname instead of resolving its own localhost.
  const [apiBase, setApiBase] = useState(import.meta.env.VITE_API_BASE_URL || "");
  const [connection, setConnection] = useState("unknown"); // unknown | ok | fail

  /** request("/api/inventory/products") or request("/api/inventory/products", { method: "POST", body: {...} }) */
  const request = useCallback(
    async (path, { method = "GET", body, headers } = {}) => {
      try {
        const res = await fetch(`${apiBase}${path}`, {
          method,
          headers: {
            ...(body ? { "Content-Type": "application/json" } : {}),
            ...(headers || {}),
          },
          body: body ? JSON.stringify(body) : undefined,
        });
        const text = await res.text();
        if (!res.ok) {
          // Every error response from this API shares the shape:
          // { timestamp, status, error, message }. message is sometimes in French.
          console.error(`${method} ${path} -> ${res.status}`, text);
          let detail = text || "no response body — check the server console for the stack trace";
          try {
            const parsed = JSON.parse(text);
            if (parsed?.message) detail = parsed.message;
          } catch {
            // body wasn't JSON (e.g. a raw stack trace) - fall back to the raw text above
          }
          throw new Error(detail);
        }
        setConnection("ok");
        return text ? JSON.parse(text) : null;
      } catch (err) {
        setConnection("fail");
        throw err;
      }
    },
    [apiBase]
  );

  return (
    <ApiContext.Provider value={{ apiBase, setApiBase, connection, request }}>
      {children}
    </ApiContext.Provider>
  );
}

export function useApi() {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error("useApi() must be used inside <ApiProvider>");
  return ctx;
}
