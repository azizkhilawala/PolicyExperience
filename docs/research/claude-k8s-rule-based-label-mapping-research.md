# Kubernetes Rule-Based Label Mapping — Research

## 1. JIRA Context

### CLOUD-18357: Kubernetes Workload Unification: Illumio Label Mapping & Hybrid Flow Enrichment

- **Type:** Epic | **Status:** To Do | **Assignee:** Ganesh Talla | **Reporter:** Nick Sappa
- **Created:** 2026-06-24 | **Updated:** 2026-08-05

**Objective:** Ensure all Kubernetes network flows are fully integrated into the Illumio platform by requiring proper Illumio label decoration. K8s traffic collected via CNI-native telemetry (Cilium Hubble, Calico flow logs) currently lacks Illumio labels, preventing K8s workloads from participating in visibility, grouping, policy discovery, recommendation, and enforcement.

**Key Requirements:**
1. **Mandatory Illumio Label Decoration** — every K8s flow must carry valid Illumio labels
2. **Unified Experience & Hybrid Policy** — same UX as core workloads; hybrid policy between K8s and Cloud/non-K8s
3. **Dual Labeling + Rich Metadata** — preserve both K8s-native labels and mapped Illumio labels; expose K8s metadata as queryable fields
4. **Cross-Environment Flow Completeness** — K8s ↔ Non-K8s and K8s ↔ Cloud flows decorated on both sides

**Exit Criteria:**
- 100% of K8s flows carry complete Illumio labels
- Customers can visualize/group/create policies using unified label-based rules
- Flows between K8s and non-K8s/Cloud workloads correctly labeled at both endpoints
- Label mapping rules are configurable
- Supports major CNI telemetry sources (Cilium Hubble, Calico)

**Dependencies:** Every K8s workload must carry Illumio labels before flows arrive. One approach: automatic label mapping similar to C-VEN container workloads. Mapping rules must be customer-configurable (UI or Helm chart).

### UXD-4400: Create Label Mapping Figma Designs

- **Type:** UXD Story | **Status:** In Progress | **Assignee:** Aziz Khilawala | **Reporter:** Aziz Khilawala
- **Created:** 2026-08-05 | **Updated:** 2026-08-12

**Scope:** UI designs for label mapping rule configuration — create, edit, delete rules; visual representation of K8s → Illumio label mappings; integration with policy authoring flows.

**Reference prototype:** https://illumio-labeling-rules.surge.sh/

---

## 2. Illumio Current-State Labeling

### 2.1 Label Model (RAEL)

Illumio uses a multi-dimensional labeling system with four built-in types:

| Dimension | Purpose | Examples |
|-----------|---------|----------|
| **Role** | Function a workload performs | Web, Database, App Server |
| **Application** | Application the workload belongs to | HRM, ERP, Ordering |
| **Environment** | Stage in lifecycle | Production, QA, Staging, Dev |
| **Location** | Physical or logical location | US-East, Germany, Cloud-AWS |

**Constraints:**
- A workload can have at most **one label per dimension**
- PCE 21.x+ supports **custom label types** beyond RAEL (e.g., OS, Compliance, Risk)
- Default labels ("All Applications", etc.) exist for broad policy writing

**How labels drive policy:** The PCE's allowlist model writes rules in terms of labels. A **ruleset** scopes by labels, and **rules** within specify which labeled providers may talk to which labeled consumers over which services. The PCE translates abstract label-based rules into concrete firewall rules pushed to each workload's VEN.

### 2.2 Kubernetes/Container Labeling Mechanisms

Illumio's container stack consists of **C-VEN** (DaemonSet on each node) and **Kubelink** (maps K8s telemetry to Illumio workload objects). Three label assignment mechanisms exist:

#### (a) Container Workload Profiles (CWP)
PCE-side objects defining label assignments per K8s namespace:
- **Fix** a label to a value (e.g., always Env=Production for "prod" namespace)
- **Allow** developer-defined labels via K8s annotations, optionally restricted to an allowlist
- **Block** certain label types entirely
- Profiles can be pre-created or dynamically created for new namespaces

#### (b) Kubernetes Annotations
Developers add `com.illumio.role: "Web"` annotations to deployment/service YAML. The PCE validates against CWP restrictions.

