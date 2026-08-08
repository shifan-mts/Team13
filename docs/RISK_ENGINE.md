# Risk Engine

`frontend/lib/risk-engine.ts` — the single canonical scoring engine for PatchPilot AI.

> A duplicate implementation previously existed at the repository root (`lib/risk-engine.ts`).
> It has been removed. This file is the only risk engine; do not reintroduce a second one.

## Purpose

Turns a `Vulnerability` record into an explainable 0–100 risk score and a
`NOW` / `NEXT` / `LATER` priority.

The engine is **pure and synchronous**: no I/O, no clock, no randomness, no LLM. The same
input always produces the same score and the same evidence strings. AI is used elsewhere
in the product (`frontend/lib/ai-explainer.ts`) to *phrase* risk, never to compute it — a
security team cannot audit a number a model invented.

## Public API

```typescript
import {
  calculateRisk,
  getPriority,
  getRiskFactors,
  PRIORITY_THRESHOLDS,
  WEIGHTS,
} from "@/lib/risk-engine";

calculateRisk(v: Vulnerability): RiskResult
getPriority(score: number): Priority
getRiskFactors(v: Vulnerability): RiskFactor[]
```

## Input

`Vulnerability`, from `frontend/types/vulnerability.ts`:

```typescript
interface Vulnerability {
  id: string;
  cve: string;
  description: string;
  cvss: number;                 // 0.0–10.0
  epss: number;                 // 0.0–1.0
  kev: boolean;                 // listed in CISA KEV
  exploitAvailable: boolean;    // public exploit code exists
  internetExposed: boolean;
  assetName: string;
  assetCriticality: "critical" | "high" | "medium" | "low";
  environment: "production" | "staging" | "development";
  businessImpact: "critical" | "high" | "medium" | "low";
  publishedDate?: string;
  vendor?: string;
  remediationAction?: string;
}
```

## Formula

```text
score = Math.round( Σ factor.score × factor.weight )   clamped to 0–100
```

| Factor (`name`) | Weight | Mapping |
|---|---:|---|
| `Exploitation Evidence` | 30% | `kev ? 100 : 0` |
| `EPSS Exploit Probability` | 20% | `round(epss × 100)` |
| `Asset Exposure` | 15% | internet-facing → 100 · internal → 30 |
| `Business Criticality` | 15% | impact × environment multiplier (below) |
| `CVSS Severity` | 10% | `round(cvss × 10)` |
| `Exploit Availability` | 10% | `exploitAvailable ? 100 : 25` |

Business Criticality combines two inputs:

```text
impact:       critical 100 │ high 75 │ medium 45 │ low 20
environment:  production ×1.0 │ staging ×0.7 │ development ×0.4
score = min(100, round(impact × multiplier))
```

> These are **PatchPilot's MVP weights**, not an industry-standard formula. They encode a
> deliberate position: real-world exploitation evidence outweighs theoretical severity.

## Priority

```typescript
PRIORITY_THRESHOLDS = { NOW: 90, NEXT: 70 }

score >= 90  → "NOW"
score >= 70  → "NEXT"
else         → "LATER"
```

Always read `PRIORITY_THRESHOLDS` rather than hardcoding 90/70.

## Output

```typescript
interface RiskFactor {
  name: string;      // "Exploitation Evidence", …
  score: number;     // 0–100 normalized sub-score
  weight: number;    // 0.30, 0.20, …
  evidence: string;  // human-readable, e.g. "Directly internet-facing service"
}

interface RiskResult {
  vulnerability: Vulnerability;
  score: number;          // 0–100 integer
  priority: "NOW" | "NEXT" | "LATER";
  factors: RiskFactor[];  // always 6, sorted by weight descending
}
```

Note `factors` is an **array of named entries**, not a keyed object. Look a factor up by
`name`; do not rely on positional indexing beyond the weight-descending guarantee.

There is no `reasons[]` or `recommendation` field. Evidence lives in `factors[].evidence`;
remediation prose comes from `vulnerability.remediationAction` or `ai-explainer.ts`.

## Example

The inversion the product rests on — a **lower-CVSS vulnerability outranking a higher one**,
from the shipped 18-CVE dataset:

| CVE | CVSS | EPSS | KEV | Exposure | **Score** | Priority |
|---|---:|---:|---|---|---:|---|
| CVE-2024-23897 | 7.5 | 0.915 | yes | internet | **96** | NOW |
| CVE-2023-22515 | 10.0 | 0.22 | no | internal | **26** | LATER |

The 10.0 scores 26 because severity is only 10% of the model and every exploitation and
exposure signal is absent. Actual output for the top-ranked CVE:

```json
{
  "vulnerability": { "cve": "CVE-2024-1709", "cvss": 10.0, "epss": 0.965, "...": "..." },
  "score": 99,
  "priority": "NOW",
  "factors": [
    { "name": "Exploitation Evidence",     "score": 100, "weight": 0.30, "evidence": "Confirmed active exploitation listed in CISA KEV catalog" },
    { "name": "EPSS Exploit Probability",  "score": 97,  "weight": 0.20, "evidence": "EPSS probability score: 96.5%" },
    { "name": "Asset Exposure",            "score": 100, "weight": 0.15, "evidence": "Directly internet-facing service" },
    { "name": "Business Criticality",      "score": 100, "weight": 0.15, "evidence": "CRITICAL business impact in PRODUCTION environment" },
    { "name": "CVSS Severity",             "score": 100, "weight": 0.10, "evidence": "Base CVSS Score: 10.0 / 10" },
    { "name": "Exploit Availability",      "score": 100, "weight": 0.10, "evidence": "Public functional exploit code published (PoC/Metasploit)" }
  ]
}
```

## Dataset statistics

Computed from `frontend/lib/vulnerabilities.ts` via `getPriorityStats()`:

```text
total 18 · NOW 11 · NEXT 3 · LATER 4 · KEV 15 · average risk 79
```

## UI integration

```typescript
import { calculateRisk } from "@/lib/risk-engine";

const assessment = calculateRisk(vulnerability);

console.log(assessment.score);
console.log(assessment.priority);
console.log(assessment.factors);
```

**The UI must not duplicate risk calculations.** Everything the dashboard and detail view
need is on `RiskResult`:

- score badge → `assessment.score`
- column / colour → `assessment.priority`
- factor breakdown + progress bars → `assessment.factors` (already weight-sorted)
- evidence checklist → `assessment.factors[].evidence`

For lists, prefer `getEvaluatedResults()` and `getPriorityStats()` from
`frontend/lib/vulnerabilities.ts` — they already apply the engine across the dataset.

## Tests

`frontend/tests/risk-engine.test.ts` — 15 cases run with **Vitest**:

```bash
cd frontend && npm test
```

Coverage: the A-vs-B inversion, priority boundaries (100/90/89/70/69/0), CVSS and EPSS
normalization, the 0–100 integer invariant, determinism, and the `factors[]` contract
(length 6, weight-descending, weights summing to 1, non-empty evidence).

## Known model gaps

- **`assetCriticality` does not affect the score.** The 15% slot is fed by
  `businessImpact` × `environment`. Whether asset criticality deserves its own weight is
  an open question.
- **Exploitation (30%), EPSS (20%) and Exploit Availability (10%) overlap**, so ~60% of the
  score keys off exploitation signal. Intentional given the product thesis, but a position
  worth being able to defend.
