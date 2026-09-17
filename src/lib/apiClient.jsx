import { createContext, useCallback, useContext, useState } from "react";

const ApiContext = createContext(null);
const AUTH_STORAGE_KEY = "supermarket-erp-auth";

function readStoredAuth() {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function ApiProvider({ children }) {
  // Empty means same-origin. Vite proxies /api to Spring Boot in development,
  // which also lets a phone use the PC's hostname instead of resolving its own localhost.
  const [apiBase, setApiBase] = useState(import.meta.env.VITE_API_BASE_URL || "");
  const [connection, setConnection] = useState("unknown"); // unknown | ok | fail
  const [auth, setAuth] = useState(readStoredAuth);

  const persistSession = useCallback((session) => {
    setAuth(session);
    try {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // The app still works for the current tab when storage is unavailable.
    }
    return session;
  }, []);

  const logout = useCallback(() => {
    setAuth(null);
    try {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // Ignore storage failures; the in-memory session is cleared.
    }
  }, []);

  /** request("/api/inventory/products") or request("/api/inventory/products", { method: "POST", body: {...} }) */
  const request = useCallback(
    async (path, { method = "GET", body, headers } = {}) => {
      try {
        const authorization = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};
        const res = await fetch(`${apiBase}${path}`, {
          method,
          headers: {
            ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
            ...authorization,
            ...(headers || {}),
          },
          body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
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
          if (res.status === 401 && !path.startsWith("/api/auth/")) logout();
          throw new Error(detail);
        }
        setConnection("ok");
        return text ? JSON.parse(text) : null;
      } catch (err) {
        setConnection("fail");
        throw err;
      }
    },
    [apiBase, auth?.token, logout]
  );

  const login = useCallback(async (credentials) => {
    const session = await request("/api/auth/login", { method: "POST", body: credentials });
    return persistSession(session);
  }, [persistSession, request]);

  const registerFirstAdmin = useCallback(async (details) => {
    const session = await request("/api/auth/register", { method: "POST", body: details });
    return persistSession(session);
  }, [persistSession, request]);

  const hasAnyRole = useCallback((roles = []) => {
    if (!auth?.user?.roles) return false;
    return roles.length === 0 || roles.some((role) => auth.user.roles.includes(role));
  }, [auth?.user?.roles]);

  return (
    <ApiContext.Provider value={{
      apiBase,
      setApiBase,
      connection,
      request,
      auth,
      login,
      registerFirstAdmin,
      logout,
      hasAnyRole,
    }}>
      {children}
    </ApiContext.Provider>
  );
}

export function useApi() {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error("useApi() must be used inside <ApiProvider>");
  return ctx;
}