#### (c) LabelMap CRD (Core for Kubernetes 4.2.0+)
A `kind: LabelMap` custom resource with two mapping sections:

```yaml
kind: LabelMap
spec:
  nodeLabelMap:       # K8s node labels → Illumio host workload labels
    - fromKey: "topology.kubernetes.io/zone"
      toKey: "loc"
  workloadLabelMap:   # K8s workload labels → Illumio container workload labels
    - fromKey: "app.kubernetes.io/name"
      toKey: "app"
      allowCreate: true     # create new Illumio label values if needed
      valuesMap:            # optional value transformation
        - from: "frontend"
          to: "Web"
```

**Key limitation:** No regex/pattern support — only direct key-value mapping with optional `valuesMap` transformations. LabelMap CRDs **take precedence** over CWP and annotation labels.

### 2.3 Label Provenance

For **Kubernetes workloads**, Illumio tracks label source via `com.ilo-result.<label_type>` annotations:

| Source | Meaning |
|--------|---------|
| `container-workload-profile` | Assigned via CWP (admin-defined) |
| `annotations` | From K8s workload template annotation (developer-defined) |
| `label-map` | Assigned via LabelMap CRD |

For **non-Kubernetes workloads**, label assignment channels include:
- Manual (PCE UI)
- REST API
- CSV Import/Export
- Terraform Provider
- Pairing Profiles (labels baked into pairing key)
- AI Labeling (CloudSecure — ML-based recommendations requiring user approval)
- Cloud Tag Mapping (CloudSecure — automatic AWS/Azure tag → Illumio label)
- ServiceNow CMDB Sync

**Gap:** No unified provenance API across all assignment methods for non-K8s workloads.

### 2.4 CloudSecure Tag-to-Label Mapping

CloudSecure provides direct cloud tag → Illumio label mapping:
- Tag key maps to label type, tag value becomes label value
- Configurable via Terraform `illumio-cloudsecure` provider (`tag_to_label` resource)
- No documented support for value normalization, regex, or conditional logic

### 2.5 Illumio Patent US11171991B2

Describes distinguishing between:
- **Securely-assigned labels** (via authenticated pairing profiles — cannot be manipulated)
- **Adaptably-assigned labels** (derived from workload attributes: hostname patterns, running processes, IP ranges, open ports)

The patent addresses security: a bad actor should not be able to manipulate workload attributes to gain unauthorized label assignments.

---

## 3. Comparable Rule/Query UX Patterns

### 3.1 Universal Data Model

Nearly all products converge on a **Rule/Group tree structure**:

```
Group {
  condition: "AND" | "OR"
  rules: [
    Rule { field, operator, value }
    | Group { ... }  // nested
  ]
}
```

### 3.2 Product Comparisons

| Product | Rule Definition | Expression Support | Preview | Regex |
|---------|----------------|-------------------|---------|-------|
| **Cloudflare Rules** | Visual builder + text editor | Wireshark-inspired syntax | Traffic preview | Yes (max 64/rule) |
| **Kyverno** | YAML policies | Anchors + JMESPath | Policy reports | Limited |
| **AWS Tag Policies** | JSON definitions | AWS Organizations | Config compliance | No |
| **Azure Policy** | JSON policy defs | ARM template conditions | Compliance dashboard | Limited |
| **Datadog Tag Extraction** | Config YAML | Wildcard matching | Tag inspector | Pattern-based |
| **ServiceNow** | Encoded queries | `field.operator.value` | Record preview | No |
| **OPA/Gatekeeper** | Rego language | Full programming language | Audit mode | Yes |

### 3.3 Cloudflare Expression Builder (Best-in-Class UX Reference)

Cloudflare invested months in paper prototyping their dual-mode expression builder:
- **Visual builder:** Dropdowns for field/operator/value, visual AND/OR grouping
- **Text editor:** Syntax-highlighted expression language (Wireshark-inspired)
- **Operators:** eq, ne, contains, matches (regex), in (list), starts_with, ends_with, not
- **Compound expressions:** and, or, not, parentheses for grouping
- **Limits:** 4,096 char expressions, max 64 regex per rule
- **Key insight:** Visual builder handles common cases; text editor supports advanced nesting

