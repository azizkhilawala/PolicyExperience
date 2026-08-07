# Policy-v2: UX Enhancements

**Date:** 2026-08-07
**Context:** Incremental UX improvements to the existing Policy-v2 scope-centric policy authoring experience, based on PM feedback (Nick Sappa). The V2 feature is already built and deployed.

**Sources:**
- PM feedback from Nick Sappa (Slack, 2026-08-07)
- Existing PolicyExperience V2 codebase
- Existing Policy-v2 design spec (2026-08-04)

---

## Summary of Changes

1. Unified single-page create flow (replace 2-step dialog)
2. Multi-select scope selectors with relaxed hierarchy
3. Override Deny as third action type
4. Add Rule button repositioned and restyled
5. Rule type precedence filtering (SegmentedControl)
6. Ingress/egress direction visuals
7. Guardrail policies & template model (live-linked templates, template CRUD, convert-to-template)

---

## 1. Unified Create Flow

### Current Behavior

A 2-step dialog (`V2CreatePolicyDialog`): step 1 selects scope, step 2 enters name/description, then saves the policy and navigates to the detail page where rules are added separately.

### New Behavior

Replace the dialog with a **full-page creation experience** at `/policy-v2/new`. The page contains four zones, and a single "Create Policy" action saves everything — policy + all rules — in one transaction.

**Route:** `/policy-v2/new` → `V2CreatePolicyPage`

**Zone 1: Policy Info**
- `TextInput` for name (required)
- `TextArea` for description (optional)
- Displayed at the top of the page

**Zone 2: Scope Selection**
- Scope type `RadioList` (All Workloads, Labels [disabled], Kubernetes)
- Cascading K8s MultiSelectors (see section 2 below)

**Zone 3: Ingress Rules**
- Section heading with direction visual (see section 6)
- SegmentedControl filter (see section 5)
- `V2RuleTable` in "draft mode" — rules are held in local state, not persisted until the Create action
- `+ Add Rule` button (secondary style, left-aligned)

**Zone 4: Egress Rules**
- Same structure as Zone 3 for the egress direction

**Footer:**
- `Cancel` button (secondary) — navigates back to `/policy-v2`
- `Create Policy` button (primary) — validates name is present, then POSTs the policy and all draft rules in sequence: create policy → create each rule. On success, navigates to `/policy-v2/:id`.

**Files affected:**
- Create: `client/src/pages/V2CreatePolicyPage.tsx`
- Delete: `client/src/features/v2-rules/V2CreatePolicyDialog.tsx`
- Modify: `client/src/app/routes.tsx` (add `/policy-v2/new` route before `/:id`)
- Modify: `client/src/pages/V2PolicyListPage.tsx` (replace dialog open with `navigate('/policy-v2/new')`)
- Modify: `client/src/features/v2-rules/V2RuleTable.tsx` (support "draft mode" where rules are local-only)

### V2RuleTable Draft Mode

The rule table currently calls `createV2Rule` / `updateV2Rule` / `deleteV2Rule` against the API. For the create page, it needs a **draft mode** where:
- Rules are managed in local state (passed via props)
- Add/edit/delete/reorder modify the local array
- No API calls are made until the parent saves

Props change:

```typescript
interface V2RuleTableProps {
  policyId: string;
  direction: 'ingress' | 'egress';
  rules: V2Rule[];
  onRulesChanged: () => void;
  // New: draft mode props
  draftMode?: boolean;
  draftRules?: DraftRule[];
  onDraftRulesChange?: (rules: DraftRule[]) => void;
}

interface DraftRule {
  tempId: string;           // client-generated ID
  direction: 'ingress' | 'egress';
  entity: EndpointFilter[];
  services: V2RuleService[];
  action: 'allow' | 'deny' | 'override_deny';
  enabled: number;
}
```

When `draftMode` is true, the table uses `draftRules` and `onDraftRulesChange` instead of making API calls.

---

## 2. Multi-Select Scope with Relaxed Hierarchy

### Current Behavior

Single-select cascade: one cluster (required) → one namespace (required) → multiple labels (optional).

### New Behavior

All three become `MultiSelector` components. The cascade still flows downward, but **namespace and labels are optional** — only cluster is required for K8s scope.

