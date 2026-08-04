# Policy-v2: Kubernetes Scope-Centric Policy Authoring

**Date:** 2026-08-04
**Context:** New product concept exploring a scope-centric policy model where scope is the central object. Rules are expressed as Ingress ("who can talk to me") and Egress ("who can I talk to") relative to that scope, instead of repeating source/destination on every rule.

**Sources:**
- Confluence: Policy Authoring Resource Types & Selectors (page 480875486)
- Confluence: NP Expression Scenarios (page 481168733)
- Existing PolicyExperience v1 codebase (parallel module, shared infrastructure)

---

## Core Concept

In v1, every rule has explicit source and destination endpoints. In v2, the **policy scope IS the identity** — it defines "who am I." Rules then only need a direction (ingress/egress) and an entity (the other side):

- **Ingress rule:** scope = destination (implicit), entity = source (explicit)
- **Egress rule:** scope = source (implicit), entity = destination (explicit)

This eliminates scope repetition across rules and makes the policy's identity the foundational decision.

---

## Data Model

### `v2_policies` Table

```sql
CREATE TABLE v2_policies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  scope_type TEXT NOT NULL CHECK (scope_type IN ('all_workloads', 'labels', 'k8s')),
  scope_cluster_id TEXT REFERENCES k8s_clusters(id),
  scope_namespace_id TEXT REFERENCES k8s_namespaces(id),
  scope_labels TEXT NOT NULL DEFAULT '[]',
  enabled INTEGER NOT NULL DEFAULT 1,
  provision_status TEXT NOT NULL DEFAULT 'draft' CHECK (provision_status IN ('draft', 'provisioned')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

- `scope_type` discriminates which scope path was chosen at creation
- `scope_cluster_id` and `scope_namespace_id` are null for non-K8s scopes
- `scope_labels` is a JSON array of `{key, value}` for K8s workload labels selected during scope creation
- `provision_status` is a simple toggle (no diff/preview/history — concept exploration only)

### `v2_rules` Table

```sql
CREATE TABLE v2_rules (
  id TEXT PRIMARY KEY,
  policy_id TEXT NOT NULL REFERENCES v2_policies(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('ingress', 'egress')),
  entity TEXT NOT NULL DEFAULT '[]',
  services TEXT NOT NULL DEFAULT '[]',
  action TEXT NOT NULL DEFAULT 'allow' CHECK (action IN ('allow', 'deny')),
  enabled INTEGER NOT NULL DEFAULT 1,
  provision_status TEXT NOT NULL DEFAULT 'draft' CHECK (provision_status IN ('draft', 'provisioned')),
  position INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT ''
);
```

- `direction` replaces v1's implicit source/destination — ingress means "traffic coming to scope," egress means "traffic leaving scope"
- `entity` stores `EndpointFilter[]` JSON (same format as v1's `RuleEndpoint.filters`), representing the "other side" of the rule
- `services` stores `V2RuleService[]` JSON (see Service Editor section)
- No source/destination columns — scope is the implicit "me" side

### TypeScript Types

```typescript
interface V2Policy {
  id: string;
  name: string;
  description: string;
  scope_type: 'all_workloads' | 'labels' | 'k8s';
  scope_cluster_id: string | null;
  scope_namespace_id: string | null;
  scope_labels: Array<{ key: string; value: string }>;
  enabled: number;
  provision_status: 'draft' | 'provisioned';
  created_by: string;
  created_at: string;
  updated_at: string;
  rules?: V2Rule[];
}

interface V2Rule {
  id: string;
  policy_id: string;
  direction: 'ingress' | 'egress';
  entity: EndpointFilter[];
  services: V2RuleService[];
  action: 'allow' | 'deny';
  enabled: number;
  provision_status: 'draft' | 'provisioned';
  position: number;
  notes: string;
}

type V2RuleService =
  | { type: 'named'; name: string }
  | { type: 'port'; protocol: string; port: string };
```

---

## API Routes

### Policies — `/api/v2/policies`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v2/policies` | List all v2 policies |
| `GET` | `/api/v2/policies/:id` | Get single policy with its rules |
| `POST` | `/api/v2/policies` | Create policy |
| `PATCH` | `/api/v2/policies/:id` | Update policy fields |
| `DELETE` | `/api/v2/policies/:id` | Delete policy |
| `POST` | `/api/v2/policies/:id/provision` | Set provision_status to 'provisioned' for policy + all its draft rules |

