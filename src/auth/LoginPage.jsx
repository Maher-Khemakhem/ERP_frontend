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
        <div className="auth-brand"><span className="auth-brand-lockup"><span className="auth-brand-symbol">C</span><span className="brand-mark">Counter</span></span><span>Store operations</span></div>
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
        .auth-page { min-height: 100vh; display: grid; place-items: center; padding: 28px 18px; background: radial-gradient(circle at 12% 10%, #FFF9EC 0, transparent 30%), var(--paper); color: var(--ink); }
        .auth-card { width: min(100%, 440px); padding: 34px; background: var(--surface); border: 1px solid var(--hairline); border-radius: 20px; box-shadow: var(--shadow-md); }
        .auth-brand { display: flex; flex-direction: column; gap: 5px; color: var(--ink-soft); font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }
        .auth-brand-lockup { display: flex; align-items: center; gap: 10px; }
        .auth-brand-symbol { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 10px 10px 10px 2px; background: #8CCBEA; color: var(--green-deep); font-family: 'Fraunces', Georgia, serif; font-size: 21px; font-weight: 700; }
        .auth-brand .brand-mark { color: var(--green-deep); font-family: 'Fraunces', Georgia, serif; font-size: 25px; font-weight: 700; letter-spacing: -.03em; text-transform: none; }
        .auth-heading { display: flex; gap: 12px; align-items: flex-start; margin: 38px 0 26px; color: var(--green-deep); }
        .auth-heading h1 { margin: 0; font-family: 'Fraunces', Georgia, serif; font-size: 30px; letter-spacing: -.03em; }
        .auth-heading p { margin: 5px 0 0; color: var(--ink-soft); font-size: 13px; line-height: 1.45; }
        .auth-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 15px; }
        .auth-field span { color: var(--ink-soft); font-size: 12px; font-weight: 700; letter-spacing: .01em; }
        .auth-field input { width: 100%; min-height: 44px; border: 1px solid var(--hairline-strong); border-radius: 9px; padding: 11px 12px; background: #FCFAF4; color: var(--ink); font: inherit; }
        .auth-field input:focus { outline: none; box-shadow: var(--focus-ring); border-color: var(--green); }
        .auth-submit { width: 100%; justify-content: center; margin-top: 10px; min-height: 46px; padding: 11px 14px; border-radius: 10px; }
        .auth-error { margin-bottom: 16px; padding: 11px 12px; border-radius: 9px; background: var(--red-bg); color: var(--red); font-size: 13px; }
        .auth-note { margin: 18px 0 0; color: var(--ink-soft); font-size: 12px; line-height: 1.5; }
      `}</style>
    </main>
  );
}
