import { useState, lazy, Suspense, useMemo } from "react";
import "./App.css";

const ProviderPage = lazy(() => import("./components/provider/providerPage"));
const TenantPage = lazy(() => import("./components/tenant/tenantPage"));

export default function App() {
  const [active, setActive] = useState("provider");

  // 1. Manage the API URL globally here
  const [apiBase] = useState(
    () => localStorage.getItem("apiBase") || "http://localhost:4000"
  );

  // 2. Normalize it once
  const base = useMemo(() => {
    const normalized = apiBase.trim().replace(/\/$/, "");
    localStorage.setItem("apiBase", normalized);
    return normalized;
  }, [apiBase]);

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
          {/* 3. Pass the base URL down as a prop. 
              The 'key' ensures that if the base changes, the component resets */}
          {active === "provider" && <ProviderPage base={base} key="p-page" />}
          {active === "tenant" && <TenantPage base={base} key="t-page" />}
        </Suspense>
      </main>
    </div>
  );
}
