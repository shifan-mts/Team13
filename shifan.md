# PatchPilot AI — Frontend Implementation & Backend Handover Document

> **Author**: Shifan (Team Member 1 — Product & Frontend Lead)  
> **Status**: Frontend MVP Implemented & Ready for Backend Integration  
> **Target Audience**: Backend & Security Developer (Team Member 3 & AI Lead)  
> **Last Updated**: August 2026

---

## 1. Executive Summary

This document serves as the complete technical specification and handover guide for connecting the **PatchPilot AI** Next.js frontend with the Python/FastAPI (or Node.js) backend.

The frontend is fully built, styled with modern dark-mode glassmorphism aesthetics, and equipped with a deterministic risk scoring engine, interactive Kanban prioritization board, multi-criteria filterable table, vulnerability detail slide-over drawer, environment analysis simulation modal, and AI Copilot assistant.

All static data fetching seams in `lib/vulnerabilities.ts` have been designed to transition seamlessly to REST API endpoints.

---

## 2. Frontend Architecture & Component Directory

```text
Team13/
├── frontend/
│   ├── app/
│   │   ├── page.tsx                       # Main Dashboard Page (Kanban/Table toggle, Stats, Drawers)
│   │   ├── vulnerabilities/[id]/page.tsx   # Prerendered Static Detail Page per CVE
│   │   ├── layout.tsx                     # Dark Mode Root Layout & Ambient Backdrop
│   │   └── globals.css                    # Glassmorphism, Badge Glows, Custom Scrollbars
│   ├── components/
│   │   ├── navbar.tsx                     # Top Navigation Bar & Action Triggers
│   │   ├── stats-overview.tsx             # Executive Statistics Banner Cards
│   │   ├── priority-kanban.tsx            # 3-Column Kanban Roadmap (NOW 🔴, NEXT 🟠, LATER 🟡)
│   │   ├── vulnerability-table.tsx        # Filterable Data Table with Search & Multi-Sort
│   │   ├── vulnerability-detail.tsx       # Slide-Over Risk Breakdown & Evidence Drawer
│   │   ├── analyze-modal.tsx              # Interactive 5-Step Simulation Modal
│   │   └── ai-copilot-drawer.tsx          # AI Rationale & CVE Comparative Analysis Tool
│   ├── lib/
│   │   ├── risk-engine.ts                 # Pure Deterministic Scoring Engine (Auditable Core)
│   │   ├── vulnerabilities.ts            # Curated 18-CVE Dataset & API Mock Abstraction
│   │   └── ai-explainer.ts                # Downstream AI Explanation & Comparison Helper
│   ├── types/
│   │   └── vulnerability.ts               # Shared Data Models & REST DTO Interfaces
│   ├── package.json
│   └── tsconfig.json
├── docs/
└── shifan.md                              # Backend Handover & API Contract Spec
```

---

## 3. Risk Engine Contract (Scoring Alignment)

To ensure consistency across frontend and backend, the risk engine calculates scores using **exact deterministic arithmetic**:

$$\text{Risk Score} = \text{Math.round}\left(\sum_{i=1}^{6} \text{Score}_i \times \text{Weight}_i\right)$$

### Factor Normalizations & Weights

| Factor Name | Weight | Calculation / Mapping | Evidence String Example |
| :--- | :---: | :--- | :--- |
| **Exploitation Evidence** | `30%` (`0.30`) | `kev ? 100 : 0` | `"Confirmed active exploitation listed in CISA KEV catalog"` |
| **EPSS Exploit Probability** | `20%` (`0.20`) | `Math.round(epss * 100)` | `"EPSS probability score: 94.2%"` |
| **Asset Exposure** | `15%` (`0.15`) | `internetExposed ? 100 : 30` | `"Directly internet-facing service"` |
| **Business Criticality** | `15%` (`0.15`) | $\min(100, \text{ImpactScore} \times \text{EnvMultiplier})$<br>Impact: `critical: 100, high: 75, medium: 45, low: 20`<br>Env: `production: 1.0, staging: 0.7, development: 0.4` | `"CRITICAL business impact in PRODUCTION environment"` |
| **CVSS Severity** | `10%` (`0.10`) | `Math.round(cvss * 10)` | `"Base CVSS Score: 9.8 / 10"` |
| **Exploit Availability** | `10%` (`0.10`) | `exploitAvailable ? 100 : 25` | `"Public functional exploit code published (PoC/Metasploit)"` |

### Priority Classification Thresholds

- $\text{Score} \ge 90 \implies \text{Priority: }\mathbf{"NOW"}$ (🔴 Red)
- $70 \le \text{Score} \le 89 \implies \text{Priority: }\mathbf{"NEXT"}$ (🟠 Orange)
- $\text{Score} < 70 \implies \text{Priority: }\mathbf{"LATER"}$ (🟡 Yellow)

