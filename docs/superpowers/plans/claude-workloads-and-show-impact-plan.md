# Workloads & Show Impact Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Workloads product area (list + detail pages) and Show Impact workflows that reveal which workloads are affected by policy/rule changes. The workload data model expands from the minimal existing table to include managed status, enforcement mode, online state, VEN metadata, and OS information. Impact computation resolves label-based scope to concrete workload counts.

**Architecture:** Extended `workloads` table schema + enhanced seed data. New Express routes for full workload CRUD, label management, and impact computation. Client gets a typed API layer, two new pages (`/workloads` and `/workloads/:id`), and reusable Show Impact components integrated into existing policy workflows.

**Tech Stack:** React 19 + TypeScript strict, Astryx v0.2.0 design system (per-component subpath imports), Express 5, better-sqlite3, Vite, Vitest + RTL for unit tests, Playwright for e2e, MSW for test mocking

## Global Constraints

- Astryx design system imports MUST use per-component subpath pattern: `import { X } from '@astryxdesign/core/X'`
- All API functions use `apiFetch` from `client/src/api/client.ts`
- Fixed UUIDs in seed data follow existing `prefix-name-NNN` pattern
- `getDb()` from `server/src/db/connection.ts` is the only database accessor
- `AuthenticatedRequest` from `server/src/middleware/auth.ts` provides `req.user.id`
- Do NOT overwrite these 4 uncommitted files (ScopeSearch rewrite): `client/src/components/LabelTokens.tsx`, `client/src/components/ScopeSearch.tsx`, `client/src/components/ScopeSearch.test.tsx`, `server/src/db/seed.ts` — add to them only by appending/extending
- Do NOT run broad formatters
- Do NOT commit unless explicitly asked

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `server/src/db/schema.sql` | Modify | Add columns to `workloads` table |
| `server/src/db/seed.ts` | Modify | Extend workload seed data with new fields |
| `server/src/routes/workloads.ts` | Modify | Expand to full workload API (list, detail, label update, bulk, summary) |
| `server/src/routes/impact.ts` | Create | Impact computation endpoint |
| `server/src/index.ts` | Modify | Mount `/api/impact` router |
| `client/src/api/workloads.ts` | Create | Typed workload API functions |
| `client/src/api/impact.ts` | Create | Impact computation API function |
| `client/src/pages/WorkloadListPage.tsx` | Create | Workloads list page |
| `client/src/pages/WorkloadDetailPage.tsx` | Create | Workload detail page |
| `client/src/features/workloads/WorkloadFilters.tsx` | Create | Filter bar for workloads list |
| `client/src/features/workloads/WorkloadLabelEditor.tsx` | Create | Label editing panel |
| `client/src/features/workloads/BulkLabelDialog.tsx` | Create | Bulk label assignment dialog |
| `client/src/features/impact/ImpactPreview.tsx` | Create | Inline workload count badge |
| `client/src/features/impact/ImpactDrawer.tsx` | Create | Slide-out panel with impacted workload list |
| `client/src/app/routes.tsx` | Modify | Add `/workloads` and `/workloads/:id` routes |
| `client/src/app/App.tsx` | Modify | Add "Workloads" SideNav item |
| `client/src/components/ProductVisuals.tsx` | Modify | Add workloads-related illustrations |
| `server/src/routes/workloads.test.ts` | Create | API tests for workload endpoints |
| `server/src/lib/impact.ts` | Create | Label matching logic (shared between routes) |
| `server/src/lib/impact.test.ts` | Create | Unit tests for label matching |
| `client/src/features/impact/ImpactPreview.test.tsx` | Create | Component test for impact preview |
| `e2e/workloads.spec.ts` | Create | E2e smoke tests for workloads pages |
| `e2e/impact.spec.ts` | Create | E2e tests for show impact flow |

---

### Task 1: Database Schema Extension

**Files:**
- Modify: `server/src/db/schema.sql`

**Interfaces:**
- Consumes: existing `workloads` table definition
- Produces: extended `workloads` table with new columns

- [ ] **Step 1: Add new columns to workloads table**

Replace the existing `workloads` table definition with:

```sql
CREATE TABLE IF NOT EXISTS workloads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  hostname TEXT NOT NULL,
  ip TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('vm', 'k8s_pod')),
  labels TEXT NOT NULL DEFAULT '[]',
  cluster_id TEXT REFERENCES k8s_clusters(id),
  namespace_id TEXT REFERENCES k8s_namespaces(id),
  managed INTEGER NOT NULL DEFAULT 1,
  online INTEGER NOT NULL DEFAULT 1,
  enforcement_mode TEXT NOT NULL DEFAULT 'visibility_only'
    CHECK (enforcement_mode IN ('idle', 'visibility_only', 'selective', 'full')),
  os_type TEXT DEFAULT NULL
    CHECK (os_type IS NULL OR os_type IN ('linux', 'windows')),
  os_detail TEXT DEFAULT '',
  ven_version TEXT DEFAULT NULL,
  ven_status TEXT DEFAULT 'active'
    CHECK (ven_status IN ('active', 'suspended', 'stopped', 'uninstalled')),
  last_heartbeat_at TEXT DEFAULT NULL,
  public_ip TEXT DEFAULT NULL,
  data_center TEXT DEFAULT '',
  service_provider TEXT DEFAULT ''
    CHECK (service_provider IN ('', 'aws', 'azure', 'gcp', 'on-prem')),
  description TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT '2026-07-28T10:00:00Z',
  updated_at TEXT NOT NULL DEFAULT '2026-07-28T10:00:00Z'
);
```

---

### Task 2: Extend Seed Data

**Files:**
- Modify: `server/src/db/seed.ts`

**Interfaces:**
- Consumes: existing workload seed structure, new schema columns
- Produces: enriched workload seed data with managed/online/enforcement/os/ven fields

- [ ] **Step 1: Update insertWorkload prepared statement**

Change the INSERT to include all new columns:
```sql
INSERT INTO workloads (id, name, hostname, ip, type, labels, cluster_id, namespace_id,
  managed, online, enforcement_mode, os_type, os_detail, ven_version, ven_status,
  last_heartbeat_at, public_ip, data_center, service_provider, description,
  created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

- [ ] **Step 2: Enrich existing VM seed data**

Update the HRM/ERP/CRM VM arrays to include realistic values for new fields. Distribution:
- Most VMs: managed=1, online=1, enforcement_mode='full', os_type='linux'
- 2-3 VMs: enforcement_mode='visibility_only' (recent additions)
- 1-2 VMs: online=0 (offline)
- 1 VM per app: os_type='windows' (Windows server)
- VEN versions: mix of '25.2.5' and '24.5.12'
- Data centers: 'us-east-dc1', 'us-west-dc2', 'eu-west-dc1'
- Service providers: 'aws', 'azure', 'on-prem'

- [ ] **Step 3: Enrich existing K8s pod seed data**

Update pods to include:
- managed=1, online=1 (all pods managed)
- enforcement_mode: 'full' for prod, 'visibility_only' for staging
- os_type='linux' (all containers)
- ven_version: '25.2.5' (Kubelink version)

- [ ] **Step 4: Add 3-5 unmanaged workloads**

Add new workloads representing:
- External payment gateway (unmanaged, ip only)
- Legacy mainframe (unmanaged, no VEN)
- Partner API endpoint (unmanaged)

```typescript
const unmanagedWorkloads = [
  { name: 'payment-gateway-ext', hostname: 'gateway.stripe.com', ip: '198.51.100.1',
    type: 'vm', labels: [{key: 'role', value: 'payment-gateway'}, {key: 'type', value: 'external'}],
    managed: 0, online: 0, enforcement: 'idle', description: 'External payment processor' },
  { name: 'mainframe-legacy-01', hostname: 'mainframe.corp.internal', ip: '10.0.0.50',
    type: 'vm', labels: [{key: 'app', value: 'ERP'}, {key: 'role', value: 'db'}, {key: 'env', value: 'prod'}],
    managed: 0, online: 1, enforcement: 'idle', description: 'Legacy IBM mainframe' },
  { name: 'partner-api-acme', hostname: 'api.acme-partner.com', ip: '203.0.113.10',
    type: 'vm', labels: [{key: 'role', value: 'api'}, {key: 'type', value: 'external'}],
    managed: 0, online: 0, enforcement: 'idle', description: 'ACME partner API endpoint' },
];
```

---

### Task 3: Label Matching Library

**Files:**
- Create: `server/src/lib/impact.ts`
- Create: `server/src/lib/impact.test.ts`

**Interfaces:**
- Consumes: workload label arrays, scope label arrays
- Produces: `matchesScope(workloadLabels, scopeLabels): boolean` and `computeImpact(db, scopeLabels): ImpactResult`

- [ ] **Step 1: Create impact.ts with label matching logic**

```typescript
interface LabelPair { key: string; value: string }
interface ImpactResult {
  total: number;
  workloads: Array<{ id: string; name: string; hostname: string; labels: LabelPair[]; type: string; enforcement_mode: string }>;
  by_label: Record<string, Record<string, number>>;
}

