import { useEffect, useState, useCallback } from "react";
import "../../App.css";

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function Status({ kind, message }) {
  if (!message) return null;
  return <div className={`status mono ${kind || ""}`}>{message}</div>;
}

function ProviderTable({ providers, loading, onEdit, onDelete, onToggle }) {
  if (loading) {
    return <div style={{ padding: "20px", textAlign: "center" }}>Loading providers...</div>;
  }

  return (
    <div className="tableWrap">
      <table className="dataTable providerTable">
        <thead>
          <tr>
            <th>Code</th>
            <th>Type</th>
            <th>Base URL</th>
            <th>API Key</th>
            <th>Timeout</th>
            <th>Active</th>
            <th className="right">Actions</th>
          </tr>
        </thead>

        <tbody>
          {providers.map((p) => (
            <tr key={p.id}>
              <td className="mono">{escapeHtml(p.code)}</td>
              <td>{escapeHtml(p.type)}</td>
              <td className="mono urlCell">{escapeHtml(p.baseUrl)}</td>
              <td className="mono">{escapeHtml(p.apiKey)}</td>
              <td>{p.timeout ?? "-"}</td>
              <td>
                <span
                  className={`badge clickable ${p.isActive ? "active" : "inactive"}`}
                  onClick={() => onToggle(p)}
                  title="Click to toggle status"
                >
                  {String(p.isActive)}
                </span>
              </td>
              <td className="right actions">
                <button className="btn" onClick={() => onEdit(p)}>Edit</button>
                <button className="btn danger" onClick={() => onDelete(p)}>Delete</button>
              </td>
            </tr>
          ))}

          {providers.length === 0 && (
            <tr>
              <td colSpan={7} className="empty">No providers found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ProviderEditor({ mode, form, onChange, onSave, onClear, saving }) {
  return (
    <aside className="card editorCard">
      <div className="cardHeader">
        <div>
          <h2>{mode === "edit" ? "Update Provider" : "Create Provider"}</h2>
          <p>Manage provider configuration</p>
        </div>
        <span className="modeBadge">{mode}</span>
      </div>

      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
      >
        <label>
          Code
          <input required value={form.code} onChange={(e) => onChange({ code: e.target.value })} />
        </label>
        <label>
          Type
          <input required value={form.type} onChange={(e) => onChange({ type: e.target.value })} />
        </label>
        <label>
          Base URL
          <input
            required
            placeholder="https://api.example.com"
            value={form.baseUrl}
            onChange={(e) => onChange({ baseUrl: e.target.value })}
          />
        </label>
        <label>
          API Key
          <input
            placeholder="sk_live_..."
            value={form.apiKey}
            onChange={(e) => onChange({ apiKey: e.target.value })}
          />
        </label>
        <label>
          Timeout (ms)
          <input
            type="number"
            min="100"
            max="60000"
            value={form.timeout}
            onChange={(e) => onChange({ timeout: e.target.value })}
          />
        </label>
        <label>
          Active
          <select
            value={String(form.isActive)}
            onChange={(e) => onChange({ isActive: e.target.value === "true" })}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </label>

        <div className="editorButtons">
          <button className="btn primary" disabled={saving}>
            {saving ? "Saving..." : mode === "edit" ? "Update" : "Create"}
          </button>
          <button type="button" className="btn" onClick={onClear} disabled={saving}>
            Clear
          </button>
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

  if (!res.ok) {
    throw new Error(data?.message || res.statusText);
  }

  return data;
}

function buildQuery(filters, page, limit) {
  const params = new URLSearchParams();
  if (filters.baseUrl) params.set("baseUrl", filters.baseUrl.trim());
  if (filters.type) params.set("type", filters.type.trim());
  if (filters.code) params.set("code", filters.code.trim());
  if (filters.apiKey) params.set("apiKey", filters.apiKey.trim());
  if (filters.isActive !== "") params.set("isActive", filters.isActive);
  if (filters.timeout !== "") params.set("timeout", String(filters.timeout));
  params.set("page", page);
  params.set("limit", limit);
  return `?${params.toString()}`;
}

const defaultForm = {
  id: "",
  code: "",
  type: "",
  baseUrl: "",
  apiKey: "",
  isActive: true,
  timeout: 10000,
};

const defaultFilters = {
  baseUrl: "",
  type: "",
  code: "",
  apiKey: "",
  isActive: "",
  timeout: "",
};

export default function ProviderPage({ base }) {
  const [filters, setFilters] = useState(defaultFilters);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("create");
  const [form, setForm] = useState(defaultForm);
  const [status, setStatus] = useState({ kind: "", message: "" });
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 5;

  const loadProviders = useCallback(async () => {
    if (!base) {
      console.error("loadProviders: base is empty, aborting");
      return;
    }
    const url = base + "/admin/provider" + buildQuery(filters, page, limit);
    console.log("Fetching:", url);
    setLoading(true);
    try {
      const res = await fetchJson(url);
      console.log("Response:", res);
      setProviders(res.data || []);
      setTotalPages(res.totalPages || 1);
      setStatus({ kind: "", message: "" });
    } catch (e) {
      console.error("Fetch error:", e);
      setStatus({ kind: "err", message: `Error: ${e.message}` });
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, [base, page, filters]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  async function toggleActive(p) {
    setStatus({ kind: "", message: "Toggling status..." });
    try {
      await fetchJson(`${base}/admin/provider/${p.id}/state`, { method: "PATCH" });
      setStatus({ kind: "ok", message: `Status updated for ${p.code}` });
      await loadProviders();
    } catch (e) {
      setStatus({ kind: "err", message: e.message });
    }
  }

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

  function selectProvider(p) {
    setMode("edit");
    setForm({
      id: p.id || "",
      code: p.code || "",
      type: p.type || "",
      baseUrl: p.baseUrl || "",
      apiKey: p.apiKey || "",
      isActive: p.isActive ?? true,
      timeout: p.timeout ?? 10000,
    });
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        code: String(form.code || "").trim(),
        type: String(form.type || "").trim(),
        baseUrl: String(form.baseUrl || "").trim(),
        apiKey: String(form.apiKey || "").trim(),
        isActive: Boolean(form.isActive),
        timeout: Number(form.timeout),
      };

      if (mode === "edit") {
        await fetchJson(base + "/admin/provider/" + form.id, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setStatus({ kind: "ok", message: "Provider updated" });
      } else {
        await fetchJson(base + "/admin/provider", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setStatus({ kind: "ok", message: "Provider created" });
      }

      clearForm();
      await loadProviders();
    } catch (e) {
      setStatus({ kind: "err", message: e.message });
    } finally {
      setSaving(false);
    }
  }

  async function del(p) {
    if (!confirm(`Delete provider "${p.code}"?`)) return;
    try {
      await fetchJson(base + "/admin/provider/" + p.id, { method: "DELETE" });
      setStatus({ kind: "ok", message: "Provider deleted" });
      await loadProviders();
    } catch (e) {
      setStatus({ kind: "err", message: e.message });
    }
  }

  return (
    <div className="page">
      <main className="layout">
        <section className="card listCard">
          <div className="cardHeader">
            <h2>Providers</h2>
            {/* Debug: shows what URL is being used */}
            <span style={{ fontSize: "11px", color: "#888" }}>base: {base || "⚠️ EMPTY"}</span>
          </div>

          <div className="filterBox">
            <div className="filterHeader">
              <button className="btn clearFilter" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
            <div className="filtersGrid">
              <label>
                Base URL
                <input value={filters.baseUrl} onChange={(e) => updateFilter("baseUrl", e.target.value)} />
              </label>
              <label>
                Type
                <input value={filters.type} onChange={(e) => updateFilter("type", e.target.value)} />
              </label>
              <label>
                Code
                <input value={filters.code} onChange={(e) => updateFilter("code", e.target.value)} />
              </label>
              <label>
                API Key
                <input value={filters.apiKey} onChange={(e) => updateFilter("apiKey", e.target.value)} />
              </label>
              <label>
                Active
                <select value={filters.isActive} onChange={(e) => updateFilter("isActive", e.target.value)}>
                  <option value="">any</option>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              </label>
              <label>
                Timeout
                <input type="number" value={filters.timeout} onChange={(e) => updateFilter("timeout", e.target.value)} />
              </label>
            </div>
          </div>

          <Status kind={status.kind} message={status.message} />

          <ProviderTable
            providers={providers}
            loading={loading}
            onEdit={selectProvider}
            onDelete={del}
            onToggle={toggleActive}
          />

          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "15px" }}>
            <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </button>
            <span className="mono">Page {page} / {totalPages}</span>
            <button className="btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </section>

        <ProviderEditor
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