- **Clusters** (required) — `MultiSelector`. Fetches from `GET /api/k8s/clusters`.
- **Namespaces** (optional) — `MultiSelector`. Fetches namespaces for all selected clusters. Disabled until at least one cluster is selected. Clearing clusters clears namespaces and labels.
- **K8s Labels** (optional) — `MultiSelector`. Fetches workload labels for all selected namespaces. Disabled until at least one namespace is selected. Clearing namespaces clears labels.

### Data Model Change

The `v2_policies` table columns change:

| Column | Old Type | New Type |
|--------|----------|----------|
| `scope_cluster_id` | `TEXT` (single FK) | Removed |
| `scope_namespace_id` | `TEXT` (single FK) | Removed |
| `scope_cluster_ids` | — | `TEXT NOT NULL DEFAULT '[]'` (JSON array of cluster IDs) |
| `scope_namespace_ids` | — | `TEXT NOT NULL DEFAULT '[]'` (JSON array of namespace IDs) |

`scope_labels` remains as-is (already a JSON array).

### API Changes

- `POST /api/v2/policies` and `PATCH /api/v2/policies/:id`: Accept `scope_cluster_ids` (string array) and `scope_namespace_ids` (string array) instead of the singular fields.
- `GET /api/v2/policies` and `GET /api/v2/policies/:id`: Return the new plural fields.
- `parseV2Policy` helper updates to JSON.parse the new array fields.

### Namespace Fetching

The existing `GET /api/k8s/namespaces?cluster_id=X` only accepts a single cluster ID. Add support for a comma-separated list: `GET /api/k8s/namespaces?cluster_ids=X,Y,Z`. The server splits on commas and returns namespaces matching any of the provided cluster IDs. The client fetches namespaces for all selected clusters in one call using this pattern.

### Detail Page Update

The scope display on `V2PolicyDetailPage` updates to show multiple clusters and namespaces as Token lists instead of single Text values.

---

## 3. Override Deny Action Type

### Current Behavior

Two action types: Allow and Deny. Stored as `action TEXT CHECK (action IN ('allow', 'deny'))`.

### New Behavior

Three action types with precedence:
1. **Deny** — lowest precedence
2. **Allow** — overrides deny
3. **Override Deny** — highest precedence, overrides allow

### Database Change

Update `v2_rules` table CHECK constraint:
```sql
action TEXT NOT NULL DEFAULT 'allow' CHECK (action IN ('allow', 'deny', 'override_deny'))
```

### UI Changes

**Selector options** in `V2RuleTable`:
```typescript
const actionOptions: SelectorOptionData[] = [
  { value: 'allow', label: 'Allow' },
  { value: 'deny', label: 'Deny' },
  { value: 'override_deny', label: 'Override Deny' },
];
```

**ActionToken styling:**
- Allow: green token (unchanged)
- Deny: red token (unchanged)
- Override Deny: dark red token (darker shade than Deny, using `var(--color-red-900)` or similar dark red token)

**TypeScript type update:**
```typescript
action: 'allow' | 'deny' | 'override_deny';
```

This affects `V2Rule`, `EditDraft`, `DraftRule`, and the `V2RuleTable` action column.

---

## 4. Add Rule Button Repositioning and Restyle

### Current Behavior

`+ Add Rule` button is right-aligned (`hAlign="end"`) above the table, using `variant="primary"`.

### New Behavior

- Move to **left-aligned** on the same row as the SegmentedControl filter (see section 5)
- Change to `variant="secondary"` so it does not compete with the page-level Provision CTA

Layout within each rule section:
```
[SegmentedControl: All|Allow|Deny|Override Deny]        [+ Add Rule (secondary)]
```

SegmentedControl is left-aligned, Add Rule is right-aligned, both on the same `HStack` row with `hAlign="between"`.

---

## 5. Rule Type Precedence Filtering

### New Behavior

Add a `SegmentedControl` filter under each ingress/egress section heading. Options:

- **All** — show all rules (default)
- **Allow** — show only `action === 'allow'`
- **Deny** — show only `action === 'deny'`
- **Override Deny** — show only `action === 'override_deny'`

**Implementation:** Client-side filtering only. A `filterAction` state in `V2RuleTable` filters the `tableData` array before passing to `<Table>`. No API changes.

