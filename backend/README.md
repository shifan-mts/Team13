# PatchPilot Backend

Standalone API service. Serves the same five endpoints as the built-in Next.js
route handlers, as its own process.

> **One risk engine.** This service imports `frontend/lib/risk-engine.ts` via the
> `@/*` path alias in `tsconfig.json`. It does **not** carry a copy. Scoring logic,
> the AI explainer, and the KEV/EPSS/NVD intelligence layer are all shared, so the
> two API surfaces can never drift apart.

## Run

```bash
cd backend
npm install
npm start        # http://localhost:8000
```

Then point the frontend at it:

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Leave that unset and the frontend uses its own built-in routes instead — a single
process, no backend required. Both paths are fully supported.

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | Liveness probe |
| GET | `/api/vulnerabilities` | `?live=true` folds in CISA KEV / EPSS / NVD |
| GET | `/api/vulnerabilities/:id` | By dataset id or CVE |
| POST | `/api/analyze` | `{ ids?, vulnerabilities?, live? }` |
| POST | `/api/ai/explain` | `{ vulnerability \| cve }` |
| POST | `/api/ai/compare` | `{ cveIdA, cveIdB }` |

CORS is open, so the browser can call it directly during development.

## Guarantees

- A client-supplied `risk` is ignored; the engine recomputes it server-side.
- Every external feed degrades to the local dataset on failure.
- Ollama is optional — responses carry `provider: "local" | "fallback"`.