### Rules — `/api/v2/rules`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v2/policies/:id/rules` | List rules, optional `?direction=ingress\|egress` filter |
| `POST` | `/api/v2/policies/:id/rules` | Create rule |
| `PATCH` | `/api/v2/rules/:id` | Update rule |
| `DELETE` | `/api/v2/rules/:id` | Delete rule |

All existing resource APIs (`/api/k8s/clusters`, `/api/k8s/namespaces`, `/api/workloads`, `/api/ip-lists`, `/api/label-groups`, etc.) are reused as-is.

Server implementation: single new file `server/src/routes/v2-policies.ts`.

---

## Client Architecture

### Routes

| Path | Page | Description |
|------|------|-------------|
| `/policy-v2` | `V2PolicyListPage` | Table of v2 policies + Create button |
| `/policy-v2/:id` | `V2PolicyDetailPage` | Scope header + ingress/egress rule tables |

### SideNav

New item between "Policies" and "Settings":

```tsx
<SideNavItem
  label="Policy-v2"
  href="/policy-v2"
  isSelected={location.pathname.startsWith('/policy-v2')}
  icon={<Icon icon="funnel" />}
/>
```

### New Files

| File | Responsibility |
|------|----------------|
| `pages/V2PolicyListPage.tsx` | Policy table, Create Policy button, delete via kebab |
| `pages/V2PolicyDetailPage.tsx` | Scope header, ingress/egress rule sections |
| `features/v2-rules/V2CreatePolicyDialog.tsx` | 2-step dialog: scope selection → policy details |
| `features/v2-rules/V2RuleTable.tsx` | Rule table with inline editing (shared for ingress/egress) |
| `features/v2-rules/V2EntityEditor.tsx` | PowerSearch wrapper for entity expression building |
| `features/v2-rules/V2ServiceEditor.tsx` | Service picker (named services + port/range) |
| `features/v2-rules/v2EndpointConfig.ts` | PowerSearch field config builder for entity selector |
| `api/v2-policies.ts` | API client functions for v2 endpoints |

### Reused from v1

- `StatusIndicator`, `ProvisionBadge`, `ActionToken` — shared components
- `useApi`, `useAuth`, `useLabels` — shared hooks
- `endpointDisplay.ts` — `getFilterColor`, `fieldLabel`, `getDisplayValue` for rendering entity tokens
- Astryx component imports follow the same subpath pattern

---

## Create Policy Dialog

### Step 1 — Select Policy Scope

Three radio-card options using Astryx `RadioGroup`:

1. **All Workloads** — "Baseline rules apply everywhere." Stores `scope_type: 'all_workloads'`. Selectable but non-functional placeholder (proceeds with no scope fields).
2. **Specific Labels / Groups** — "Scope by App + Env labels, label groups." Stores `scope_type: 'labels'`. Selectable but non-functional placeholder (shows disabled "Coming soon" message).
3. **Kubernetes Cluster / Namespace** — "Scope by cluster, namespace, and K8s labels." This is the functional path.

### K8s Scope Selection (when option 3 is selected)

Three cascading selectors in an `HStack` with equal-width `StackItem`s:

- **Cluster** — `Selector` (single-select). Populated from `GET /api/k8s/clusters`.
- **Namespace** — `Selector` (single-select). Populated from `GET /api/k8s/namespaces?cluster_id=X`. Disabled until cluster is selected.
- **K8s Labels** — `Selector` (multi-select). Populated by extracting unique `{key, value}` pairs from `GET /api/workloads?namespace_id=X`. Disabled until namespace is selected.

Selecting a cluster filters namespaces. Selecting a namespace filters available K8s labels. For the labels endpoint, the existing `/api/workloads` route gets a `?namespace_id=X` query param filter, and the client extracts unique labels from the response.

### Step 2 — Policy Details

- **Policy Name** — `TextField`, required
- **Policy Description** — `TextField`, optional
- Footer: **Back** button, **Create Policy** button (primary, disabled until name entered)

On create: `POST /api/v2/policies`, then navigate to `/policy-v2/:id`.

---

## Policy Detail Page

### Zone 1: Header

- Breadcrumbs: `Policy-v2 > {Policy Name}`
- `Heading` with policy name, `ProvisionBadge`, `StatusIndicator`
- Right side: **Provision** button (sets policy + all draft rules to 'provisioned') and `MoreMenu` (Edit, Enable/Disable, Delete)

### Zone 2: Scope Display — "Who am I"

Read-only `MetadataList` showing the selected scope:

- **K8s scope**: Cluster = "{name}", Namespace = "{name}", K8s Labels = "{key=value, ...}"
- **All Workloads**: "All Workloads"
- **Labels scope**: "Labels (placeholder)"