**Layout in each section:**
```
Ingress Rules (Who can talk to me)  [direction visual]
[All] [Allow] [Deny] [Override Deny]        + Add Rule
┌──────────────────────────────────────────────────────┐
│  # | Entity | Service | Rule Type | Status | ...    │
```

The SegmentedControl sits on a row between the heading and the table, left-aligned. The Add Rule button is on the same row, right-aligned.

---

## 6. Ingress/Egress Direction Visuals

### New Behavior

Add a small inline visual next to each section heading showing traffic direction.

**Ingress:** Globe icon → arrow → cube/box icon (traffic coming in to the scope)
**Egress:** Cube/box icon → arrow → globe icon (traffic going out from the scope)

The visual uses a minimal style — two small icons with a directional arrow between them, no text labels. Rendered as a lightweight inline SVG component (`DirectionVisual`) that accepts a `direction` prop.

```tsx
<HStack gap={2} vAlign="center">
  <Heading level={2}>Ingress Rules (Who can talk to me)</Heading>
  <DirectionVisual direction="ingress" />
</HStack>
```

**Component:** `client/src/features/v2-rules/DirectionVisual.tsx`

The icons should be simple, monochrome, approximately 20-24px, using Astryx color tokens for the arrow and icons.

---

## Files Summary

### New Files
| File | Responsibility |
|------|----------------|
| `client/src/pages/V2CreatePolicyPage.tsx` | Unified single-page create flow |
| `client/src/features/v2-rules/DirectionVisual.tsx` | Inline ingress/egress direction icon |

### Modified Files
| File | Changes |
|------|---------|
| `server/src/db/schema.sql` | Update v2_policies columns (plural IDs), update v2_rules action CHECK |
| `server/src/db/seed.ts` | Update seed data for new column names |
| `server/src/routes/v2-policies.ts` | Handle plural scope fields, override_deny action, parseV2Policy update |
| `server/src/routes/k8s.ts` | Support multi-cluster namespace fetch |
| `client/src/api/v2-policies.ts` | Update V2Policy type (plural scope fields), V2Rule action type |
| `client/src/app/routes.tsx` | Add `/policy-v2/new` route |
| `client/src/pages/V2PolicyListPage.tsx` | Replace dialog with navigate to `/policy-v2/new` |
| `client/src/pages/V2PolicyDetailPage.tsx` | Display multi-cluster/namespace, direction visuals, filter controls |
| `client/src/features/v2-rules/V2RuleTable.tsx` | Draft mode, filter SegmentedControl, Add Rule restyle/reposition, override_deny support |
| `client/src/features/rules/ActionToken.tsx` | Add override_deny dark red style |

### Deleted Files
| File | Reason |
|------|--------|
| `client/src/features/v2-rules/V2CreatePolicyDialog.tsx` | Replaced by V2CreatePolicyPage |

---

## 7. Guardrail Policies & Template Model

### Concept

The current V2 model ties scope and rules together in one policy. Guardrail policies decouple these:

- **Template** = rules only (no scope). A reusable, editable rule set.
- **Guardrail Policy** = template reference + enforcement points. Many guardrail policies can share one template. Rules are live-linked — editing a template's rules propagates to all policies referencing it.
- **Standard Policy** = the existing scope-centric model (scope + rules together).

This decoupling allows a single set of rules to be enforced across many clusters without creating one rule per cluster.

**Use cases (from Nick Sappa, Anand, Romain, Kunal):**

1. A K8s admin defines a policy allowing ingress from namespace `illumio-cloud` to namespace `gke-dataplane-v2` across 100 GKE clusters — as a single Illumio policy.
2. A K8s admin defines a policy allowing egress from any workload in any namespace to `kube-dns` in `kube-system` across 300 clusters — as a single policy.

### Policy-v2 List Page — Tabbed View

The list page gets two tabs:

- **Policies** (default) — shows all policies (standard + guardrail). Guardrail policies display a "Guardrail" badge and their linked template name.
- **Templates** — shows the template library. Each row displays template name, source (Illumio Suggested / User Created), rule count, linked policy count, and actions.

Both tabs have their own Create button: "Create Policy" on the Policies tab, "Create Template" on the Templates tab.

### Data Model

**`v2_templates` table:**

