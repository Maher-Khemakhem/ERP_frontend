import { useEffect, useState } from "react";
import { LockKeyhole, LogIn, UserPlus } from "lucide-react";
import { useApi } from "../lib/apiClient.jsx";

export default function LoginPage() {
  const { request, login, registerFirstAdmin } = useApi();
  const [setupRequired, setSetupRequired] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [form, setForm] = useState({ username: "", displayName: "", password: "" });
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    request("/api/auth/setup-status")
      .then((status) => {
        if (active) setSetupRequired(Boolean(status?.setupRequired));
      })
      .catch((error) => {
        if (active) setMessage(error.message || "Could not reach the API.");
      })
      .finally(() => {
        if (active) setCheckingSetup(false);
      });
    return () => { active = false; };
  }, [request]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    setSubmitting(true);
    try {
      if (setupRequired) {
        await registerFirstAdmin({
          username: form.username,
          displayName: form.displayName,
          password: form.password,
        });
      } else {
        await login({ username: form.username, password: form.password });
      }
    } catch (error) {
      setMessage(error.message || "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand"><span className="brand-mark">Counter</span><span>Store operations</span></div>
        <div className="auth-heading">
          {setupRequired ? <UserPlus size={21} /> : <LockKeyhole size={21} />}
          <div>
            <h1>{checkingSetup ? "Connecting" : setupRequired ? "Create administrator" : "Sign in"}</h1>
            <p>{checkingSetup ? "Checking whether the system needs its first user." : setupRequired ? "Create the first account to secure the system." : "Use your account to continue."}</p>
          </div>
        </div>
        {message && <div className="auth-error" role="alert">{message}</div>}
        <form onSubmit={submit}>
          <label className="auth-field">
            <span>Username</span>
            <input autoComplete="username" value={form.username} onChange={(event) => update("username", event.target.value)} required disabled={checkingSetup || submitting} />
          </label>
          {setupRequired && (
            <label className="auth-field">
              <span>Display name</span>
              <input value={form.displayName} onChange={(event) => update("displayName", event.target.value)} required disabled={checkingSetup || submitting} />
            </label>
          )}
          <label className="auth-field">
            <span>Password</span>
            <input type="password" autoComplete={setupRequired ? "new-password" : "current-password"} value={form.password} onChange={(event) => update("password", event.target.value)} required minLength={8} disabled={checkingSetup || submitting} />
          </label>
          <button className="btn btn-primary auth-submit" type="submit" disabled={checkingSetup || submitting}>
            {setupRequired ? <UserPlus size={16} /> : <LogIn size={16} />}
            {submitting ? "Please wait..." : setupRequired ? "Create administrator" : "Sign in"}
          </button>
        </form>
        {setupRequired && <p className="auth-note">The first account automatically receives the ADMIN role. Additional users can be created from Users after signing in.</p>}
      </section>
      <style>{`
        .auth-page { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: var(--paper); color: var(--ink); }
        .auth-card { width: min(100%, 420px); padding: 30px; background: var(--surface); border: 1px solid var(--hairline); border-radius: 14px; box-shadow: 0 18px 50px rgba(31, 72, 48, .09); }
        .auth-brand { display: flex; flex-direction: column; gap: 3px; color: var(--ink-soft); font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }
        .auth-brand .brand-mark { color: var(--green-deep); font-family: 'Space Grotesk', sans-serif; font-size: 22px; font-weight: 700; letter-spacing: .02em; text-transform: none; }
        .auth-heading { display: flex; gap: 12px; align-items: flex-start; margin: 32px 0 24px; color: var(--green-deep); }
        .auth-heading h1 { margin: 0; font-family: 'Space Grotesk', sans-serif; font-size: 25px; }
        .auth-heading p { margin: 5px 0 0; color: var(--ink-soft); font-size: 13px; line-height: 1.45; }
        .auth-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 15px; }
        .auth-field span { color: var(--ink-soft); font-size: 12px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; }
        .auth-field input { width: 100%; border: 1px solid var(--hairline-strong); border-radius: 7px; padding: 11px 12px; background: #FBFBF7; color: var(--ink); font: inherit; }
        .auth-field input:focus { outline: 2px solid var(--green); outline-offset: 1px; }
        .auth-submit { width: 100%; justify-content: center; margin-top: 8px; padding: 11px 14px; }
        .auth-error { margin-bottom: 16px; padding: 10px 12px; border-radius: 7px; background: var(--red-bg); color: var(--red); font-size: 13px; }
        .auth-note { margin: 18px 0 0; color: var(--ink-soft); font-size: 12px; line-height: 1.5; }
      `}</style>
    </main>
  );
}