Section title includes "(Who am I)" to reinforce the scope-centric model.

### Zone 3: Ingress & Egress Rule Sections

Two sections, each with a heading and **+ Add Rule** button:

- **Ingress Rules (Who can talk to me)**
- **Egress Rules (Who can I talk to)**

Both use `V2RuleTable` parameterized by `direction`.

#### Rule Table Columns

| Column | Width | Read-only | Edit mode |
|--------|-------|-----------|-----------|
| **#** | 50px | Row number | Row number |
| **Entity** | proportional(3) | Colored tokens from EndpointFilter display | `V2EntityEditor` (PowerSearch) |
| **Service** | proportional(1.5) | "TCP/443" or service name | `V2ServiceEditor` |
| **Rule Type** | 100px | `ActionToken` (green Allow / red Deny) | `SegmentedControl` (Allow/Deny) |
| **Status** | 100px | `StatusIndicator` | `StatusIndicator` |
| **Provision** | 110px | `ProvisionBadge` | `ProvisionBadge` |
| **⋮** | 50px | `MoreMenu` | — |

#### MoreMenu Items

- Edit — switches row to inline edit mode
- Disable / Enable — toggles `enabled`
- Delete — removes rule

#### Inline Editing

- **+ Add Rule** appends a new row in edit mode at the bottom
- **Edit** from MoreMenu switches an existing row to edit mode
- Edit mode replaces Entity, Service, and Rule Type cells with their editors
- **Save / Cancel** buttons appear below the editing row

---

## Entity Editor (PowerSearch)

### PowerSearch Field Groups

| Group | Field | Operators | Value Type |
|-------|-------|-----------|------------|
| **Labels** | Illumio Labels (Role, App, Env, Loc, etc.) | `is`, `is_not`, `is_any_of`, `is_none_of`, `exists`, `does_not_exist` | enum / enum_list / empty |
| **Labels** | Label Group | `is`, `is_not` | entity_list |
| **Kubernetes** | K8s Labels (per key: app, tier, version, etc.) | `is`, `is_not`, `is_any_of`, `is_none_of`, `exists`, `does_not_exist` | enum / enum_list / empty |
| **Kubernetes** | Service Account | `is`, `is_not`, `is_any_of`, `is_none_of` | string_list |
| **Kubernetes** | K8s Service (egress only) | `is`, `is_not` | string |
| **Kubernetes** | Ingress (egress only) | `is`, `is_not` | string |
| **Kubernetes** | Gateway (egress only) | `is`, `is_not` | string |
| **Network** | IP List | `is`, `is_not`, `is_any_of`, `is_none_of` | entity_list |
| **Network** | FQDN (egress only) | `matches`, `does_not_match` | enum (with suggestions) |

### Direction Awareness

- **Ingress entity** = "who is talking to me" = source-like → no K8s Service, Ingress, Gateway, FQDN fields
- **Egress entity** = "who am I talking to" = destination-like → includes K8s Service, Ingress, Gateway, FQDN fields

This mirrors the Confluence source/destination asymmetry.

### Expression → Filter Mapping

| Confluence Expression | Stored EndpointFilter |
|----------------------|----------------------|
| `app=frontend` | `{field: "k8s_pod_app", operator: "is", value: {type: "enum", value: "frontend"}}` |
| `app!=v1` | `{field: "k8s_pod_app", operator: "is_not", value: {type: "enum", value: "v1"}}` |
| `tier in [db,cache]` | `{field: "k8s_pod_tier", operator: "is_any_of", value: {type: "enum_list", value: ["db","cache"]}}` |
| `env notin [dev,staging]` | `{field: "k8s_pod_env", operator: "is_none_of", value: {type: "enum_list", value: ["dev","staging"]}}` |
| `app=*` (exists) | `{field: "k8s_pod_app", operator: "exists", value: {type: "empty"}}` |
| `!canary` (does not exist) | `{field: "k8s_pod_canary", operator: "does_not_exist", value: {type: "empty"}}` |
| `Role is web` (Illumio label) | `{field: "label_role", operator: "is", value: {type: "enum", value: "web"}}` |

Reuses the same `EndpointFilter` type and display utilities from v1.

### Config Builder

`v2EndpointConfig.ts` builds a `PowerSearchConfig` from:
- Illumio labels via `useLabels()` hook
- Label groups via `fetchLabelGroups()`
- K8s pod labels derived from workload data
- IP lists via `fetchIpLists()`
- FQDN suggestions (static enum values)
- Direction param to include/exclude egress-only fields