```sql
CREATE TABLE v2_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  source TEXT NOT NULL DEFAULT 'user_created' CHECK (source IN ('illumio_suggested', 'user_created')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

**`v2_template_rules` table:**

```sql
CREATE TABLE v2_template_rules (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES v2_templates(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('ingress', 'egress')),
  entity TEXT NOT NULL DEFAULT '[]',
  services TEXT NOT NULL DEFAULT '[]',
  action TEXT NOT NULL DEFAULT 'allow' CHECK (action IN ('allow', 'deny', 'override_deny')),
  enabled INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT ''
);
```

**`v2_policies` table additions:**

```sql
policy_type TEXT NOT NULL DEFAULT 'standard' CHECK (policy_type IN ('standard', 'guardrail')),
template_id TEXT REFERENCES v2_templates(id)
```

- Standard policies: `policy_type = 'standard'`, `template_id = NULL`. Rules stored in `v2_rules` as today.
- Guardrail policies: `policy_type = 'guardrail'`, `template_id` references a template. Rules come from `v2_template_rules` via the template. `v2_rules` is not used for guardrail policies.

### API Changes

**Template endpoints** — mounted at `/api/v2/templates`:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v2/templates` | List all templates (with rule counts and linked policy counts) |
| `GET` | `/api/v2/templates/:id` | Get template with its rules |
| `POST` | `/api/v2/templates` | Create template |
| `PATCH` | `/api/v2/templates/:id` | Update template name/description |
| `DELETE` | `/api/v2/templates/:id` | Delete template (blocked if linked policies exist) |
| `GET` | `/api/v2/templates/:id/rules` | List template rules |
| `POST` | `/api/v2/templates/:id/rules` | Create template rule |
| `PATCH` | `/api/v2/template-rules/:id` | Update template rule |
| `DELETE` | `/api/v2/template-rules/:id` | Delete template rule |

**Policy endpoint changes:**
- `POST /api/v2/policies` accepts `policy_type` and `template_id` fields
- `GET /api/v2/policies/:id` — for guardrail policies, includes rules from the linked template (fetched via `template_id` join to `v2_template_rules`)

### Create Policy Page — Policy Type Selector

A `SegmentedControl` at the top of the create page: **Standard Policy** | **Guardrail Policy**.

**Standard Policy** (default):
- Current flow: scope selection + inline rule authoring

**Guardrail Policy:**
- **Zone 1: Policy Info** — Name, description (same as standard)
- **Zone 2: Template Selection** — `Selector` dropdown populated from `GET /api/v2/templates`. Selecting a template displays its rules in a read-only preview below.
- **Zone 3: Enforcement Points** — Multi-select scope using the same cascade selectors: clusters (required, multi), namespaces (optional, multi), K8s labels (optional, multi). Same selectors as standard policy scope, but labeled "Enforcement Points" instead of "Scope."
- No inline rule editing — rules come from the template.

**Footer:** Cancel + Create Policy (same as standard).

### Template Create/Edit Page

**Route:** `/policy-v2/templates/new` (create) and `/policy-v2/templates/:id/edit` (edit)

Same layout as the standard policy create page but without scope:

- **Zone 1: Template Info** — Name, description
- **Zone 2: Ingress Rules** — `V2RuleTable` with inline editing (uses draft mode for create, API mode for edit)
- **Zone 3: Egress Rules** — Same as Zone 2

**Footer:** Cancel + Create Template (or Save Template for edit).

### Template Detail Page

**Route:** `/policy-v2/templates/:id`

- **Header:** Template name, source badge (Illumio Suggested / User Created), Edit button, MoreMenu (Delete)
- **Linked Policies section:** List of guardrail policies using this template (name, enforcement points summary, clickable to navigate)
- **Ingress Rules section:** Read-only rule table
- **Egress Rules section:** Read-only rule table

### Guardrail Policy Detail Page

When viewing a guardrail policy (`policy_type === 'guardrail'`), the detail page differs from standard:

- **Scope section** displays enforcement points (clusters, namespaces, labels) instead of "Who am I"
- **Banner** above rules: "Rules managed by template: {template name}" with a link to the template detail page
- **Ingress/Egress rule tables** are **read-only** — no Add Rule, no inline editing, no MoreMenu on rows. Rules come from the template.
- **MoreMenu** on the policy includes "Edit Enforcement Points" but not "Edit Rules"

