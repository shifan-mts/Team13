# PatchPilot AI

> **AI-powered vulnerability patch prioritization for lean IT teams**

## 1. Project Overview

Small IT and security teams often face thousands of vulnerabilities across their infrastructure but have limited time and resources to patch everything immediately.

Traditional vulnerability management frequently relies heavily on **CVSS severity scores**. However, CVSS alone does not answer the most important operational question:

> **Which vulnerabilities should we patch first, and why?**

**PatchPilot AI** addresses this problem by combining vulnerability severity with real-world exploitation intelligence, exploit probability, asset exposure, and business criticality to produce an **explainable patch priority roadmap**.

Instead of simply showing a list of CVEs, PatchPilot converts vulnerability data into three actionable categories:

* 🔴 **PATCH NOW** — Immediate attention required
* 🟠 **PATCH NEXT** — Address within the next remediation window
* 🟡 **PATCH LATER** — Lower immediate risk

---

## 2. Problem Statement

Small IT teams cannot patch every CVE immediately and need to know which vulnerabilities are actually being exploited in the wild.

The system should analyze vulnerability information such as:

* CVE identifiers
* CVSS severity
* EPSS exploit probability
* Known exploitation
* Public exploit availability
* Affected assets
* Internet exposure
* Asset criticality
* Business impact

The objective is to move beyond simple CVSS-based prioritization and provide an actionable answer:

> **"Which vulnerabilities should our team patch first, and why?"**

---

## 3. Core Insight

### Traditional vulnerability prioritization

```text
CVSS Score
     ↓
Severity
     ↓
Patch Priority
```

### PatchPilot approach

```text
                  CVSS
                   │
                  EPSS
                   │
          Exploitation Evidence
                   │
           Public Exploit
                   │
           Internet Exposure
                   │
          Asset Criticality
                   │
            Business Impact
                   │
                   ▼
          ┌─────────────────┐
          │  Risk Engine    │
          └────────┬────────┘
                   │
                   ▼
            Risk Score 0–100
                   │
          ┌────────┼────────┐
          ▼        ▼        ▼
       NOW       NEXT      LATER
```

The key product insight is:

> **CVSS tells you how severe a vulnerability is. PatchPilot tells you what your team should patch first.**

---

## 4. Example

Consider two vulnerabilities:

| Vulnerability | CVSS | EPSS | Exploited | Exposure        |   Risk |
| ------------- | ---: | ---: | --------- | --------------- | -----: |
| CVE-A         |  9.8 | 0.21 | No        | Internal        |     72 |
| CVE-B         |  8.1 | 0.97 | Yes       | Internet-facing | **96** |

A CVSS-only system may prioritize **CVE-A**.

PatchPilot prioritizes **CVE-B** because:

* It has confirmed exploitation
* It has a high exploit probability
* It affects an internet-facing system
* It affects a critical production asset

Therefore:

> **CVE-B should be patched first despite having a lower CVSS score.**

This demonstrates the core value of the product.

---

## 5. MVP Objective

The MVP focuses on one complete workflow:

```text
Load vulnerability environment
        ↓
Analyze vulnerabilities
        ↓
Calculate real-world risk
        ↓
Rank vulnerabilities
        ↓
PATCH NOW / NEXT / LATER
        ↓
Explain why
        ↓
Recommend remediation action
```

The MVP intentionally avoids unnecessary enterprise features.

---

## 6. MVP Features

### 6.1 Vulnerability Dataset

The MVP uses a curated dataset of approximately 15–20 realistic vulnerabilities.

Each vulnerability contains:

* CVE ID
* Description
* CVSS score
* EPSS score
* CISA KEV status
* Exploit availability
* Internet exposure
* Asset criticality
* Environment
* Business impact

---

### 6.2 Risk Scoring

PatchPilot calculates a normalized risk score between **0 and 100**.

The initial scoring model:

```text
Exploitation Evidence     30%
EPSS                      20%
Asset Exposure            15%
Business Criticality      15%
CVSS Severity             10%
Exploitability            10%
```

The weights are configurable and represent the project's transparent prioritization model rather than an industry-standard formula.

---

### 6.3 Priority Classification

