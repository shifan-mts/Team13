# PatchPilot AI — Architecture

> **Status: implemented.** The MVP is built and lives under [`frontend/`](../frontend) —
> see the paths in §6. That includes the dashboard, the risk engine, five API route
> handlers under `frontend/app/api/`, an optional local LLM explanation layer (Ollama),
> and live CISA KEV / EPSS / NVD enrichment in `frontend/lib/intelligence/` that
> normalizes into the existing `Vulnerability` type. The [project README](../README.md)
> describes the current shape.
>
> Still forward-looking: a standalone backend service, persistence, and the Phase 3–5
> features in [`overview.md`](overview.md) §21.
>
> It is derived from [`overview.md`](overview.md) (§9–§13, §20). Items marked **PROPOSED**
> were open decisions at authoring time; where code now exists,
> [`RISK_ENGINE.md`](RISK_ENGINE.md) documents what was actually implemented and takes
> precedence over any **PROPOSED** value here.

---

## 1. Architectural Thesis

The product's credibility rests on one structural decision:

> **The risk score is deterministic. The AI never produces the number.**

A security team will not act on a priority list it cannot audit. So the scoring path is
plain arithmetic over declared inputs, reproducible on every run, and the AI layer sits
strictly *downstream* of it — turning a computed result into prose. This boundary is the
architecture's load-bearing wall, and §8 below states exactly where it runs.

Everything else follows from that: the engine is a pure function, the data layer is
static for the MVP, and the UI is a rendering of engine output rather than a place where
scoring logic accumulates.

---

## 2. Layer Model

```text
┌──────────────────────────────────────────────────────────────┐
│ PRESENTATION            app/  +  components/                 │
│ Dashboard · Vulnerability list · Detail view · Demo mode      │
│ Renders engine output. Contains no scoring logic.             │
└───────────────────────────────┬──────────────────────────────┘
                                │  RiskResult[]
                                ▼
┌──────────────────────────────────────────────────────────────┐
│ PRIORITY ENGINE         lib/risk-engine.ts                   │
│ Maps score → NOW / NEXT / LATER. Pure. Threshold-driven.      │
└───────────────────────────────┬──────────────────────────────┘
                                │  score: 0–100
                                ▼
┌──────────────────────────────────────────────────────────────┐
│ RISK ENGINE             lib/risk-engine.ts                   │
│ Six normalized factors → weighted sum. Pure, synchronous,     │
│ no I/O, no randomness. The auditable core.                    │
└───────────────────────────────┬──────────────────────────────┘
                                │  Vulnerability[]
                                ▼
┌──────────────────────────────────────────────────────────────┐
│ DATA LAYER              lib/vulnerabilities.ts               │
│ MVP: static typed array. Later: API / Postgres.               │
└──────────────────────────────────────────────────────────────┘

           ┌──────────────────────────────────────────┐
           │ AI EXPLANATION LAYER                     │
           │ Consumes a finished RiskResult.          │
           │ Explains, compares, recommends.          │
           │ Cannot alter score or priority.          │
           └──────────────────────────────────────────┘
                    ▲
                    └── reads engine output only (see §8)
```

The AI layer is drawn to the side deliberately. It is not in the path between data and
priority; it hangs off the result.

---

## 3. Module Contracts

### `types/vulnerability.ts`

The input record, exactly as specified in overview §12:

```typescript
interface Vulnerability {
  id: string;
  cve: string;
  description: string;
  cvss: number;                    // 0.0 – 10.0
  epss: number;                    // 0.0 – 1.0 (probability)
  kev: boolean;                    // listed in CISA KEV
  exploitAvailable: boolean;       // public exploit code exists
  internetExposed: boolean;
  assetName: string;
  assetCriticality: "critical" | "high" | "medium" | "low";
  environment: "production" | "staging" | "development";
  businessImpact: "critical" | "high" | "medium" | "low";
}
```

The engine's output type is not specified in the overview. **PROPOSED:**

```typescript
type Priority = "NOW" | "NEXT" | "LATER";

interface RiskFactor {
  name: string;      // "Exploitation", "EPSS", …
  score: number;     // 0–100, the normalized sub-score
  weight: number;    // 0.30, 0.20, …
  evidence: string;  // "Listed in CISA KEV"
}

interface RiskResult {
  vulnerability: Vulnerability;
  score: number;         // 0–100, rounded
  priority: Priority;
  factors: RiskFactor[]; // always length 6, in weight order
}
```

Carrying `weight` and `evidence` on each factor is what lets the detail view (overview
§15) render its breakdown and its evidence checklist from one object, with no second
derivation and no risk of the two disagreeing.