### Convert Policy to Template

A **"Convert to Template"** action in the MoreMenu of any standard policy. Flow:

1. User clicks "Convert to Template" on a standard policy's MoreMenu
2. A dialog appears:
   - `TextInput` for template name (pre-filled with policy name + " Template")
   - `TextArea` for description (optional)
   - Checkbox: "Convert this policy to a guardrail referencing the new template" (default: checked)
3. On confirm:
   - Creates a new template with the policy's rules copied to `v2_template_rules`
   - If checkbox is checked: updates the policy to `policy_type = 'guardrail'`, sets `template_id`, deletes the policy's `v2_rules` (now live-linked from template). The existing scope becomes enforcement points.
   - If unchecked: only creates the template, the original policy stays as-is.

### Delete Template — Guard

Deleting a template that has linked guardrail policies is blocked. The delete action shows an error: "Cannot delete template — {N} policies reference it. Remove or reassign those policies first."

### Seed Data

**Templates:**

1. **"DNS Egress Baseline"** (`illumio_suggested`)
   - Egress rule: Entity = kube-dns service in kube-system namespace, Service = UDP/53, Action = Allow

2. **"Monitoring Ingress Access"** (`illumio_suggested`)
   - Ingress rule: Entity = any workload with `role=prometheus`, Service = TCP/9090, Action = Allow
   - Ingress rule: Entity = any workload with `role=grafana`, Service = TCP/3000, Action = Allow

3. **"Production Deny External"** (`user_created`)
   - Egress rule: Entity = FQDN `*.external.com`, Service = All Services, Action = Deny

**Guardrail Policy:**

1. **"DNS Access — All Production Clusters"** (`policy_type = 'guardrail'`)
   - Template: DNS Egress Baseline
   - Enforcement points: clusters = [us-east-prod, eu-west-prod], namespaces = [], labels = []

### Files Summary (additions for section 7)

**New Files:**

| File | Responsibility |
|------|----------------|
| `client/src/api/v2-templates.ts` | API client functions for template endpoints |
| `client/src/pages/V2TemplateDetailPage.tsx` | Template detail page (rules, linked policies) |
| `client/src/pages/V2TemplateCreatePage.tsx` | Template create/edit page |
| `client/src/features/v2-rules/ConvertToTemplateDialog.tsx` | Convert policy to template dialog |
| `server/src/routes/v2-templates.ts` | Template API routes |

**Modified Files (in addition to section 1-6 changes):**

| File | Changes |
|------|---------|
| `server/src/db/schema.sql` | Add `v2_templates` and `v2_template_rules` tables, add `policy_type` and `template_id` to `v2_policies` |
| `server/src/db/seed.ts` | Add template and guardrail policy seed data |
| `server/src/index.ts` | Mount template routes |
| `client/src/app/routes.tsx` | Add template routes (`/policy-v2/templates/:id`, `/policy-v2/templates/new`, `/policy-v2/templates/:id/edit`) |
| `client/src/pages/V2PolicyListPage.tsx` | Add Policies/Templates tab view, template table |
| `client/src/pages/V2PolicyDetailPage.tsx` | Handle guardrail type (read-only rules, enforcement points, template banner) |
| `client/src/pages/V2CreatePolicyPage.tsx` | Add policy type selector, guardrail mode with template picker |
| `client/src/api/v2-policies.ts` | Add `policy_type` and `template_id` to V2Policy type |

---

## Pending Items (Future Specs)

### Policy Objects Management

A separate spec is needed to add full CRUD management for Illumio Policy Objects within the prototype. Priority objects: Services, IP Lists, Label Groups, and Virtual Services. Research has been completed and saved to `docs/research/illumio-policy-objects.md`. The spec, UX design, and implementation are pending.

### Direction Visuals — Icons & Illustration

The ingress/egress direction visual (section 6) needs icon and illustration design work. The current spec describes the conceptual layout (globe → arrow → cube for ingress, cube → arrow → globe for egress), but the specific icon style, illustration treatment, and Astryx-compatible SVG assets need to be designed. Nick shared initial ideas with two visual styles — the simpler arrow-only style was chosen. Final icon/illustration design is pending.
