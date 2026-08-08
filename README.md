# PatchPilot AI

**Explainable vulnerability patch prioritization for lean IT teams.**

> CVSS tells you how severe a vulnerability is. PatchPilot tells you what to patch first.

---

## The problem

A small IT team wakes up to thousands of open vulnerabilities and has time to patch ten
today. Ranking by CVSS gets it wrong: a CVSS 10.0 flaw on an internal wiki with no known
exploit is not more urgent than a CVSS 7.5 flaw that is actively exploited in the wild on
an internet-facing production gateway.

## The solution

PatchPilot scores every vulnerability on six weighted factors — exploitation evidence,
EPSS probability, internet exposure, business criticality, CVSS severity, and exploit
availability — and sorts the result into **PATCH NOW / NEXT / LATER**, with the evidence
behind every number.

The thesis, straight out of the shipped dataset:

| CVE | CVSS | EPSS | KEV | Exposure | **Risk** | Priority |
|---|---:|---:|---|---|---:|---|
| CVE-2024-23897 | **7.5** | 91.5% | yes | internet-facing | **96** | 🔴 NOW |
| CVE-2023-22515 | **10.0** | 22% | no | internal | **26** | 🟡 LATER |

A CVSS-ordered list patches the wrong one first.

---

## Architecture

```text
NVD ────┐
KEV ────┼──→ Normalized Vulnerability ──→ Risk Engine ──→ RiskResult ──→ AI Explainer ──→ UI
EPSS ───┘        (same internal type)      (deterministic)              (Ollama, optional)
```

One rule holds the design together:

> **The risk engine is the only thing that computes a score. The LLM only explains one.**

The model is handed the finished score, priority and factors as fixed inputs. If it
restates a different number or priority, its response is discarded and the deterministic
explanation is used instead.

### Layout

```text
backend/                               standalone API service (optional)
├── src/server.ts                      Express app — same 5 endpoints
└── tsconfig.json                      @/* -> ../frontend/*  (shared engine)

frontend/
├── app/
│   ├── page.tsx                      dashboard (Kanban + table)
│   ├── vulnerabilities/[id]/          prerendered detail pages
│   └── api/
│       ├── vulnerabilities/           GET list, GET :id
│       ├── analyze/                   POST re-score
│       └── ai/{explain,compare}/      POST — server-side Ollama boundary
├── components/                        navbar, kanban, table, detail drawer, copilot
├── lib/
│   ├── risk-engine.ts                 ← canonical scoring. Do not duplicate.
│   ├── vulnerabilities.ts             18-CVE demo dataset + helpers
│   ├── ai-explainer.ts                deterministic templates + optional Ollama
│   └── intelligence/                  kev.ts · epss.ts · nvd.ts · normalize.ts
└── tests/                             risk-engine · ai-explainer · api
```

## Risk Engine

`frontend/lib/risk-engine.ts` — pure, synchronous, no I/O, no randomness.

| Factor | Weight | Mapping |
|---|---:|---|
| Exploitation Evidence | 30% | `kev ? 100 : 0` |
| EPSS Exploit Probability | 20% | `round(epss × 100)` |
| Asset Exposure | 15% | internet 100 · internal 30 |
| Business Criticality | 15% | impact (100/75/45/20) × env (1.0/0.7/0.4) |
| CVSS Severity | 10% | `round(cvss × 10)` |
| Exploit Availability | 10% | `exploitAvailable ? 100 : 25` |

```text
score >= 90 → NOW      score >= 70 → NEXT      else → LATER
```

Full contract: [`docs/RISK_ENGINE.md`](docs/RISK_ENGINE.md).

## AI / Ollama

Optional. Everything works without it.

- **Available** → `provider: "local"`, the model phrases the explanation (green `LOCAL MODEL` badge in the UI)
- **Unavailable** → `provider: "fallback"`, deterministic templates (grey `DETERMINISTIC` badge)

