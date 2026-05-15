# Vite build for Zamil Solar Dashboard

This is the Round 12 migration from the in-browser-Babel Standalone.html to a proper Vite + React + Tailwind pipeline.

## Develop

```sh
cd vite/
npm install
npm run dev
```

## Build

```sh
npm run build
```

Output goes to `vite/dist/`. For production deployment to GitHub Pages, copy:
- `dist/index.html` → repo `/index.html`
- `dist/assets/`   → repo `/assets/`
- `dist/favicon-*.png` → repo `/`

The base path is `/senaat-solar-dashboard-v3/` (configured in `vite.config.js`).

## Notes

- Tailwind is compiled locally (`tailwind.config.js`); the CDN script is gone.
- `xlsx` and `recharts` are lazy chunks loaded only on demand.
- All `Object.assign(window, ...)` patterns remain — `main.jsx` imports JSX files in dependency order and the existing window-globals pattern still drives intra-file references.
- Fallback single-file at `/Standalone.html` is independent of this build.