> [!IMPORTANT]
> **Validation Rule**: The backend scoring module **must** preserve the property where an actively exploited, internet-facing CVE with a lower CVSS score (e.g. CVE-2024-23897, CVSS 7.5, EPSS 91.5% $\rightarrow$ Risk 91, PATCH NOW) outranks an unexploited internal CVE with a higher CVSS score (e.g. CVE-2023-22515, CVSS 10.0, EPSS 22% $\rightarrow$ Risk ~68, PATCH LATER).

---

## 4. Backend REST API Specification

When developing the FastAPI / Node.js backend, implement the following standard REST endpoints:

### 1. `GET /api/vulnerabilities`

Returns all evaluated vulnerability records sorted descending by composite risk score.

**Response Payload (`200 OK`)**:
```json
{
  "success": true,
  "count": 18,
  "stats": {
    "total": 18,
    "nowCount": 7,
    "nextCount": 6,
    "laterCount": 5,
    "kevCount": 14,
    "avgRiskScore": 84
  },
  "data": [
    {
      "vulnerability": {
        "id": "vuln-01",
        "cve": "CVE-2024-1709",
        "description": "ConnectWise ScreenConnect authentication bypass vulnerability allowing remote administrative user creation.",
        "cvss": 10.0,
        "epss": 0.965,
        "kev": true,
        "exploitAvailable": true,
        "internetExposed": true,
        "assetName": "prod-vpn-gateway-01",
        "assetCriticality": "critical",
        "environment": "production",
        "businessImpact": "critical",
        "publishedDate": "2024-02-20",
        "vendor": "ConnectWise",
        "remediationAction": "Upgrade ConnectWise ScreenConnect to version 23.9.8 or higher immediately."
      },
      "score": 98,
      "priority": "NOW",
      "factors": [
        {
          "name": "Exploitation Evidence",
          "score": 100,
          "weight": 0.30,
          "evidence": "Confirmed active exploitation listed in CISA KEV catalog"
        },
        {
          "name": "EPSS Exploit Probability",
          "score": 97,
          "weight": 0.20,
          "evidence": "EPSS probability score: 96.5%"
        },
        {
          "name": "Asset Exposure",
          "score": 100,
          "weight": 0.15,
          "evidence": "Directly internet-facing service"
        },
        {
          "name": "Business Criticality",
          "score": 100,
          "weight": 0.15,
          "evidence": "CRITICAL business impact in PRODUCTION environment"
        },
        {
          "name": "CVSS Severity",
          "score": 100,
          "weight": 0.10,
          "evidence": "Base CVSS Score: 10.0 / 10"
        },
        {
          "name": "Exploit Availability",
          "score": 100,
          "weight": 0.10,
          "evidence": "Public functional exploit code published (PoC/Metasploit)"
        }
      ]
    }
  ]
}
```

---

### 2. `GET /api/vulnerabilities/:id`

Fetch details for a single CVE by ID or CVE string.

**Response Payload (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "vulnerability": { ... },
    "score": 98,
    "priority": "NOW",
    "factors": [ ... ]
  }
}
```

---

### 3. `POST /api/analyze`

Triggers a fresh threat intelligence enrichment & environment rescan.

**Request Payload**:
```json
{
  "environment": "production",
  "syncKev": true,
  "syncEpss": true
}
```

**Response Payload (`200 OK`)**:
```json
{
  "success": true,
  "message": "Analysis complete! Evaluated 18 CVEs across 12 infrastructure assets.",
  "timestamp": "2026-08-08T15:30:00Z"
}
```

---

### 4. `POST /api/ai/explain`

Generates AI explanation prose for a given vulnerability risk result.

**Request Payload**:
```json
{
  "cve": "CVE-2024-1709",
  "score": 98,
  "priority": "NOW"
}
```

**Response Payload (`200 OK`)**:
```json
{
  "cve": "CVE-2024-1709",
  "summary": "CVE-2024-1709 is categorized as PATCH NOW with an urgent Risk Score of 98/100. Confirmed active exploitation in CISA KEV catalog combined with internet exposure creates immediate perimeter breach risk.",
  "remediationAdvice": "Upgrade ConnectWise ScreenConnect to version 23.9.8 or higher immediately.",
  "remediationCommand": "sudo apt-get update && sudo apt-get install --only-upgrade connectwise-screenconnect"
}
```

---

### 5. `POST /api/ai/compare`

Compares two CVEs and returns human-auditable rationale.

**Request Payload**:
```json
{
  "cveIdA": "CVE-2024-23897",
  "cveIdB": "CVE-2023-22515"
}
```

**Response Payload (`200 OK`)**:
```json
{
  "higherRiskCve": "CVE-2024-23897",
  "comparisonSummary": "CVE-2024-23897 (Risk 91, PATCH NOW) should be patched before CVE-2023-22515 (Risk 68, PATCH LATER) because of confirmed active exploitation and public internet exposure, despite having a lower CVSS score (7.5 vs 10.0)."
}
```

---

## 5. Pydantic Schemas (Python Backend Starter)

If writing the backend in Python using **FastAPI**, you can directly copy these Pydantic schemas:

```python
from pydantic import BaseModel, Field
from typing import List, Optional, Literal

