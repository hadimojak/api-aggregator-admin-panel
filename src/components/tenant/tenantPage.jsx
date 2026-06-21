import { useEffect, useState, useCallback } from "react";
import "../../App.css";

function escapeHtml(str) {
  return String(str ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function Status({ kind, message }) {
  if (!message) return null;
  return <div className={`status mono ${kind || ""}`}>{message}</div>;
}

function TenantTable({ tenants, loading, onEdit, onDelete }) {
  if (loading) {
    return <div style={{ padding: "20px", textAlign: "center" }}>Loading tenants...</div>;
  }

  return (
    <div className="tableWrap">
      <table className="dataTable tenantTable">
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
          <button className="btn primary" disabled={saving}>
            {saving ? "Saving..." : mode === "edit" ? "Update" : "Create"}
          </button>
          <button type="button" className="btn" onClick={onClear} disabled={saving}>Clear</button>
        </div>
      </form>
    </aside>
  );
}

async function fetchJson(url, options = {}) {
  const hasBody = options.body !== undefined;
  const res = await fetch(url, {
    method: options.method || "GET",
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    body: options.body,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || res.statusText);
  return data;
}

// FIXED: matches providerPage pattern exactly — page & limit go through URLSearchParams
function buildQuery(filters, page, limit) {
  const params = new URLSearchParams();
  if (filters.name.trim()) params.set("name", filters.name.trim());
  if (filters.apiKey.trim()) params.set("apiKey", filters.apiKey.trim());
  if (filters.rateLimitPerMin !== "") params.set("rateLimitPerMin", String(filters.rateLimitPerMin));
  if (filters.isActive !== "") params.set("isActive", filters.isActive);
  params.set("page", page);
  params.set("limit", limit);
  return `?${params.toString()}`;
}

const defaultForm = { id: "", name: "", apiKey: "", isActive: true, rateLimitPerMin: 100 };
const defaultFilters = { name: "", apiKey: "", isActive: "", rateLimitPerMin: "" };

export default function TenantPage({ base }) {
  const [filters, setFilters] = useState(defaultFilters);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("create");
  const [form, setForm] = useState(defaultForm);
  const [status, setStatus] = useState({ kind: "", message: "" });
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 5;

  const loadTenants = useCallback(async () => {
    if (!base) {
      console.error("loadTenants: base is empty, aborting");
      return;
    }
    const url = base + "/user/tenant" + buildQuery(filters, page, limit);
    console.log("Fetching tenants:", url);
    setLoading(true);
    try {
      const res = await fetchJson(url);
      console.log("Tenant response:", res);
      setTenants(res.data || []);
      setTotalPages(res.totalPages || 1);
      setStatus({ kind: "", message: "" });
    } catch (e) {
      console.error("Fetch error:", e);
      setStatus({ kind: "err", message: `Error: ${e.message}` });
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }, [base, page, filters]);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  function clearForm() {
    setMode("create");
    setForm(defaultForm);
  }

  function clearFilters() {
    setFilters(defaultFilters);
    setPage(1);
  }

  function updateFilter(key, value) {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
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
            <span style={{ fontSize: "11px", color: "#888" }}>base: {base || "⚠️ EMPTY"}</span>
          </div>

          <div className="filterBox">
            <div className="filterHeader">
              <button className="btn clearFilter" onClick={clearFilters}>Clear filters</button>
            </div>
            <div className="filtersGrid">
              <label>
                Name
                <input value={filters.name} onChange={(e) => updateFilter("name", e.target.value)} />
              </label>
              <label>
                API Key
                <input value={filters.apiKey} onChange={(e) => updateFilter("apiKey", e.target.value)} />
              </label>
              <label>
                Rate Limit
                <input
                  type="number"
                  placeholder="Min limit..."
                  value={filters.rateLimitPerMin}
                  onChange={(e) => updateFilter("rateLimitPerMin", e.target.value)}
                />
              </label>
              <label>
                Active
                <select value={filters.isActive} onChange={(e) => updateFilter("isActive", e.target.value)}>
                  <option value="">any</option>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              </label>
            </div>
          </div>

          <Status kind={status.kind} message={status.message} />

          <TenantTable
            tenants={tenants}
            loading={loading}
            onEdit={selectTenant}
            onDelete={del}
          />

          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "15px" }}>
            <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span className="mono">Page {page} / {totalPages}</span>
            <button className="btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </section>

        <TenantEditor
          mode={mode}
          form={form}
          onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
          onSave={save}
          onClear={clearForm}
          saving={saving}
        />
      </main>
    </div>
  );
}