```text
90–100  → PATCH NOW
70–89   → PATCH NEXT
0–69    → PATCH LATER
```

The thresholds can later be customized based on organizational risk tolerance.

---

## 7. Explainability

Every risk score should be accompanied by a human-readable explanation.

Example:

```text
CVE-XXXX
Risk Score: 96
Priority: PATCH NOW

Why?
✓ Confirmed exploitation
✓ Listed in CISA KEV
✓ EPSS: 97%
✓ Internet-facing asset
✓ Critical production system
✓ Public exploit available

Recommendation:
Patch this vulnerability immediately because confirmed
exploitation combined with internet exposure creates a
high immediate risk to the organization.
```

The system should never rely on unexplained AI-generated scores.

---

## 8. AI Layer

The core numerical risk score is deterministic.

AI is used primarily for:

* Explaining risk
* Summarizing vulnerability evidence
* Generating remediation recommendations
* Comparing vulnerabilities
* Translating technical security data into actionable language

### Example

**Question:**

> Why should CVE-123 be patched before the CVSS 9.8 vulnerability?

**AI response:**

> CVE-123 has a lower CVSS score but represents a higher immediate risk because it has confirmed exploitation, a high EPSS score, and affects an internet-facing critical production asset. The CVSS 9.8 vulnerability currently has no evidence of active exploitation and affects an internal low-criticality system.

This creates **explainable AI rather than an LLM-only security system**.

---

## 9. Application Architecture

```text
┌─────────────────────────────────────────────┐
│                 PatchPilot UI               │
│                                             │
│ Dashboard │ Vulnerabilities │ Risk Details  │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │ Risk Engine    │
              │                │
              │ CVSS           │
              │ EPSS           │
              │ KEV            │
              │ Exploitation   │
              │ Exposure       │
              │ Criticality    │
              └───────┬────────┘
                      │
                      ▼
             ┌─────────────────┐
             │ Priority Engine │
             └────────┬────────┘
                      │
            ┌─────────┼─────────┐
            ▼         ▼         ▼
          NOW       NEXT      LATER
            │         │         │
            └─────────┼─────────┘
                      ▼
             AI Explanation Layer
```

---

## 10. Technology Stack

### Frontend

* Next.js
* TypeScript
* Tailwind CSS
* shadcn/ui
* Lucide Icons

### MVP Data Layer

* Local TypeScript dataset

### Future Backend

* FastAPI
* PostgreSQL / Supabase

### Future Intelligence Sources

* NVD
* CISA KEV
* EPSS
* Exploit intelligence sources

### AI

* LLM-based explanation and recommendation layer

---

## 11. Repository Structure

```text
patchpilot/
│
├── app/
│   ├── page.tsx
│   └── vulnerabilities/
│       └── [id]/
│           └── page.tsx
│
├── components/
│   ├── dashboard.tsx
│   ├── vulnerability-table.tsx
│   ├── risk-card.tsx
│   ├── priority-column.tsx
│   └── vulnerability-detail.tsx
│
├── lib/
│   ├── vulnerabilities.ts
│   ├── risk-engine.ts
│   └── utils.ts
│
├── types/
│   └── vulnerability.ts
│
├── public/
│   └── ...
│
├── README.md
├── PROJECT.md
├── package.json
└── .env.example
```

---

## 12. Core Data Model

### Vulnerability

```typescript
interface Vulnerability {
  id: string;
  cve: string;
  description: string;
  cvss: number;
  epss: number;
  kev: boolean;
  exploitAvailable: boolean;
  internetExposed: boolean;
  assetName: string;
  assetCriticality:
    | "critical"
    | "high"
    | "medium"
    | "low";
  environment:
    | "production"
    | "staging"
    | "development";
  businessImpact:
    | "critical"
    | "high"
    | "medium"
    | "low";
}
```

---

## 13. Risk Engine

The risk engine should expose three primary functions:

```typescript
calculateRisk(vulnerability)
getPriority(riskScore)
getRiskFactors(vulnerability)
```

Example:

```typescript
const riskScore =
  exploitationScore * 0.30 +
  epssScore * 0.20 +
  exposureScore * 0.15 +
  businessScore * 0.15 +
  cvssScore * 0.10 +
  exploitabilityScore * 0.10;
```