export function matchesScope(workloadLabels: LabelPair[], scopeLabels: LabelPair[]): boolean
export function computeImpact(db: Database, scopeLabels: LabelPair[]): ImpactResult
```

Match logic: a workload matches when, for EVERY scope label, the workload has a label with the same key AND value. Empty scope matches all workloads.

- [ ] **Step 2: Write unit tests for label matching**

Test cases:
- Empty scope → matches all
- Single label match → true
- Single label mismatch (wrong value) → false
- Multi-label all match → true
- Multi-label partial match → false
- Workload with extra labels beyond scope → true (scope is subset)
- No labels on workload, non-empty scope → false

---

### Task 4: Server API Routes

**Files:**
- Modify: `server/src/routes/workloads.ts`
- Create: `server/src/routes/impact.ts`
- Modify: `server/src/index.ts`

**Interfaces:**
- Consumes: `getDb()`, `AuthenticatedRequest`, `matchesScope`/`computeImpact` from impact.ts
- Produces: REST endpoints

- [ ] **Step 1: Expand workloads.ts**

**`GET /api/workloads`** — Enhanced list:
- Query params: `search` (name/hostname), `type`, `managed`, `online`, `enforcement_mode`, `label_key`, `label_value`, `page`, `limit`
- Returns: `{ data: Workload[], total: number, page: number, limit: number }`
- All rows parse `labels` JSON
- Default limit: 50

**`GET /api/workloads/:id`** — Full detail:
- Returns single workload with all fields + parsed labels
- 404 if not found

**`PATCH /api/workloads/:id/labels`** — Update labels:
- Body: `{ labels: [{key, value}] }`
- Validates one label per dimension
- Updates `updated_at`
- Returns updated workload

**`POST /api/workloads/bulk-labels`** — Bulk label update:
- Body: `{ workload_ids: string[], labels: [{key, value}], mode: 'merge' | 'replace' }`
- `merge`: adds/overwrites labels for specified dimensions, preserves others
- `replace`: replaces entire label array
- Returns `{ updated: number }`

**`GET /api/workloads/label-summary`** — Label distribution:
- Returns: `{ [key: string]: { [value: string]: number } }`
- Example: `{ "app": { "HRM": 10, "ERP": 10, "CRM": 10 }, "env": { "prod": 25, "dev": 3 } }`

- [ ] **Step 2: Create impact.ts route**

**`POST /api/impact/compute`** — Impact computation:
- Body: `{ scope_labels: [{key, value}], policy_id?: string }`
- Uses `computeImpact` from lib
- Returns: `{ total: number, workloads: Workload[], by_label: {...} }`

- [ ] **Step 3: Mount impact router in index.ts**

Add `import impactRoutes from './routes/impact.js'` and `app.use('/api/impact', impactRoutes)`.

---

### Task 5: Client API Layer

**Files:**
- Create: `client/src/api/workloads.ts`
- Create: `client/src/api/impact.ts`

**Interfaces:**
- Consumes: `apiFetch` from client.ts
- Produces: typed API functions matching server endpoints

- [ ] **Step 1: Create workloads.ts**

Types:
```typescript
export interface Workload {
  id: string;
  name: string;
  hostname: string;
  ip: string;
  type: 'vm' | 'k8s_pod';
  labels: Array<{ key: string; value: string }>;
  cluster_id: string | null;
  namespace_id: string | null;
  managed: boolean;
  online: boolean;
  enforcement_mode: 'idle' | 'visibility_only' | 'selective' | 'full';
  os_type: 'linux' | 'windows' | null;
  os_detail: string;
  ven_version: string | null;
  ven_status: 'active' | 'suspended' | 'stopped' | 'uninstalled';
  last_heartbeat_at: string | null;
  public_ip: string | null;
  data_center: string;
  service_provider: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface WorkloadListResponse {
  data: Workload[];
  total: number;
  page: number;
  limit: number;
}

export interface LabelSummary {
  [key: string]: { [value: string]: number };
}
```

Functions:
- `fetchWorkloads(params?)` → `WorkloadListResponse`
- `fetchWorkload(id)` → `Workload`
- `updateWorkloadLabels(id, labels)` → `Workload`
- `bulkUpdateLabels(ids, labels, mode)` → `{ updated: number }`
- `fetchLabelSummary()` → `LabelSummary`

- [ ] **Step 2: Create impact.ts**

```typescript
export interface ImpactResult {
  total: number;
  workloads: Workload[];
  by_label: { [key: string]: { [value: string]: number } };
}

export function computeImpact(scopeLabels: Array<{key: string; value: string}>, policyId?: string): Promise<ImpactResult>
```

---

### Task 6: Workload List Page

**Files:**
- Create: `client/src/pages/WorkloadListPage.tsx`
- Create: `client/src/features/workloads/WorkloadFilters.tsx`
- Modify: `client/src/app/routes.tsx`
- Modify: `client/src/app/App.tsx`

**Interfaces:**
- Consumes: workloads API, Astryx components
- Produces: `/workloads` route, SideNav item

- [ ] **Step 1: Create WorkloadFilters.tsx**

Filter bar with:
- `TextInput` for search (name/hostname)
- `Select` for type (All, VM, K8s Pod)
- `Select` for managed status (All, Managed, Unmanaged)
- `Select` for online status (All, Online, Offline)
- `Select` for enforcement mode (All, Idle, Visibility Only, Selective, Full)

- [ ] **Step 2: Create WorkloadListPage.tsx**

Layout:
- Page header: "Workloads" title with count badge and label summary chips
- WorkloadFilters bar
- Table with columns:
  - Name (link to detail)
  - Hostname
  - Type (VM/K8s Pod token)
  - Labels (LabelTokens component, max 4 visible)
  - Status (StatusDot: green=online+managed, yellow=online+unmanaged, red=offline)
  - Enforcement Mode (Token: idle=gray, visibility=blue, selective=orange, full=green)
  - Actions (view detail)
- Pagination controls
- Empty state when no workloads match filters
- Bulk actions toolbar: appears when rows selected, offers "Edit Labels" → BulkLabelDialog

- [ ] **Step 3: Add route in routes.tsx**

Add lazy import for `WorkloadListPage` and `WorkloadDetailPage`:
```tsx
{ path: '/workloads', element: <WorkloadListPage /> },
{ path: '/workloads/:id', element: <WorkloadDetailPage /> },
```

- [ ] **Step 4: Add SideNav item in App.tsx**

Add between Objects and Audit Log:
```tsx
{ label: 'Workloads', href: '/workloads', icon: 'box', selected: pathname.startsWith('/workloads') }
```

Use the existing `workload` icon from ProductVisuals (`Box` from lucide-react).

---

### Task 7: Workload Detail Page

**Files:**
- Create: `client/src/pages/WorkloadDetailPage.tsx`
- Create: `client/src/features/workloads/WorkloadLabelEditor.tsx`

**Interfaces:**
- Consumes: workloads API, impact API, Astryx components
- Produces: `/workloads/:id` page with label editor and policy reverse lookup

- [ ] **Step 1: Create WorkloadLabelEditor.tsx**

A panel showing current labels as tokens with:
- Each label dimension as a row: key → value (editable via Select)
- "Add Label" button to add a new dimension
- Save/Cancel buttons
- Uses `fetchLabels()` to populate available values per key

- [ ] **Step 2: Create WorkloadDetailPage.tsx**

Layout:
- Breadcrumb: Workloads > {name}
- Header: workload name, status dot, enforcement mode token
- Two-column layout:
  - Left: Properties card (hostname, IP, type, OS, VEN version, data center, etc.)
  - Right: Labels card with WorkloadLabelEditor
- Below: "Policies Affecting This Workload" section
  - Query policies and V2 policies whose scope labels match this workload's labels
  - List as linked rows showing policy name, scope, status

---

### Task 8: Bulk Label Dialog

**Files:**
- Create: `client/src/features/workloads/BulkLabelDialog.tsx`

**Interfaces:**
- Consumes: workloads API (bulkUpdateLabels), labels API
- Produces: dialog for bulk label assignment

- [ ] **Step 1: Create BulkLabelDialog.tsx**

Dialog with:
- Header: "Edit Labels for {count} Workloads"
- Mode toggle: Merge (add/update dimensions) vs Replace (overwrite all)
- Label editor: dimension select + value select, repeatable
- Warning banner for Replace mode
- Submit calls `bulkUpdateLabels` and refreshes list

---

### Task 9: Show Impact Components

**Files:**
- Create: `client/src/features/impact/ImpactPreview.tsx`
- Create: `client/src/features/impact/ImpactDrawer.tsx`

**Interfaces:**
- Consumes: impact API, Astryx components
- Produces: reusable impact display components

- [ ] **Step 1: Create ImpactPreview.tsx**

A compact inline component that:
- Takes `scopeLabels: Array<{key, value}>` as prop
- Calls `computeImpact(scopeLabels)` on mount/change (debounced)
- Displays: `Token` with count (e.g., "12 workloads") + clickable to open drawer
- Loading state: skeleton token
- Zero state: "No workloads matched"

- [ ] **Step 2: Create ImpactDrawer.tsx**

A `Drawer` component that:
- Takes `scopeLabels` and `isOpen`/`onClose` props
- Shows header: "Impacted Workloads ({count})"
- Body: scrollable list of impacted workloads with name, labels, type, enforcement mode
- Label breakdown section: by_label summary as grouped counts
- Footer: "Close" button

---

### Task 10: Integrate Impact Into Policy Workflows

**Files:**
- Integrate into existing policy detail and rule editor components

- [ ] **Step 1: Add ImpactPreview to V2 policy detail page header**

In the V2 policy detail page, add an `ImpactPreview` next to the scope display. Pass the policy's `scope_labels` as the scope.

- [ ] **Step 2: Add ImpactPreview to V1 policy detail page header**

In the V1 policy detail page, add an `ImpactPreview` next to the scope display. Pass the policy's `scope` labels.

- [ ] **Step 3: Add ImpactPreview to provision preview**

In the provision preview dialog/panel, show an `ImpactPreview` summarizing how many workloads will be affected by the provisioning action.

---

### Task 11: ProductVisuals Extensions

**Files:**
- Modify: `client/src/components/ProductVisuals.tsx`

- [ ] **Step 1: Add workloads illustration**

Add a `workloads` illustration type showing multiple workload icons:
```typescript
workloads: { /* workload(accent) + label(secondary) + service(tertiary) */ }
```

---

### Task 12: Unit Tests

**Files:**
- Create: `server/src/lib/impact.test.ts`
- Create: `client/src/features/impact/ImpactPreview.test.tsx`

- [ ] **Step 1: Impact matching unit tests**

Test `matchesScope`:
- Empty scope → matches all
- Single label exact match → true
- Single label mismatch → false
- Multi-label all match → true
- Multi-label partial → false
- Superset workload labels → true
- Empty workload labels, non-empty scope → false

- [ ] **Step 2: ImpactPreview component test**

Test:
- Renders loading state initially
- Shows workload count after API resolves
- Shows "No workloads matched" for empty result
- Debounces API calls on rapid scope changes

---

### Task 13: E2E Tests

**Files:**
- Create: `e2e/workloads.spec.ts`
- Create: `e2e/impact.spec.ts`

- [ ] **Step 1: Workloads page e2e tests**

Tests:
- Navigate to /workloads, see table with workloads
- Filter by type (VM), verify filtered results
- Filter by enforcement mode
- Search by name
- Click workload row → navigate to detail page
- Verify detail page shows properties and labels
- Verify "Policies Affecting This Workload" section

- [ ] **Step 2: Impact e2e tests**

Tests:
- Navigate to a V2 policy detail
- Verify ImpactPreview shows workload count
- Click impact preview → drawer opens with workload list
- Verify drawer shows label breakdown

---

### Task 14: Accessibility

- [ ] **Step 1: Run axe-core on new pages**

Ensure workloads list and detail pages pass accessibility checks:
- Table has proper headers and ARIA roles
- Status dots have accessible labels
- Filter controls have labels
- Drawer has proper focus management

---

### Task 15: Validation

- [ ] **Step 1: Build check**
```bash
npm run build
```

- [ ] **Step 2: Unit tests**
```bash
npm run test:unit
```

- [ ] **Step 3: E2E tests**
```bash
npm run test:e2e
```
