import { useState } from "react";
import "./App.css";
import ProviderPage from "./components/provider/providerPage";
import TenantPage from "./components/tenant/tenantPage";

export default function App() {
  const [active, setActive] = useState("provider");

  return (
    <div className="page">
      <header className="topbar">
        <h1>Admin Control Panel</h1>
        <div style={{ marginTop: 10 }}>
          <button className="btn" onClick={() => setActive("provider")}>
            Providers
          </button>
          <button className="btn" onClick={() => setActive("tenant")}>
            Tenants
          </button>
        </div>
      </header>

      {active === "provider" && <ProviderPage />}
      {active === "tenant" && <TenantPage />}
    </div>
  );
}
