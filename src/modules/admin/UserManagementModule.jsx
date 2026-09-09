import { useEffect, useState } from "react";
import { Shield, UserPlus } from "lucide-react";
import { useApi } from "../../lib/apiClient.jsx";
import { Empty, Field, Message, Panel } from "../../design/components.jsx";

const ROLES = ["ADMIN", "MANAGER", "CASHIER", "INVENTORY_MANAGER", "ACCOUNTANT"];

export default function UserManagementModule() {
  const { request, auth } = useApi();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: "", displayName: "", password: "", role: "CASHIER" });
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadUsers() {
    setLoading(true);
    try {
      setUsers(await request("/api/auth/users"));
    } catch (error) {
      setMessage({ ok: false, text: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUsers(); }, []);

  async function createUser(event) {
    event.preventDefault();
    setMessage(null);
    try {
      await request("/api/auth/users", {
        method: "POST",
        body: { ...form, roles: [form.role] },
      });
      setForm({ username: "", displayName: "", password: "", role: "CASHIER" });
      setMessage({ ok: true, text: "User created." });
      await loadUsers();
    } catch (error) {
      setMessage({ ok: false, text: error.message });
    }
  }

  async function changeRole(userId, role) {
    try {
      await request(`/api/auth/users/${userId}/roles`, { method: "PATCH", body: { roles: [role] } });
      setMessage({ ok: true, text: "Role updated. The user must sign in again for a new token." });
      await loadUsers();
    } catch (error) {
      setMessage({ ok: false, text: error.message });
    }
  }

  async function toggleEnabled(user) {
    try {
      await request(`/api/auth/users/${user.id}/enabled`, { method: "PATCH", body: { enabled: !user.enabled } });
      setMessage({ ok: true, text: `${user.username} is now ${user.enabled ? "disabled" : "enabled"}.` });
      await loadUsers();
    } catch (error) {
      setMessage({ ok: false, text: error.message });
    }
  }

  return (
    <>
      <div className="page-heading"><h1 className="page-title">Users</h1><p className="page-sub">Manage store accounts and their access roles.</p></div>
      <Message ok={message?.ok} text={message?.text} />
      <div className="grid user-admin-grid">
        <Panel title="Create user" icon={<UserPlus size={16} />}>
          <form onSubmit={createUser}>
            <Field label="Username"><input type="text" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required minLength={3} /></Field>
            <Field label="Display name"><input type="text" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} required /></Field>
            <Field label="Temporary password"><input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required minLength={8} /></Field>
            <Field label="Role"><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>{ROLES.map((role) => <option key={role}>{role}</option>)}</select></Field>
            <button className="btn btn-primary" type="submit"><UserPlus size={15} /> Create user</button>
          </form>
        </Panel>
        <Panel title="Store accounts" icon={<Shield size={16} />}>
          {loading ? <Empty>Loading users...</Empty> : users.length === 0 ? <Empty>No users found.</Empty> : (
            <div className="user-list">
              {users.map((user) => (
                <div className="user-row" key={user.id}>
                  <div className="user-info"><strong>{user.displayName}</strong><span>{user.username}</span></div>
                  <select value={user.roles[0] || "CASHIER"} onChange={(event) => changeRole(user.id, event.target.value)} aria-label={`Role for ${user.username}`}>
                    {ROLES.map((role) => <option key={role}>{role}</option>)}
                  </select>
                  <span className={`chip ${user.enabled ? "" : "warn"}`}>{user.enabled ? "ACTIVE" : "DISABLED"}</span>
                  <button type="button" className="btn btn-small" disabled={user.id === auth?.user?.id} onClick={() => toggleEnabled(user)}>{user.enabled ? "Disable" : "Enable"}</button>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
      <style>{`
        .user-admin-grid { grid-template-columns: minmax(260px, .75fr) minmax(0, 1.5fr); }
        .user-list { display: flex; flex-direction: column; gap: 10px; }
        .user-row { display: grid; grid-template-columns: minmax(120px, 1fr) 150px auto auto; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--hairline); }
        .user-row:last-child { border-bottom: none; }
        .user-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .user-info strong { font-size: 13px; }
        .user-info span { color: var(--ink-soft); font-family: 'IBM Plex Mono', monospace; font-size: 11px; }
        .user-row select { min-width: 0; border: 1px solid var(--hairline-strong); border-radius: 6px; padding: 7px 8px; background: #FBFBF7; color: var(--ink); }
        @media (max-width: 880px) { .user-admin-grid { grid-template-columns: 1fr; } .user-row { grid-template-columns: 1fr 150px; } }
      `}</style>
    </>
  );
}
