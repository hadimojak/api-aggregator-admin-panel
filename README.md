# api-aggregator-admin-panel

Super simple static admin panel for managing Provider routes.

## Run

- Open `public/index.html` in a browser, or serve it with any static server.
- Configure API base URL in the UI (default: `http://localhost:4000`).

## API

- Providers: `GET/POST /admin/provider`, `GET/PUT/PATCH/DELETE /admin/provider/:id`

```
api-aggregator-admin-panel
├─ index.html
├─ package-lock.json
├─ package.json
├─ public
├─ README.md
├─ src
│  ├─ App copy.jsx
│  ├─ App.css
│  ├─ App.jsx
│  ├─ components
│  │  ├─ provider
│  │  │  └─ providerPage.jsx
│  │  └─ tenant
│  │     └─ tenantPage.jsx
│  ├─ index.css
│  └─ main.jsx
└─ vite.config.js

```