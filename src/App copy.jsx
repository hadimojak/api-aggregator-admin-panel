import { useEffect, useMemo, useState } from "react";
import "./App.css";

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

function ProviderTable({ providers, onEdit, onDelete }) {
  return (
    <div className="tableWrap">
      <table>
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
                <span className={`badge ${p.isActive ? "active" : "inactive"}`}>
                  {String(p.isActive)}
                </span>
              </td>

              <td className="right actions">
                <button className="btn" onClick={() => onEdit(p)}>
                  Edit
                </button>

                <button className="btn danger" onClick={() => onDelete(p)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}

          {providers.length === 0 && (
            <tr>
              <td colSpan={7} className="empty">
                No providers found
              </td>
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
          <p>Manage provider route configuration</p>
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
          <input
            required
            value={form.code}
            onChange={(e) => onChange({ code: e.target.value })}
          />
        </label>

        <label>
          Type
          <input
            required
            value={form.type}
            onChange={(e) => onChange({ type: e.target.value })}
          />
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
          Timeout
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
            onChange={(e) =>
              onChange({
                isActive: e.target.value === "true",
              })
            }
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </label>

        <div className="editorButtons">
          <button className="btn primary" disabled={saving}>
            {saving ? "Saving..." : mode === "edit" ? "Update" : "Create"}
          </button>

          <button
            type="button"
            className="btn"
            onClick={onClear}
            disabled={saving}
          >
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
    headers: { "Content-Type": "application/json" },
    ...options,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(data?.message || res.statusText);
  }

  return data;
}

function normalizeBaseUrl(url) {
  return String(url || "")
    .trim()
    .replace(/\/$/, "");
}

function buildQuery(filters) {
  const params = new URLSearchParams();

  if (filters.baseUrl.trim()) params.set("baseUrl", filters.baseUrl.trim());
  if (filters.type.trim()) params.set("type", filters.type.trim());
  if (filters.code.trim()) params.set("code", filters.code.trim());
  if (filters.apiKey.trim()) params.set("apiKey", filters.apiKey.trim());

  if (filters.isActive !== "") {
    params.set("isActive", filters.isActive);
  }

  if (filters.timeout !== "") {
    params.set("timeout", String(filters.timeout));
  }

  const query = params.toString();
  return query ? `?${query}` : "";
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

export default function App() {
  const [apiBase, setApiBase] = useState(
    () => localStorage.getItem("apiBase") || "http://localhost:4000",
  );

  const [filters, setFilters] = useState(defaultFilters);
  const [providers, setProviders] = useState([]);
  const [mode, setMode] = useState("create");
  const [form, setForm] = useState(defaultForm);

  const [status, setStatus] = useState({
    kind: "",
    message: "",
  });

  const [saving, setSaving] = useState(false);

  const base = useMemo(() => normalizeBaseUrl(apiBase), [apiBase]);

  useEffect(() => {
    localStorage.setItem("apiBase", base);
  }, [base]);

  async function loadProviders() {
    setStatus({
      kind: "",
      message: "Loading providers...",
    });

    const url = base + "/admin/provider" + buildQuery(filters);
    const data = await fetchJson(url);

    setProviders(Array.isArray(data) ? data : []);

    setStatus({
      kind: "ok",
      message: `Loaded ${Array.isArray(data) ? data.length : 0} providers`,
    });
  }

  useEffect(() => {
    if (!base) return;

    loadProviders().catch((e) =>
      setStatus({
        kind: "err",
        message: e.message,
      }),
    );
  }, [
    base,
    filters.baseUrl,
    filters.type,
    filters.code,
    filters.apiKey,
    filters.isActive,
    filters.timeout,
  ]);

  function clearForm() {
    setMode("create");
    setForm(defaultForm);
  }

  function clearFilters() {
    setFilters(defaultFilters);
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

  function formPayload() {
    return {
      code: String(form.code || "").trim(),
      type: String(form.type || "").trim(),
      baseUrl: String(form.baseUrl || "").trim(),
      apiKey: String(form.apiKey || "").trim(),
      isActive:
        typeof form.isActive === "string"
          ? form.isActive === "true"
          : Boolean(form.isActive),
      timeout: Number(form.timeout),
    };
  }

  async function save() {
    setSaving(true);

    try {
      const payload = formPayload();

      if (mode === "edit") {
        await fetchJson(base + "/admin/provider/" + form.id, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        setStatus({
          kind: "ok",
          message: "Provider updated",
        });
      } else {
        await fetchJson(base + "/admin/provider", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setStatus({
          kind: "ok",
          message: "Provider created",
        });
      }

      clearForm();
      await loadProviders();
    } catch (e) {
      setStatus({
        kind: "err",
        message: e.message,
      });
    } finally {
      setSaving(false);
    }
  }

  async function del(p) {
    const ok = confirm(`Delete provider "${p.code}"?`);
    if (!ok) return;

    try {
      await fetchJson(base + "/admin/provider/" + p.id, {
        method: "DELETE",
      });

      setStatus({
        kind: "ok",
        message: "Provider deleted",
      });

      await loadProviders();
    } catch (e) {
      setStatus({
        kind: "err",
        message: e.message,
      });
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h1>Provider Admin</h1>
          <p>Filter, create, update, and delete provider routes</p>
        </div>
      </header>

      <main className="layout">
        <section className="card listCard">
          <div className="cardHeader">
            <div>
              <h2>Providers</h2>
              <p>Filters call GET /admin/provider automatically</p>
            </div>
          </div>

          <div className="filterBox">
            <div className="filterHeader">
              <strong>Query Filters</strong>

              <button className="linkButton" onClick={clearFilters}>
                Clear filters
              </button>
            </div>

            <div className="filtersGrid">
              <label>
                Base URL
                <input
                  value={filters.baseUrl}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, baseUrl: e.target.value }))
                  }
                />
              </label>

              <label>
                Type
                <input
                  value={filters.type}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, type: e.target.value }))
                  }
                />
              </label>

              <label>
                Code
                <input
                  value={filters.code}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, code: e.target.value }))
                  }
                />
              </label>

              <label>
                API Key
                <input
                  value={filters.apiKey}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, apiKey: e.target.value }))
                  }
                />
              </label>

              <label>
                Active
                <select
                  value={filters.isActive}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      isActive: e.target.value,
                    }))
                  }
                >
                  <option value="">any</option>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              </label>

              <label>
                Timeout
                <input
                  type="number"
                  value={filters.timeout}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      timeout: e.target.value,
                    }))
                  }
                />
              </label>
            </div>
          </div>

          <Status kind={status.kind} message={status.message} />

          <ProviderTable
            providers={providers}
            onEdit={selectProvider}
            onDelete={del}
          />
        </section>

        <ProviderEditor
          mode={mode}
          form={form}
          onChange={(patch) =>
            setForm((f) => ({
              ...f,
              ...patch,
            }))
          }
          onSave={save}
          onClear={clearForm}
          saving={saving}
        />
      </main>
    </div>
  );
}