Fallback triggers on connection refused, non-OK status, timeout, malformed JSON, invalid
structure, or any response that contradicts the engine. The browser never talks to Ollama
directly — it goes through `POST /api/ai/explain`.

```bash
ollama pull qwen3:4b
ollama serve
```

Any Ollama model works — set `OLLAMA_MODEL` (use `qwen3:1.7b` on weaker machines).

## Threat intelligence

| Source | Provides | Failure behaviour |
|---|---|---|
| CISA KEV | `kev` boolean | dataset value stands |
| EPSS (FIRST) | `epss` 0–1 | dataset value stands |
| NVD | description, CVSS | dataset values stand |

All three are cached in-process (KEV 1h, EPSS 6h, NVD 24h), fetched in parallel, and
normalized into the **same** `Vulnerability` type the engine already consumes. No API key
required; `NVD_API_KEY` is honoured only to raise the rate limit.

The dashboard never blocks on them — it renders from the local dataset instantly. Live
enrichment is opt-in via `?live=true`.

## API

| Endpoint | Purpose |
|---|---|
| `GET /api/vulnerabilities` | Scored dataset + stats, sorted by risk desc. `?live=true` folds in KEV/EPSS/NVD |
| `GET /api/vulnerabilities/:id` | `{ vulnerability, risk }` by dataset id or CVE |
| `POST /api/analyze` | Re-score `{ ids? , vulnerabilities?, live? }`, sorted desc |
| `POST /api/ai/explain` | `{ summary, whyPrioritized[], recommendation, provider }` |
| `POST /api/ai/compare` | `{ higherRiskCve, comparisonSummary, provider }` |

A client-supplied `risk` is always ignored — the server recomputes it, so the browser can
never dictate a score.

**Two ways to serve these.** Both expose identical endpoints and share the same engine:

| | Where | When to use |
|---|---|---|
| **Built-in** (default) | `frontend/app/api/` | One process. Nothing to configure. |
| **Standalone** | `backend/` on port 8000 | Separate service; set `NEXT_PUBLIC_API_URL` |

The standalone service imports `frontend/lib/risk-engine.ts` through a path alias rather
than copying it — there is exactly one risk engine in this repository, so the two surfaces
cannot drift apart. See [`backend/README.md`](backend/README.md).

```bash
curl -s localhost:3000/api/vulnerabilities | jq '.stats'
curl -s -X POST localhost:3000/api/ai/explain \
  -H 'Content-Type: application/json' \
  -d '{"vulnerability":"CVE-2024-23897"}' | jq
```

## Running locally

```bash
cd frontend
npm install
cp .env.example .env.local   # optional — only needed to point at Ollama
npm run dev
```

Open http://localhost:3000.

Optionally run the standalone API instead of the built-in routes:

```bash
cd backend && npm install && npm start      # http://localhost:8000
```

```bash
# frontend/.env.local — then rebuild the frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

```bash
npm test         # 35 tests
npm run typecheck
npm run build
```

## Demo

1. Open PatchPilot — 18 CVEs ranked **NOW (11) / NEXT (3) / LATER (4)**, average risk 79.
2. Open **CVE-2024-1709** → risk 99, six weighted factors with evidence.
3. Click **"Why is this prioritized?"** → local model explains it; badge shows whether the
   model or the deterministic fallback answered.
4. Open **AI Copilot → Demo pair** → loads CVE-2024-23897 (CVSS 7.5, risk 96) against
   CVE-2023-22515 (CVSS 10.0, risk 26).
5. **Generate Comparison Rationale** → the lower-CVSS CVE wins, and PatchPilot says why.

That last step is the whole product: **CVSS ≠ patch priority.**

## Docs

- [`docs/overview.md`](docs/overview.md) — product overview, MVP scope, roadmap
- [`docs/architecture.md`](docs/architecture.md) — architecture and module contracts
- [`docs/RISK_ENGINE.md`](docs/RISK_ENGINE.md) — engine API and formula
- [`shifan.md`](shifan.md) — frontend notes and backend handover spec