PriorityType = Literal["NOW", "NEXT", "LATER"]
CriticalityType = Literal["critical", "high", "medium", "low"]
EnvType = Literal["production", "staging", "development"]

class VulnerabilitySchema(BaseModel):
    id: str
    cve: str
    description: str
    cvss: float = Field(ge=0.0, le=10.0)
    epss: float = Field(ge=0.0, le=1.0)
    kev: bool
    exploitAvailable: bool
    internetExposed: bool
    assetName: str
    assetCriticality: CriticalityType
    environment: EnvType
    businessImpact: CriticalityType
    publishedDate: Optional[str] = None
    vendor: Optional[str] = None
    remediationAction: Optional[str] = None

class RiskFactorSchema(BaseModel):
    name: str
    score: int
    weight: float
    evidence: str

class RiskResultSchema(BaseModel):
    vulnerability: VulnerabilitySchema
    score: int
    priority: PriorityType
    factors: List[RiskFactorSchema]

class PriorityStatsSchema(BaseModel):
    total: int
    nowCount: int
    nextCount: int
    laterCount: int
    kevCount: int
    avgRiskScore: int
```

---

## 6. How to Connect Frontend to Backend API

1. Create a `.env.local` file in the frontend root:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   ```

2. Update `lib/vulnerabilities.ts` to fetch from backend:
   ```typescript
   export async function fetchVulnerabilitiesFromBackend(): Promise<RiskResult[]> {
     const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vulnerabilities`);
     const json = await res.json();
     return json.data;
   }
   ```

---

## 7. Frontend Change Log & Updates

| Date | File Changed | Summary of Changes |
| :--- | :--- | :--- |
| **2026-08-08** | `package.json` | Installed Next.js 15, React 19, Tailwind CSS, Lucide icons, Framer Motion. |
| **2026-08-08** | `types/vulnerability.ts` | Created shared data types (`Vulnerability`, `RiskResult`, `RiskFactor`, `PriorityStats`, API DTOs). |
| **2026-08-08** | `lib/risk-engine.ts` | Implemented pure 6-factor deterministic scoring engine & priority classifier. |
| **2026-08-08** | `lib/vulnerabilities.ts` | Created 18-CVE realistic dataset including CVSS vs Risk inversion validation pair. |
| **2026-08-08** | `lib/ai-explainer.ts` | Created deterministic AI explanation & comparative analysis generator. |
| **2026-08-08** | `app/globals.css` | Implemented dark mode theme, glassmorphism panel styles, badge glows, scrollbars. |
| **2026-08-08** | `components/navbar.tsx` | Built header with branding, live environment status indicator, and trigger buttons. |
| **2026-08-08** | `components/stats-overview.tsx` | Built executive stats banner (Total, NOW, NEXT, LATER, KEV, Avg Risk). |
| **2026-08-08** | `components/priority-kanban.tsx` | Built 3-column Kanban roadmap with threat badges (KEV, PoC, Internet Exposed). |
| **2026-08-08** | `components/vulnerability-table.tsx` | Built filterable data table with search, priority tabs, environment dropdown, sorting. |
| **2026-08-08** | `components/vulnerability-detail.tsx` | Built slide-over detail drawer showing full score breakdown, progress bars, & copyable patch commands. |
| **2026-08-08** | `components/analyze-modal.tsx` | Built 5-step interactive threat analysis simulation modal with terminal logs. |
| **2026-08-08** | `components/ai-copilot-drawer.tsx` | Built AI Copilot assistant for comparing CVEs and viewing prioritization rationale. |
| **2026-08-08** | `app/page.tsx` | Integrated all components into main dashboard with Kanban / Table view toggle. |
| **2026-08-08** | `app/vulnerabilities/[id]/page.tsx` | Created static prerendered detail route for each CVE via `generateStaticParams()`. |
| **2026-08-08** | `shifan.md` | Documented full handover spec, REST contracts, Pydantic schemas, and scoring rules for backend developer. |
| **2026-08-08** | `frontend/*` | Migrated project into `frontend/` directory, fixed `tsconfig.json` syntax, cleaned import aliases (`@/`), and verified `npm run build` static compilation. |
