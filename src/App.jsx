import { useState, lazy, Suspense } from "react";
import "./App.css";

const ProviderPage = lazy(() => import("./components/provider/ProviderPage"));
const TenantPage = lazy(() => import("./components/tenant/tenantPage"));

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export default function App() {
  const [active, setActive] = useState("provider");

  return (
    <div className="page">
      <header className="topbar">
        <h1>Admin Control Panel</h1>
        <nav className="topbar-nav">
          <button
            className={`btn-nav ${active === "provider" ? "active" : ""}`}
            onClick={() => setActive("provider")}
          >
            Providers
          </button>
          <button
            className={`btn-nav ${active === "tenant" ? "active" : ""}`}
            onClick={() => setActive("tenant")}
          >
            Tenants
          </button>
        </nav>
      </header>

      <main className="content-area">
        <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>
          {active === "provider" && <ProviderPage base={BASE} key="p-page" />}
          {active === "tenant" && <TenantPage base={BASE} key="t-page" />}
        </Suspense>
      </main>
    </div>
  );
}
