import { useEffect, useMemo, useState } from "react";
import "../../App.css";

function escapeHtml(str) {
  return String(str ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function Status({ kind, message }) {
  if (!message) return null;
  return <div className={`status mono ${kind || ""}`}>{message}</div>;
}

function TenantTable({ tenants, onEdit, onDelete }) {
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>API Key</th>
            <th>Rate-Limit/Min</th>
            <th>Active</th>
            <th className="right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((t) => (
            <tr key={t.id}>
              <td>{escapeHtml(t.name)}</td>
              <td className="mono">{escapeHtml(t.apiKey)}</td>
              <td>{t.rateLimitPerMin ?? "-"}</td>
              <td>
                <span className={`badge ${t.isActive ? "active" : "inactive"}`}>
                  {String(t.isActive)}
                </span>
              </td>
              <td className="right actions">
                <button className="btn" onClick={() => onEdit(t)}>Edit</button>
                <button className="btn danger" onClick={() => onDelete(t)}>Delete</button>
              </td>
            </tr>
          ))}
          {tenants.length === 0 && (
            <tr>
              <td colSpan={5} className="empty">No tenants found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function TenantEditor({ mode, form, onChange, onSave, onClear, saving }) {
  return (
    <aside className="card editorCard">
      <div className="cardHeader">
        <div>
          <h2>{mode === "edit" ? "Update Tenant" : "Create Tenant"}</h2>
          <p>Manage tenant configuration and limits</p>
        </div>
        <span className="modeBadge">{mode}</span>
      </div>
      <form className="form" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
        <label>
          Name
          <input required value={form.name} onChange={(e) => onChange({ name: e.target.value })} />
        </label>
        <label>
          API Key
          <input required placeholder="api_key_..." value={form.apiKey} onChange={(e) => onChange({ apiKey: e.target.value })} />
        </label>
        <label>
          Rate Limit (per min)
          <input type="number" min="1" value={form.rateLimitPerMin} onChange={(e) => onChange({ rateLimitPerMin: e.target.value })} />
        </label>
        <label>
          Active
          <select value={String(form.isActive)} onChange={(e) => onChange({ isActive: e.target.value === "true" })}>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </label>
        <div className="editorButtons">
          <button className="btn primary" disabled={saving}>{saving ? "Saving..." : mode === "edit" ? "Update" : "Create"}</button>
          <button type="button" className="btn" onClick={onClear} disabled={saving}>Clear</button>
        </div>
      </form>
    </aside>
  );
}

async function fetchJson(url, options = {}) {
  const hasBody = options.body !== undefined;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    body: options.body
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || res.statusText);
  return data;
}

function buildQuery(filters) {
  const params = new URLSearchParams();
  if (filters.name.trim()) params.set("name", filters.name.trim());
  if (filters.apiKey.trim()) params.set("apiKey", filters.apiKey.trim());
  
  // Rate limit logic
  if (filters.rateLimitPerMin !== "") {
    params.set("rateLimitPerMin", filters.rateLimitPerMin);
  }

  if (filters.isActive !== "") {
    params.set("isActive", filters.isActive);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

const defaultForm = { id: "", name: "", apiKey: "", isActive: true, rateLimitPerMin: 100 };
const defaultFilters = { name: "", apiKey: "", isActive: "", rateLimitPerMin: "" };

export default function TenantPage({ base }) {
  const [filters, setFilters] = useState(defaultFilters);
  const [tenants, setTenants] = useState([]);
  const [mode, setMode] = useState("create");
  const [form, setForm] = useState(defaultForm);
  const [status, setStatus] = useState({ kind: "", message: "" });
  const [saving, setSaving] = useState(false);

  async function loadTenants() {
    setStatus({ kind: "", message: "Loading tenants..." });
    try {
      // Using /user/tenant as requested
      const url = base + "/user/tenant" + buildQuery(filters);
      const data = await fetchJson(url);
      setTenants(Array.isArray(data) ? data : []);
      setStatus({ kind: "ok", message: `Loaded ${Array.isArray(data) ? data.length : 0} tenants` });
    } catch (e) {
      setStatus({ kind: "err", message: e.message });
    }
  }

  useEffect(() => {
    if (!base) return;
    loadTenants();
  }, [base, filters.name, filters.apiKey, filters.isActive, filters.rateLimitPerMin]);

  function clearForm() {
    setMode("create");
    setForm(defaultForm);
  }

  function selectTenant(t) {
    setMode("edit");
    setForm({
      id: t.id || "",
      name: t.name || "",
      apiKey: t.apiKey || "",
      isActive: t.isActive ?? true,
      rateLimitPerMin: t.rateLimitPerMin ?? 100,
    });
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        name: String(form.name || "").trim(),
        apiKey: String(form.apiKey || "").trim(),
        isActive: Boolean(form.isActive),
        rateLimitPerMin: Number(form.rateLimitPerMin),
      };

      if (mode === "edit") {
        await fetchJson(base + "/user/tenant/" + form.id, { method: "PUT", body: JSON.stringify(payload) });
        setStatus({ kind: "ok", message: "Tenant updated" });
      } else {
        await fetchJson(base + "/user/tenant", { method: "POST", body: JSON.stringify(payload) });
        setStatus({ kind: "ok", message: "Tenant created" });
      }
      clearForm();
      await loadTenants();
    } catch (e) {
      setStatus({ kind: "err", message: e.message });
    } finally {
      setSaving(false);
    }
  }

  async function del(t) {
    if (!confirm(`Delete tenant "${t.name}"?`)) return;
    try {
      await fetchJson(base + "/user/tenant/" + t.id, { method: "DELETE" });
      setStatus({ kind: "ok", message: "Tenant deleted" });
      await loadTenants();
    } catch (e) {
      setStatus({ kind: "err", message: e.message });
    }
  }

  return (
    <div className="page">
      <main className="layout">
        <section className="card listCard">
          <div className="cardHeader">
            <h2>Tenants</h2>
          </div>

          <div className="filterBox">
            <div className="filterHeader">
              <button className="btn clearFilter" onClick={() => setFilters(defaultFilters)}>
                Clear filters
              </button>
            </div>

            <div className="filtersGrid">
              <label>
                Name
                <input value={filters.name} onChange={(e) => setFilters(f => ({ ...f, name: e.target.value }))} />
              </label>

              <label>
                API Key
                <input value={filters.apiKey} onChange={(e) => setFilters(f => ({ ...f, apiKey: e.target.value }))} />
              </label>

              {/* RATE LIMIT FILTER UI ADDED HERE */}
              <label>
                Rate Limit
                <input 
                  type="number" 
                  placeholder="Min limit..." 
                  value={filters.rateLimitPerMin} 
                  onChange={(e) => setFilters(f => ({ ...f, rateLimitPerMin: e.target.value }))} 
                />
              </label>

              <label>
                Active
                <select value={filters.isActive} onChange={(e) => setFilters(f => ({ ...f, isActive: e.target.value }))}>
                  <option value="">any</option>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              </label>
            </div>
          </div>

          <Status kind={status.kind} message={status.message} />
          <TenantTable tenants={tenants} onEdit={selectTenant} onDelete={del} />
        </section>

        <TenantEditor
          mode={mode}
          form={form}
          onChange={(patch) => setForm(f => ({ ...f, ...patch }))}
          onSave={save}
          onClear={clearForm}
          saving={saving}
        />
      </main>
    </div>
  );
}