### 3.4 Kubernetes Label Selectors

Native K8s supports:
- **Equality-based:** `=`, `==`, `!=`
- **Set-based:** `in`, `notin`, `exists`
- Used across Services, ReplicaSets, NetworkPolicies, node affinity

### 3.5 jQuery QueryBuilder (Reference Implementation)

Open-source standard for visual condition builders:
- `queryRule(field, operator, value)` and `queryGroup(..., condition)` functions
- Extensible operators, conditional rules, nested groups
- JSON serialization format widely adopted as de facto standard

---

## 4. Expression Language Design

### 4.1 Proposed Grammar

Based on research, a small safe expression language covering 95% of use cases:

**Fields:**
- `cluster`, `namespace`, `deployment`, `pod`, `service`, `node`
- `container_image`, `workload_name`
- `k8s.labels["<key>"]`, `k8s.annotations["<key>"]`

**Operators:**
- Equality: `==`, `!=`
- Pattern: `=~` (regex match), `!~` (regex not match)
- String: `contains`, `starts_with`, `ends_with`
- Set: `in`, `not_in`
- Existence: `exists()`, `!exists()`

**Logical:**
- `AND`, `OR`
- Parentheses for grouping

**Examples:**
```
k8s.labels["app"] == "checkout"
namespace =~ "^prod-.*"
(namespace == "payments" OR k8s.labels["team"] == "payments") AND cluster == "us-east-prod"
exists(k8s.labels["app"]) AND !exists(k8s.labels["owner"])
k8s.labels["env"] in ["prod", "production"]
deployment =~ "^api-(.*)$"
```

### 4.2 Safety Constraints

- No eval() — hand-written parser/evaluator
- Regex validation before execution (reject catastrophic backtracking patterns)
- Maximum expression length (4,096 chars)
- Maximum regex count per rule (10)
- Timeout on regex evaluation

---

## 5. UX Expectations

### 5.1 Rule Authoring

Two modes (like Cloudflare):
1. **Guided Builder** — form-based field/operator/value selection with AND/OR grouping
2. **Expression Editor** — text-based with syntax highlighting, validation, examples

Both modes should sync: editing in guided mode updates the expression, and vice versa.

### 5.2 Preview Before Apply

Before saving a rule, show:
- Matched workloads (table with current vs. proposed labels)
- Conflict detection (two rules → different labels; mapped vs. manual conflict)
- Coverage gaps (missing required Illumio dimensions)
- Affected policy scopes

### 5.3 Label Provenance Display

On workload detail, show:
- Each Illumio label with its source: `manual`, `mapping-rule`, `imported`, `unknown`
- Which specific rule assigned the label (clickable link)
- Completeness indicator: Role ✓, Application ✓, Environment ✗, Location ✗

### 5.4 Conflict Resolution

Configurable per-rule:
- Skip if label exists
- Overwrite mapped labels (but never manual)
- Highest-priority rule wins
- Flag for review

---

## 6. Assumptions

1. The prototype targets the PolicyExperience demo app — not production PCE integration.
2. We will model K8s workloads and their native labels using existing `workloads` + `labels` tables augmented with mapping-specific tables.
3. Expression parsing is server-side (shared evaluator for preview and apply).
4. The initial scope focuses on K8s → Illumio label mapping; cloud tag mapping is a future extension.
5. No real CNI telemetry — flow decoration uses mock data matching the existing seed pattern.

---

## 7. Proposed Terminology

| Term | Definition |
|------|-----------|
| **Mapping Rule** | A configurable rule that matches K8s workloads and assigns Illumio labels |
| **Source Condition** | The matching criteria (guided or expression-based) |
| **Target Mapping** | The Illumio label dimension + value to assign |
| **Value Mode** | How the target value is determined: static, copy-from-source, regex-capture, transform |
| **Conflict Behavior** | What happens when multiple rules produce different labels for the same workload |
| **Label Provenance** | The source of a label: manual, mapping-rule, imported |
| **Coverage** | The completeness of Illumio label assignment across K8s workloads |
| **Flow Decoration** | Enriching flow telemetry with Illumio labels on both endpoints |

---

## 8. Recommended Data Model

### New Tables