Slimmer than v1's `endpointConfig.ts` — no cluster, namespace, cloud, workload, user group, or virtual service fields.

---

## Service Editor

### Two Modes (Tabs)

**Tab 1: Policy Services**
- Searchable list from `virtual_services` table
- **"All Services"** option at top (stores `{type: "named", name: "All Services"}`)
- **"Add a new service"** action at bottom → switches to Tab 2

**Tab 2: Port / Port Range**
- **Protocol** — `SegmentedControl` (TCP / UDP)
- **Port** — `TextField` accepting single port (`443`) or range (`8080-8090`)
- **Add** button to confirm

### Storage Format

```typescript
type V2RuleService =
  | { type: 'named'; name: string }
  | { type: 'port'; protocol: string; port: string }
```

### Display

- Named: service name ("Payment API")
- Port: "TCP/443" or "UDP/53" or "TCP/8080-8090"
- All Services: "All Services"

---

## Seed Data

### Policy 1: "Payments Frontend Access"

- **Scope:** K8s, cluster=us-east-prod, namespace=payments, labels=[{key: "app", value: "frontend"}]
- **Ingress rules:**
  1. Entity: `k8s_pod_app is api` + `k8s_pod_tier is web` → Service: TCP/443 → Allow → Provisioned
  2. Entity: `ip_list is VPN Gateway` → Service: TCP/8080 → Allow → Draft
- **Egress rules:**
  1. Entity: `k8s_pod_app is backend` + `k8s_pod_role is api` → Service: TCP/3000 → Allow → Provisioned
  2. Entity: FQDN matches `*.amazonaws.com` → Service: TCP/443 → Allow → Draft

### Policy 2: "Monitoring Stack"

- **Scope:** K8s, cluster=us-east-prod, namespace=monitoring, labels=[{key: "role", value: "api"}]
- **Ingress rules:**
  1. Entity: `label_role is_any_of [web, api, worker]` → Service: TCP/9090 → Allow → Provisioned
- **Egress rules:**
  1. Entity: `k8s_pod_app is_any_of [frontend, backend]` → Service: All Services → Allow → Draft
  2. Entity: FQDN matches `api.github.com` → Service: TCP/443 → Allow → Draft

### Policy 3: "Backend Services Deny"

- **Scope:** K8s, cluster=us-east-prod, namespace=backend-services, labels=[{key: "tier", value: "web"}, {key: "env", value: "production"}]
- **Ingress rules:**
  1. Entity: `k8s_pod_env is_none_of [production]` → Service: TCP/5432 → Deny → Provisioned
- **Egress rules:**
  1. Entity: FQDN matches `api.stripe.com` → Service: TCP/443 → Allow → Provisioned

### Coverage

- Multiple ingress + egress rules per policy
- Illumio labels in entity (Policy 2 ingress)
- K8s pod labels with various operators (is, is_any_of, is_none_of)
- IP lists (Policy 1 ingress)
- FQDNs (Policy 1, 2, 3 egress)
- Allow + Deny mix (Policy 3)
- Draft + Provisioned mix across rules

---

## Backend Changes

### Schema

Add `v2_policies` and `v2_rules` tables to `server/src/db/schema.sql`.

### Seed

Add v2 seed data to `server/src/db/seed.ts` using the existing cluster, namespace, and IP list IDs.

### Routes

New file `server/src/routes/v2-policies.ts` mounted at `/api/v2` in `server/src/index.ts`.

### Workloads Filter

Add `?namespace_id=X` query param support to the existing `/api/workloads` route in `server/src/routes/resources.ts` for the cascading scope selector.

---

## Astryx Component Usage

All components use per-component subpath imports. No barrel imports. No `<div>` or `<span>` for layout.

Key components:
- `AppShell`, `SideNav`, `SideNavItem` — nav integration
- `Dialog` — Create Policy dialog
- `RadioGroup` — scope type selection
- `Selector` — cascading cluster/namespace/label pickers
- `Table` — policy list and rule tables
- `PowerSearch` — entity editor
- `SegmentedControl` — rule type (Allow/Deny), service protocol (TCP/UDP)
- `TextField` — policy name, description, port entry
- `Button`, `MoreMenu`, `DropdownMenu` — actions
- `Token`, `StatusDot` — status display
- `MetadataList` — scope display
- `Breadcrumbs` — navigation
- `HStack`, `VStack`, `StackItem` — layout
- `Heading`, `Text`, `Divider`, `Banner`, `Spinner`, `EmptyState` — content

Verify each component's props with `npx astryx component <Name>` before use.