### `lib/risk-engine.ts`

```typescript
function calculateRisk(v: Vulnerability): RiskResult;
function getPriority(score: number): Priority;
function getRiskFactors(v: Vulnerability): RiskFactor[];
```

Hard requirements: pure, synchronous, no network, no `Date.now()`, no `Math.random()`.
Same input must always yield the same score — that property is what makes the demo
comparison in overview §24 reproducible on stage.

### `lib/vulnerabilities.ts`

Exports the static dataset (15–20 records, overview §6.1) plus lookup helpers. Swapping
this module for an async data source is the single seam for Phase 2; nothing above it
should assume the data is synchronous forever. **PROPOSED:** have it export
`getVulnerabilities(): Vulnerability[]` rather than a bare array, so the later change to
`Promise<Vulnerability[]>` touches one signature.

---

## 4. Scoring Model

Weights are fixed by overview §6.2 and sum to 1.00:

| Factor | Weight | Input fields |
|---|---:|---|
| Exploitation Evidence | 30% | `kev` |
| EPSS | 20% | `epss` |
| Asset Exposure | 15% | `internetExposed` |
| Business Criticality | 15% | `businessImpact`, `environment` |
| CVSS Severity | 10% | `cvss` |
| Exploitability | 10% | `exploitAvailable` |

Each factor normalizes to 0–100 before weighting, so the weighted sum lands on 0–100
directly and each sub-score is displayable as-is in the detail view.

**PROPOSED normalization** — the overview specifies weights but not these mappings:

```text
exploitation   = kev ? 100 : 0
epss           = epss * 100
exposure       = internetExposed ? 100 : 30
business       = criticality_map[businessImpact] × environment_multiplier
                 critical 100 │ high 75 │ medium 45 │ low 20
                 production ×1.0 │ staging ×0.7 │ development ×0.4
cvss           = cvss * 10
exploitability = exploitAvailable ? 100 : 25
```

Binary factors use a non-zero floor (30, 25) rather than 0 so that an internal asset with
no public exploit isn't scored as risk-free — absence of evidence isn't evidence of
absence.

```typescript
score = Math.round(
  exploitation   * 0.30 +
  epss           * 0.20 +
  exposure       * 0.15 +
  business       * 0.15 +
  cvss           * 0.10 +
  exploitability * 0.10
);
```

### Classification

```typescript
score >= 90  → "NOW"
score >= 70  → "NEXT"
else         → "LATER"
```

Thresholds live in one exported constant, not inline — organizational risk tolerance is
explicitly a future setting (overview §6.3).

### Validation gate

The model is only correct if it reproduces the product's central claim. Before any UI
work is trusted, the dataset must contain a pair where a **lower-CVSS, actively-exploited,
internet-facing** vulnerability outranks a **higher-CVSS internal** one — overview §4's
CVE-A (9.8 → 72) versus CVE-B (8.1 → 96). Encode that pair as a test. If the weights stop
producing that inversion, the weights are wrong, not the example.

---

## 5. Rendering Architecture

Next.js App Router. Since the MVP dataset is static and the engine is pure, scoring
happens at **build/server time** — no client-side risk computation, no loading state for
the numbers.

```text
app/layout.tsx                        shell, theme, fonts
app/page.tsx                          dashboard (server component)
app/vulnerabilities/[id]/page.tsx     detail view (server component)
```

**PROPOSED:** `generateStaticParams()` over the dataset so all 15–20 detail pages are
prerendered. Navigation during the demo is then instant, which matters more than it
sounds when presenting live.

Client components are limited to what genuinely needs interactivity:

| Component | Boundary | Reason |
|---|---|---|
| `dashboard.tsx` | server | pure render of sorted results |
| `priority-column.tsx` | server | static grouping |
| `vulnerability-table.tsx` | client | sorting / filtering state |
| `risk-card.tsx` | server | static |
| `vulnerability-detail.tsx` | server | static |
| Demo-mode trigger | client | staged progress animation |

### Demo mode

Overview §16's `[ Analyze Environment ]` sequence is **presentation, not computation** —
the scores already exist. It is a staged reveal over a timer. This must be understood by
whoever builds it: it is honest stagecraft for a live audience, and it should never be
described in the pitch as the system "computing" in real time.

---

## 6. Repository Structure

**As built.** The application lives under `frontend/`, not at the repository root — the
flat layout sketched in overview §11 applies *inside* that directory:

```text
Team13/
├── frontend/                    ← the Next.js application
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── vulnerabilities/[id]/page.tsx
│   ├── components/
│   │   ├── navbar.tsx
│   │   ├── stats-overview.tsx
│   │   ├── priority-kanban.tsx
│   │   ├── vulnerability-table.tsx
│   │   ├── vulnerability-detail.tsx
│   │   ├── analyze-modal.tsx
│   │   └── ai-copilot-drawer.tsx
│   ├── lib/
│   │   ├── risk-engine.ts       ← the canonical engine
│   │   ├── vulnerabilities.ts
│   │   └── ai-explainer.ts
│   ├── types/vulnerability.ts
│   └── tests/risk-engine.test.ts
├── docs/
└── shifan.md
```

`frontend/tsconfig.json` maps `@/*` → `./*`, so `@/lib/risk-engine` resolves **inside
`frontend/`**. Every module path named elsewhere in this document should be read with a
`frontend/` prefix.

> A second risk engine once existed at the repository root (`lib/risk-engine.ts`) with its
> own tests. It produced different scores for the same input and has been removed.
> `frontend/lib/risk-engine.ts` is the only implementation.

---

## 7. Ownership Map

Mapping overview §17 onto the modules above, so the three workstreams don't collide:

| Owner | Modules |
|---|---|
| Member 1 — Product + Frontend | `app/**`, `components/**` |
| Member 2 — AI + Risk Intelligence | `lib/risk-engine.ts`, `lib/vulnerabilities.ts`, AI layer |
| Member 3 — Backend + Security | `types/**`, engine tests, Phase-2 API design |

The contracts in §3 are the interface between them. **Agree on `RiskResult` before
splitting up** — it is the only shared surface, and every parallel task depends on it.

---

## 8. AI Layer Boundary

The AI layer receives a completed `RiskResult` and produces text. It has no write path
back into scoring.

| Permitted | Forbidden |
|---|---|
| Explain why a score is what it is | Produce or adjust the score |
| Summarize evidence into prose | Change priority classification |
| Recommend remediation steps | Reorder the roadmap |
| Compare two vulnerabilities | Introduce facts absent from the record |

**PROPOSED:** run it as a server-side route handler (`app/api/explain/route.ts`) so the
API key stays server-only, and have it accept a `RiskResult` and return prose. Ship a
deterministic template fallback built from `factors[].evidence` — that path needs to exist
regardless, both because it is the offline demo safety net and because it proves the
explanation genuinely derives from the computed factors rather than from the model's
priors.

---

## 9. Future Architecture

Post-MVP evolution, per overview §20–§21. The MVP's module seams are placed to make this
additive rather than a rewrite:

```text
NVD ──────────┐
CISA KEV ─────┤
EPSS ─────────┤
              ▼
        Data Pipeline
              ▼
         PostgreSQL
              ▼
    Risk Engine (unchanged)
       ┌──────┴──────┐
       ▼             ▼
 Priority Engine   AI Layer
       └──────┬──────┘
              ▼
        PatchPilot API
              ▼
       Next.js Dashboard
```

The risk engine survives this transition untouched — it takes `Vulnerability` objects and
does not care whether they came from a TypeScript literal or a database row. That is the
main reason for keeping it pure and I/O-free in the MVP.

Phasing: **2** live intelligence feeds → **3** asset inventory and exposure detection →
**4** ticketing/alerting integrations → **5** natural-language copilot.

---

## 10. Open Questions

Decisions the overview does not settle. These need answers before or during scaffold:

1. **Sub-score normalization** (§4) — the mappings above are proposed, not agreed. This is
   the single highest-impact open item; every displayed number depends on it.
2. **Factor overlap** — Exploitation (30%), EPSS (20%) and Exploitability (10%) all measure
   related things, so 60% of the score keys off exploitation signal. Defensible for this
   product's thesis, but it should be a deliberate choice the team can articulate when
   challenged, not an accident of weighting.
3. **Dataset size** — the overview quotes three different figures: 15–20 records (§6.1),
   128 CVEs (§14), 1,284 (§24). The demo narrative and the shipped dataset need to agree,
   or the first curious judge will notice.
4. **`environment` in scoring** — the field exists in the data model but §6.2 lists no
   weight for it. Folded into Business Criticality as a multiplier above; confirm that's
   intended rather than a seventh factor.
5. **Persistence** — MVP has none. Priorities reset each load. Fine for a demo; worth
   stating out loud so nobody builds against an assumption of saved state.
6. **`assetCriticality` vs `businessImpact`** — two separate fields, but only
   `businessImpact` is scored in the proposal. Decide whether they're genuinely distinct
   inputs or whether one is redundant.
