# Risk Engine

`lib/risk-engine.ts` — the deterministic core of PatchPilot AI.

## Purpose

Turns a vulnerability record into an explainable 0–100 risk score and a
`NOW` / `NEXT` / `LATER` priority.

The engine is **pure and synchronous**: no I/O, no clock, no randomness, no LLM. The
same input always produces the same score, the same reasons, and the same
recommendation. AI is used elsewhere in the product to *phrase* risk, never to compute
it — a security team cannot audit a number a model invented.

## Input

```typescript
interface RiskInput {
  cve: string;
  cvss: number;                 // 0–10
  epss: number;                 // 0–1
  kev: boolean;                 // listed in CISA KEV
  exploitAvailable: boolean;    // public exploit code exists
  internetExposed: boolean;
  assetCriticality: "critical" | "high" | "medium" | "low";
  businessImpact:   "critical" | "high" | "medium" | "low";
  environment: "production" | "staging" | "development";
}
```

The wider `Vulnerability` record in [`architecture.md`](architecture.md) structurally
satisfies `RiskInput`, so it can be passed straight in.

## Formula

```text
risk = exploitation    * 0.30
     + epss            * 0.20
     + exposure        * 0.15
     + businessImpact  * 0.15
     + cvss            * 0.10
     + exploitability  * 0.10
```

Every factor is normalized to 0–100 first, so the weighted sum lands on 0–100 and each
sub-score is directly displayable. The result is rounded to an integer and clamped.

> These are **PatchPilot's MVP weights**, not an industry-standard formula. They encode
> a deliberate position: real-world exploitation evidence outweighs theoretical severity.

## Normalization

| Factor | Weight | Mapping |
|---|---:|---|
| **Exploitation** | 30% | KEV + exploit → 100 · KEV → 90 · exploit → 75 · neither → 20 |
| **EPSS** | 20% | `epss × 100` (0.97 → 97) |
| **Exposure** | 15% | internet-facing → 100 · internal → 40 |
| **Business criticality** | 15% | critical 100 · high 75 · medium 50 · low 25 |
| **CVSS** | 10% | `cvss × 10` (8.1 → 81) |
| **Exploitability** | 10% | KEV + exploit → 100 · KEV → 90 · exploit → 75 · EPSS ≥ 0.70 → 70 · EPSS ≥ 0.30 → 45 · else 20 |

Internal assets floor at 40 rather than 0: less reachable is not unreachable.

## Priority

```text
90–100  → NOW
70–89   → NEXT
 0–69   → LATER
```

Exported as `PRIORITY_THRESHOLDS` so no caller hardcodes its own copy.

## Output

```typescript
interface RiskAssessment {
  cve: string;
  score: number;                 // 0–100 integer
  priority: "NOW" | "NEXT" | "LATER";
  factors: {
    exploitation: number;
    epss: number;
    exposure: number;
    businessImpact: number;
    cvss: number;
    exploitability: number;
  };
  reasons: string[];             // evidence, derived from the input
  recommendation: string;
}
```

## Example

The scenario the product rests on — a **lower-CVSS vulnerability outranking a higher one**:

| | CVSS | EPSS | KEV | Exposed | **Score** | Priority |
|---|---:|---:|---|---|---:|---|
| CVE-DEMO-A | 9.8 | 0.10 | no | internal | **30** | LATER |
| CVE-DEMO-001 | 8.1 | 0.97 | yes | internet | **98** | NOW |

The 9.8 scores 30 because severity is only 10% of the model and every exploitation and
exposure signal is absent. Actual output for CVE-DEMO-001:

```json
{
  "cve": "CVE-DEMO-001",
  "score": 98,
  "priority": "NOW",
  "factors": {
    "exploitation": 100,
    "epss": 97,
    "exposure": 100,
    "businessImpact": 100,
    "cvss": 81,
    "exploitability": 100
  },
  "reasons": [
    "Known exploited vulnerability",
    "High exploit probability",
    "Internet-facing asset",
    "Critical business asset",
    "Public exploit available",
    "Critical production asset",
    "Running in production"
  ],
  "recommendation": "Patch immediately because exploitation evidence and environmental exposure indicate high immediate risk."
}
```

## UI integration

```typescript
import { calculateRisk } from "@/lib/risk-engine";

const assessment = calculateRisk(vulnerability);

console.log(assessment.score);
console.log(assessment.priority);
console.log(assessment.reasons);
```

**The UI must not duplicate risk calculations.** Everything the dashboard and detail view
need is on `RiskAssessment`:

- score badge → `assessment.score`
- column / colour → `assessment.priority`
- factor breakdown → `assessment.factors`
- evidence checklist → `assessment.reasons`
- remediation copy → `assessment.recommendation`

Sort a list with `calculateRisk(v).score` descending. Do not re-derive priority from the
score in a component — call `getPriority`, or read `assessment.priority`.

## Tests

`tests/risk-engine.test.ts` — 13 cases covering the A-vs-B inversion, priority
boundaries (90/89/70/69), normalization, the 0–100 invariant, and determinism.

No test runner is configured in the repo yet. The suite is written for **Vitest**; whoever
scaffolds the app should add it and wire `@` → project root:

```bash
npm i -D vitest
```

## Known gaps

- **`assetCriticality` and `environment` are accepted but not scored.** The 15% slot is
  fed by `businessImpact` alone, per the agreed weight table. Both fields do appear in
  `reasons`, so they show up in the explanation without silently affecting the number.
  Whether they deserve their own weight is an open model question.
- **Exploitation, EPSS and Exploitability overlap**, so ~60% of the score keys off
  exploitation signal. That is intentional given the product thesis, but it is a position
  worth being able to defend.