The result should contain:

```typescript
{
  score: 96,
  priority: "NOW",
  factors: [
    "Confirmed exploitation",
    "High EPSS",
    "Internet-facing asset",
    "Critical production system"
  ]
}
```

---

## 14. Dashboard

The primary dashboard should immediately communicate the state of the environment.

Example:

```text
┌────────────────────────────────────────────────────────────┐
│ PATCHPILOT AI                                              │
│ Vulnerability Prioritization                               │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ 128 CVEs       12 PATCH NOW      31 NEXT       85 LATER   │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ PATCH NOW 🔴                                               │
│                                                            │
│ CVE-XXXX                         Risk 96                   │
│ Active exploitation • Internet exposed                    │
│                                                            │
│ CVE-YYYY                         Risk 93                   │
│ KEV • Critical production asset                            │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ PATCH NEXT 🟠                                              │
│                                                            │
│ CVE-ZZZZ                         Risk 82                   │
│ High severity • No active exploitation                     │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ PATCH LATER 🟡                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 15. Vulnerability Detail View

Selecting a vulnerability should reveal:

### Risk Score

```text
96 / 100
PATCH NOW
```

### Risk Factors

```text
Exploitation        98
EPSS                97
Exposure            91
Business Impact     87
Severity            81
Exploitability      92
```

### Evidence

```text
✓ Known exploited vulnerability
✓ CISA KEV
✓ High EPSS
✓ Public exploit
✓ Internet-facing
✓ Critical asset
```

### Recommendation

```text
Patch immediately.
Prioritize this vulnerability over higher-CVSS
vulnerabilities because there is stronger evidence
of active exploitation and greater environmental exposure.
```

---

## 16. Demo Mode

The MVP should include a simple:

```text
[ Analyze Environment ]
```

button.

Demo flow:

```text
128 vulnerabilities detected
        ↓
Analyzing risk...
        ↓
Enriching exploitation intelligence...
        ↓
Evaluating asset exposure...
        ↓
Generating priorities...
        ↓
Analysis complete
```

Then reveal:

```text
PATCH NOW     12
PATCH NEXT    31
PATCH LATER   85
```

This provides a clear end-to-end product experience without requiring external infrastructure during the demo.

---

## 17. Team Responsibilities

The project is being developed by a **3-person team**.

### Team Member 1 — Product + Frontend

Responsibilities:

* Product architecture
* UX/UI
* Dashboard
* Vulnerability detail view
* User workflow
* Demo experience
* Pitch

### Team Member 2 — AI + Risk Intelligence

Responsibilities:

* Risk scoring
* CVE dataset
* Exploitation intelligence
* EPSS integration
* KEV integration
* AI explanations
* Risk-model validation

### Team Member 3 — Backend + Security

Responsibilities:

* Data structures
* API architecture
* Asset model
* Security logic
* Testing
* Future backend integration

All team members should understand the complete product and be capable of explaining its architecture.

---

## 18. One-Hour MVP Development Plan

The initial MVP can be implemented as a focused one-hour build.

### 0–10 min

Project setup:

* Next.js
* TypeScript
* Tailwind
* shadcn/ui
* Lucide

### 10–20 min

Create:

```text
types/vulnerability.ts
lib/vulnerabilities.ts
```

Populate 15–20 demo vulnerabilities.

### 20–30 min

Implement:

```text
calculateRisk()
getPriority()
getRiskFactors()
```

Validate that actively exploited vulnerabilities can outrank higher-CVSS vulnerabilities.

### 30–45 min

Build:

* Dashboard
* Statistics
* Priority sections
* Vulnerability cards
* Risk badges

### 45–52 min

Implement:

* Vulnerability detail view
* Risk breakdown
* Evidence
* Recommendation

### 52–57 min

Add:

```text
Analyze Environment
```

with a realistic analysis/loading experience.

### 57–60 min

Polish:

* Typography
* Spacing
* Responsive layout
* Loading states
* Empty states
* Error handling
* Visual consistency

---

## 19. What Is Deliberately Out of Scope

The MVP does **not** attempt to build a complete enterprise vulnerability management platform.

The following are future features:

* Authentication
* Multi-tenant organizations
* Real-time vulnerability ingestion
* Full NVD synchronization
* Automated asset discovery
* Endpoint agents
* Network scanning
* Jira integration
* Slack notifications
* Email alerts
* Automated patch deployment
* Advanced ML models
* Enterprise RBAC
* Continuous monitoring

These features should only be considered after the core prioritization workflow is proven.

---

## 20. Future Architecture

After the MVP, the architecture can evolve into:

```text
NVD ────────────────┐
                    │