```sql
CREATE TABLE k8s_label_mapping_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  enabled INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 0,
  match_mode TEXT NOT NULL CHECK(match_mode IN ('guided', 'expression')),
  conditions TEXT DEFAULT '[]',          -- JSON: guided conditions [{field,operator,value}]
  condition_logic TEXT DEFAULT 'AND',    -- AND | OR for top-level guided conditions
  expression TEXT DEFAULT '',            -- raw expression string
  target_dimension TEXT NOT NULL,        -- role | app | env | loc
  target_value_mode TEXT NOT NULL CHECK(target_value_mode IN ('static','copy','regex_capture','transform')),
  target_value TEXT DEFAULT '',          -- static value
  target_source_field TEXT DEFAULT '',   -- field to copy from
  target_transform TEXT DEFAULT '',      -- transform: lowercase|uppercase|title_case|replace
  regex_pattern TEXT DEFAULT '',         -- regex for capture group extraction
  regex_capture_group INTEGER DEFAULT 0, -- which capture group (1-indexed)
  conflict_behavior TEXT DEFAULT 'skip' CHECK(conflict_behavior IN ('skip','overwrite_mapped','flag','priority_wins')),
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE workload_label_mappings (
  id TEXT PRIMARY KEY,
  workload_id TEXT NOT NULL REFERENCES workloads(id),
  rule_id TEXT NOT NULL REFERENCES k8s_label_mapping_rules(id),
  label_dimension TEXT NOT NULL,         -- role | app | env | loc
  label_value TEXT NOT NULL,
  provenance TEXT DEFAULT 'mapping-rule',
  conflict INTEGER DEFAULT 0,
  conflict_detail TEXT DEFAULT '',
  evaluated_at TEXT DEFAULT (datetime('now'))
);
```

### Augmented Existing Tables

- `workloads` — add `illumio_labels` JSON column for mapped Illumio labels (separate from K8s labels)

---

## 9. Recommended UX Flows

### Flow 1: Rule List (Label Mapping Dashboard)
- Coverage summary cards at top (total, mapped, unmapped, conflicts)
- Table of mapping rules with name, status, priority, target dimension, matched count, conflicts
- Create/Edit/Delete/Enable/Disable/Reorder actions

### Flow 2: Create/Edit Rule
1. Name + description
2. Match mode toggle: Guided Builder ↔ Expression Editor
3. Guided: field/operator/value rows with AND/OR, add/remove conditions
4. Expression: text input with syntax highlighting, validation, examples helper
5. Target mapping: dimension selector + value mode + value config
6. Conflict behavior selector
7. Preview button → shows matched workloads table
8. Save

### Flow 3: Preview
- Table: Workload | Cluster | Namespace | K8s Labels | Current Illumio Labels | Proposed Labels | Status
- Status: new mapping, conflict, already mapped, no match
- Summary counts: matched, conflicts, no-change

### Flow 4: Workload Detail Integration
- Existing workload detail page gets an "Illumio Labels" section
- Each label shows dimension, value, provenance badge (manual | mapping-rule | imported)
- Completeness indicator per dimension
- Link to the mapping rule that assigned each label

---

## 10. Recommended Implementation Plan

### Phase 1: Foundation (Backend + Rule Engine)
1. Database schema for mapping rules and evaluation results
2. Expression parser/evaluator (safe, no eval)
3. Guided condition evaluator
4. Regex validation and matching
5. Target label generation (static, copy, capture, transform)
6. Conflict detection
7. Server API routes (CRUD + preview + evaluate + coverage)
8. Seed data for rules

### Phase 2: Rule Management UI
1. Label Mapping list page with coverage dashboard
2. Create/Edit rule dialog or page
3. Guided builder component
4. Expression editor component
5. Rule preview flow
6. Enable/disable/delete actions

### Phase 3: Integration
1. Workload detail — Illumio labels with provenance
2. Policy authoring — mapped labels in scope/entity selectors
3. Show Impact — explain K8s workload matches via mapped labels

### Phase 4: Polish & Testing
1. Unit tests for parser/evaluator/conflict logic
2. E2E tests for CRUD and preview flows
3. Edge cases: empty regex groups, conflicting rules, disabled rules
