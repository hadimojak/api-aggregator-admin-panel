import { useEffect, useMemo, useState } from "react";
import "./App.css";

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
            <th>Priority</th>
            <th>Active</th>
            <th className="right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {providers.map((p) => (
            <tr key={p.id}>
              <td className="mono" dangerouslySetInnerHTML={{ __html: escapeHtml(p.code ?? "") }} />
              <td dangerouslySetInnerHTML={{ __html: escapeHtml(p.type ?? "") }} />
              <td className="mono" dangerouslySetInnerHTML={{ __html: escapeHtml(p.baseUrl ?? "") }} />
              <td dangerouslySetInnerHTML={{ __html: escapeHtml(String(p.priority ?? "")) }} />
              <td dangerouslySetInnerHTML={{ __html: escapeHtml(String(p.isActive ?? "")) }} />
              <td className="right">
                <div className="actions actionsRight">
                  <button className="btn" onClick={() => onEdit(p)}>
                    Edit
                  </button>
                  <button className="btn danger" onClick={() => onDelete(p)}>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {providers.length === 0 && (
            <tr>
              <td colSpan={6} className="muted">
                No providers found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ProviderEditor({
  mode,
  form,
  onChange,
  onSave,
  onPatch,
  onClear,
  saving,
}) {
  return (
    <aside className="card">
      <div className="asideHeader">
        <div>
          <div className="asideTitle">Provider Editor</div>
          <div className="k">Create / Update / Partial update</div>
        </div>
        <div className="pill">mode: {mode}</div>
      </div>

      <div className="sep"></div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
      >
        <div className="row">
          <div className="field">
            <label htmlFor="code">Code</label>
            <input
              id="code"
              required
              minLength={2}
              maxLength={50}
              value={form.code}
              onChange={(e) => onChange({ code: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="type">Type</label>
            <input
              id="type"
              required
              value={form.type}
              onChange={(e) => onChange({ type: e.target.value })}
            />
          </div>
        </div>

        <div className="row">
          <div className="field">
            <label htmlFor="baseUrl">Base URL</label>
            <input
              id="baseUrl"
              required
              placeholder="https://api.example.com"
              value={form.baseUrl}
              onChange={(e) => onChange({ baseUrl: e.target.value })}
            />
          </div>
        </div>

        <div className="row">
          <div className="field">
            <label htmlFor="apiKey">API Key</label>
            <input
              id="apiKey"
              required
              value={form.apiKey}
              onChange={(e) => onChange({ apiKey: e.target.value })}
            />
          </div>
        </div>

        <div className="row">
          <div className="field sm">
            <label htmlFor="priority">Priority</label>
            <input
              id="priority"
              type="number"
              min={1}
              value={form.priority}
              onChange={(e) => onChange({ priority: e.target.value })}
            />
          </div>
          <div className="field sm">
            <label htmlFor="timeout">Timeout (ms)</label>
            <input
              id="timeout"
              type="number"
              min={100}
              max={60000}
              value={form.timeout}
              onChange={(e) => onChange({ timeout: e.target.value })}
            />
          </div>
          <div className="field sm">
            <label htmlFor="isActive">Active</label>
            <select
              id="isActive"
              value={String(form.isActive)}
              onChange={(e) => onChange({ isActive: e.target.value === "true" })}
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </div>
        </div>

        <div className="sep"></div>

        <div className="row">
          <button className="btn primary" type="submit" disabled={saving}>
            Save
          </button>
          <button
            className="btn"
            type="button"
            onClick={onPatch}
            disabled={saving || mode !== "edit"}
            title={mode !== "edit" ? "Select a provider to patch" : ""}
          >
            Patch
          </button>
          <button className="btn" type="button" onClick={onClear} disabled={saving}>
            Clear
          </button>
        </div>

        <div className="hint">
          - Save uses <span className="mono">POST</span> (create) or{" "}
          <span className="mono">PUT</span> (replace).
          <br />- Patch uses <span className="mono">PATCH</span> (partial update).
        </div>
      </form>
    </aside>
  );
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data?.message || data?.error || res.statusText || "Request failed";
    const msgText = typeof msg === "string" ? msg : JSON.stringify(msg);
    throw new Error(`[${res.status}] ${msgText} (${url})`);
  }
  return data;
}

function normalizeBaseUrl(url) {
  return String(url || "").trim().replace(/\/$/, "");
}

function buildQuery({ type, code, isActive }) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (code) params.set("code", code);
  if (isActive !== "") params.set("isActive", isActive);
  const q = params.toString();
  return q ? "?" + q : "";
}

const defaultForm = {
  id: "",
  code: "",
  type: "",
  baseUrl: "",
  apiKey: "",
  priority: 1,
  isActive: true,
  timeout: 10000,
};

export default function App() {
  const [apiBase, setApiBase] = useState(() => localStorage.getItem("apiBase") || "http://localhost:4000");
  const [filters, setFilters] = useState({ type: "", code: "", isActive: "" });
  const [providers, setProviders] = useState([]);
  const [mode, setMode] = useState("create"); // create | edit
  const [form, setForm] = useState(defaultForm);
  const [status, setStatus] = useState({ kind: "", message: "" });
  const [saving, setSaving] = useState(false);

  const base = useMemo(() => normalizeBaseUrl(apiBase), [apiBase]);
  const apiBaseDisplay = base || "";

  useEffect(() => {
    localStorage.setItem("apiBase", base);
  }, [base]);

  async function loadProviders() {
    setStatus({ kind: "", message: "Loading providers…" });
    const url = base + "/admin/provider" + buildQuery(filters);
    const data = await fetchJson(url);
    setProviders(Array.isArray(data) ? data : []);
    setStatus({ kind: "ok", message: `Loaded ${Array.isArray(data) ? data.length : 0} provider(s).` });
  }

  useEffect(() => {
    if (!base) return;
    loadProviders().catch((e) => setStatus({ kind: "err", message: e.message }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, filters.type, filters.code, filters.isActive]);

  function clearForm() {
    setMode("create");
    setForm({ ...defaultForm, priority: 1, timeout: 10000, isActive: true });
  }

  function selectProvider(p) {
    setMode("edit");
    setForm({
      id: p.id || "",
      code: p.code || "",
      type: p.type || "",
      baseUrl: p.baseUrl || "",
      apiKey: p.apiKey || "",
      priority: p.priority ?? 1,
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
      priority: Number(form.priority),
      isActive: typeof form.isActive === "string" ? form.isActive === "true" : Boolean(form.isActive),
      timeout: Number(form.timeout),
    };
  }

  async function save() {
    setSaving(true);
    try {
      if (!base) throw new Error("Set API base URL first");

      const payload = formPayload();
      if (mode === "edit" && form.id) {
        setStatus({ kind: "", message: "Updating provider…" });
        const data = await fetchJson(base + "/admin/provider/" + encodeURIComponent(form.id), {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setStatus({ kind: "ok", message: `Updated: ${JSON.stringify(data)}` });
      } else {
        setStatus({ kind: "", message: "Creating provider…" });
        const data = await fetchJson(base + "/admin/provider", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setStatus({ kind: "ok", message: `Created: ${JSON.stringify(data)}` });
      }
      clearForm();
      await loadProviders();
    } catch (e) {
      setStatus({ kind: "err", message: e.message || String(e) });
    } finally {
      setSaving(false);
    }
  }

  async function patch() {
    setSaving(true);
    try {
      if (!base) throw new Error("Set API base URL first");
      if (!form.id) throw new Error("Select a provider to patch");

      const payload = formPayload();
      setStatus({ kind: "", message: "Patching provider…" });
      const data = await fetchJson(base + "/admin/provider/" + encodeURIComponent(form.id), {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setStatus({ kind: "ok", message: `Patched: ${JSON.stringify(data)}` });
      clearForm();
      await loadProviders();
    } catch (e) {
      setStatus({ kind: "err", message: e.message || String(e) });
    } finally {
      setSaving(false);
    }
  }

  async function del(p) {
    try {
      if (!base) throw new Error("Set API base URL first");
      if (!confirm("Delete provider?")) return;

      setStatus({ kind: "", message: "Deleting provider…" });
      const data = await fetchJson(base + "/admin/provider/" + encodeURIComponent(p.id), { method: "DELETE" });
      setStatus({ kind: "ok", message: `Deleted: ${JSON.stringify(data)}` });
      if (form.id === p.id) clearForm();
      await loadProviders();
    } catch (e) {
      setStatus({ kind: "err", message: e.message || String(e) });
    }
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Provider Admin Panel</h1>
          <div className="sub">
            Manage provider routes via <span className="mono">/admin/provider</span>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="grid">
          <section className="card">
            <div className="toolbar">
              <div className="pill">
                API Base: <code className="mono">{apiBaseDisplay || "—"}</code>
              </div>
              <div className="row">
                <button className="btn" onClick={() => loadProviders().catch((e) => setStatus({ kind: "err", message: e.message }))}>
                  Refresh
                </button>
                <button className="btn primary" onClick={clearForm}>
                  New Provider
                </button>
              </div>
            </div>

            <div className="row">
              <div className="field">
                <label htmlFor="apiBase">API Base URL</label>
                <input
                  id="apiBase"
                  placeholder="http://localhost:4000"
                  value={apiBase}
                  onChange={(e) => setApiBase(e.target.value)}
                />
              </div>
              <div className="field sm">
                <label htmlFor="filterType">Filter type</label>
                <input
                  id="filterType"
                  placeholder="payment"
                  value={filters.type}
                  onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value.trim() }))}
                />
              </div>
              <div className="field sm">
                <label htmlFor="filterCode">Filter code</label>
                <input
                  id="filterCode"
                  placeholder="PAYPAL_01"
                  value={filters.code}
                  onChange={(e) => setFilters((f) => ({ ...f, code: e.target.value.trim() }))}
                />
              </div>
              <div className="field sm">
                <label htmlFor="filterActive">Active</label>
                <select
                  id="filterActive"
                  value={filters.isActive}
                  onChange={(e) => setFilters((f) => ({ ...f, isActive: e.target.value }))}
                >
                  <option value="">any</option>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              </div>
            </div>

            <div className="sep"></div>

            <Status kind={status.kind} message={status.message} />

            <ProviderTable providers={providers} onEdit={selectProvider} onDelete={del} />

            <div className="hint">
              Tip: API docs available at <span className="mono">/docs</span> on the API server.
            </div>
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
            onPatch={patch}
            onClear={clearForm}
            saving={saving}
          />
        </div>
      </main>
    </div>
  );
}