CISA KEV ───────────┤
                    │
EPSS ───────────────┤
                    ▼
              Data Pipeline
                    │
                    ▼
             PostgreSQL
                    │
                    ▼
             Risk Engine
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
    Priority Engine       AI Layer
          │                   │
          └─────────┬─────────┘
                    ▼
              PatchPilot API
                    │
                    ▼
             Next.js Dashboard
                    │
          ┌─────────┼──────────┐
          ▼         ▼          ▼
       Roadmap   Analytics   Assistant
```

---

## 21. Future Features

### Phase 2 — Live Intelligence

* NVD API
* CISA KEV API
* EPSS API
* Automated CVE enrichment
* Scheduled synchronization

### Phase 3 — Environment Intelligence

* Asset inventory
* Asset-to-CVE mapping
* Internet exposure detection
* Business criticality
* Environment segmentation

### Phase 4 — Security Operations

* Jira integration
* Slack alerts
* Email alerts
* Assignment
* Remediation tracking
* SLA monitoring

### Phase 5 — AI Security Copilot

Natural-language queries such as:

```text
"What's the biggest security risk right now?"
"Why is CVE-123 more urgent than CVE-456?"
"What can we safely postpone?"
"Which production systems are most exposed?"
"Give me a remediation plan for today's top 5 vulnerabilities."
```

---

## 22. Key Product Differentiator

PatchPilot is not another CVE database.

It is not primarily a vulnerability scanner.

It is not an LLM wrapper.

It is a **decision-support system for lean security teams**.

### The product transforms:

```text
Thousands of vulnerabilities
            ↓
Raw security information
            ↓
Risk intelligence
            ↓
Explainable prioritization
            ↓
Actionable patch roadmap
```

---

## 23. Success Criteria

The MVP is successful if a user can answer these questions immediately:

### Question 1

> Which vulnerability should I patch first?

**PatchPilot provides a ranked answer.**

### Question 2

> Why?

**PatchPilot provides evidence and risk factors.**

### Question 3

> What about the other vulnerabilities?

**PatchPilot categorizes them into Now / Next / Later.**

### Question 4

> Why isn't the highest CVSS vulnerability automatically first?

**PatchPilot demonstrates the effect of exploitation, exposure, and business context.**

---

## 24. Hackathon Demo Script

### Opening

> "Imagine you're a security engineer at a 20-person company. You wake up to 1,284 vulnerabilities and only have enough time to patch ten today. Which ten do you choose?"

### Demonstration

Load the environment.

```text
1,284 vulnerabilities
        ↓
Analyze Environment
        ↓
Risk Intelligence
        ↓
12 PATCH NOW
```

Select the highest-priority vulnerability.

Show:

```text
Risk: 96/100
✓ Active exploitation
✓ CISA KEV
✓ EPSS 97%
✓ Internet exposed
✓ Critical production asset
```

Then compare it with a CVSS 9.8 vulnerability.

```text
CVSS 9.8 → Risk 72
CVSS 8.1 → Risk 96
```

### Key statement

> **"Traditional systems would prioritize the 9.8 vulnerability. PatchPilot prioritizes the 8.1 vulnerability because it represents a greater real-world threat right now."**

### Closing

> **"PatchPilot doesn't tell lean IT teams what's merely severe. It tells them what matters most right now."**

---

## 25. Final MVP Principle

> **Build less. Explain better.**

The goal is not to demonstrate the largest cybersecurity platform.

The goal is to prove one valuable capability extremely well:

> **Turn a large vulnerability list into a trustworthy, explainable patching decision.**
