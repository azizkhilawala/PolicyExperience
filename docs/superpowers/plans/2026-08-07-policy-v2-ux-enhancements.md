# Policy-v2: UX Enhancements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the existing Policy-v2 scope-centric policy authoring experience with a unified create flow, multi-select scope, override deny action, rule filtering, direction visuals, and a guardrail policies/templates model.

**Architecture:** Incremental modifications to the existing V2 feature module. Backend changes extend the SQLite schema (new columns on `v2_policies`/`v2_rules`, new `v2_templates`/`v2_template_rules` tables) and add new route files. Frontend changes replace the create dialog with a full-page create flow, extend `V2RuleTable` with draft mode and action filtering, and add template management pages. The guardrail model introduces templates (reusable rule sets) that policies can reference.

**Tech Stack:** React 18 + TypeScript strict, Astryx v0.2.0 (per-component subpath imports), Express 5 + better-sqlite3, Vite dev proxy.

## Global Constraints

- All Astryx imports MUST use per-component subpath: `import { X } from '@astryxdesign/core/X'`. No barrel imports.
- No `<div>` or `<span>` for layout — use Astryx layout components (HStack, VStack, StackItem).
- Run `npx astryx component <Name>` before using any component to verify exact prop names.
- Known Astryx corrections: `Button` uses `onClick` (not `onPress`), `PowerSearchFilter` uses `field`/`operator` (not `fieldKey`/`operatorKey`), `Banner` uses `status` (not `variant`), `HStack` uses `vAlign="start"` (not `alignItems`), `Selector` uses `renderOption` for custom option rendering (SelectorOption has no `description` prop).
- All server routes follow the pattern in `server/src/routes/v2-policies.ts` — Router, `getDb()`, JSON.parse for stored JSON columns.
- Client API functions follow pattern in `client/src/api/v2-policies.ts` — `apiFetch<T>()` wrapper.
- Working directory: `PolicyExperience/`.

---

### Task 1: Backend — Schema Migration, Override Deny, Multi-Select Scope

**Files:**
- Modify: `server/src/db/schema.sql` (lines 153-179 — update v2_policies columns, v2_rules action CHECK)
- Modify: `server/src/routes/v2-policies.ts` (update parseV2Policy, POST/PATCH/GET handlers for plural scope fields and override_deny)
- Modify: `server/src/routes/k8s.ts` (add `cluster_ids` comma-separated query param support)
- Modify: `server/src/db/seed.ts` (lines 604-723 — update seed data for plural scope columns)

**Interfaces:**
- Consumes: existing `k8s_clusters`, `k8s_namespaces`, `users` tables and seed UUID constants (`CLUSTER_USEAST`, `CLUSTER_EUWEST`, `NS_PAYMENTS`, etc.)
- Produces:
  - Updated `v2_policies` table: replaces `scope_cluster_id TEXT` and `scope_namespace_id TEXT` with `scope_cluster_ids TEXT NOT NULL DEFAULT '[]'` and `scope_namespace_ids TEXT NOT NULL DEFAULT '[]'` (JSON arrays)
  - Updated `v2_rules` table: action CHECK now includes `'override_deny'`
  - Updated `v2_policies` table: adds `policy_type TEXT NOT NULL DEFAULT 'standard'` and `template_id TEXT` columns (for Task 7)
  - `GET /api/v2/policies` and `GET /api/v2/policies/:id` return `scope_cluster_ids: string[]` and `scope_namespace_ids: string[]`
  - `POST /api/v2/policies` accepts `scope_cluster_ids`, `scope_namespace_ids`, `policy_type`, `template_id`
  - `GET /api/k8s/namespaces?cluster_ids=X,Y,Z` returns namespaces matching any cluster ID
  - For guardrail policies (`policy_type === 'guardrail'`), `GET /api/v2/policies/:id` returns rules from `v2_template_rules` via `template_id` join

- [ ] **Step 1: Update v2_policies table in schema.sql**

Replace the `v2_policies` table definition (lines 153-166 of `server/src/db/schema.sql`) with:

```sql
CREATE TABLE IF NOT EXISTS v2_policies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  scope_type TEXT NOT NULL CHECK (scope_type IN ('all_workloads', 'labels', 'k8s')),
  scope_cluster_ids TEXT NOT NULL DEFAULT '[]',
  scope_namespace_ids TEXT NOT NULL DEFAULT '[]',
  scope_labels TEXT NOT NULL DEFAULT '[]',
  enabled INTEGER NOT NULL DEFAULT 1,
  provision_status TEXT NOT NULL DEFAULT 'draft' CHECK (provision_status IN ('draft', 'provisioned')),
  policy_type TEXT NOT NULL DEFAULT 'standard' CHECK (policy_type IN ('standard', 'guardrail')),
  template_id TEXT REFERENCES v2_templates(id),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

- [ ] **Step 2: Update v2_rules action CHECK in schema.sql**

Replace the `v2_rules` table definition (lines 168-179 of `server/src/db/schema.sql`) with:

```sql
CREATE TABLE IF NOT EXISTS v2_rules (
  id TEXT PRIMARY KEY,
  policy_id TEXT NOT NULL REFERENCES v2_policies(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('ingress', 'egress')),
  entity TEXT NOT NULL DEFAULT '[]',
  services TEXT NOT NULL DEFAULT '[]',
  action TEXT NOT NULL DEFAULT 'allow' CHECK (action IN ('allow', 'deny', 'override_deny')),
  enabled INTEGER NOT NULL DEFAULT 1,
  provision_status TEXT NOT NULL DEFAULT 'draft' CHECK (provision_status IN ('draft', 'provisioned')),
  position INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT ''
);
```

- [ ] **Step 3: Add v2_templates and v2_template_rules tables to schema.sql**

Append after the `v2_rules` table (these must come BEFORE `v2_policies` in the file since `v2_policies.template_id` references `v2_templates` — move the `v2_templates` CREATE TABLE before `v2_policies`, or use a simpler approach: remove the FK constraint on `template_id` since SQLite doesn't enforce FKs by default). The simpler approach:

Append at the end of `schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS v2_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  source TEXT NOT NULL DEFAULT 'user_created' CHECK (source IN ('illumio_suggested', 'user_created')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS v2_template_rules (
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

And remove the FK constraint on `template_id` in `v2_policies` — just use `template_id TEXT` without the REFERENCES clause (SQLite doesn't enforce FKs by default, and the table ordering issue makes this cleaner).

- [ ] **Step 4: Update parseV2Policy in v2-policies.ts**

In `server/src/routes/v2-policies.ts`, replace the `parseV2Policy` function (line 8-11):

```typescript
function parseV2Policy(row: any) {
  if (!row) return null;
  return {
    ...row,
    scope_cluster_ids: JSON.parse(row.scope_cluster_ids),
    scope_namespace_ids: JSON.parse(row.scope_namespace_ids),
    scope_labels: JSON.parse(row.scope_labels),
  };
}
```

- [ ] **Step 5: Update POST /policies in v2-policies.ts**

Replace the POST handler (lines 35-48) to accept the new plural scope fields and template fields:

```typescript
router.post('/policies', (req, res) => {
  const db = getDb();
  const { name, description, scope_type, scope_cluster_ids, scope_namespace_ids, scope_labels, policy_type, template_id } = req.body;
  if (!name || !scope_type) return res.status(400).json({ error: 'name and scope_type are required' });
  const user = (req as AuthenticatedRequest).user;
  const now = new Date().toISOString();
  const id = uuidv4();
  db.prepare(
    `INSERT INTO v2_policies (id, name, description, scope_type, scope_cluster_ids, scope_namespace_ids, scope_labels, enabled, provision_status, policy_type, template_id, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'draft', ?, ?, ?, ?, ?)`
  ).run(id, name, description ?? '', scope_type, JSON.stringify(scope_cluster_ids ?? []), JSON.stringify(scope_namespace_ids ?? []), JSON.stringify(scope_labels ?? []), policy_type ?? 'standard', template_id ?? null, user.id, now, now);
  const created = db.prepare('SELECT * FROM v2_policies WHERE id = ?').get(id);
  res.status(201).json(parseV2Policy(created));
});
```

- [ ] **Step 6: Update GET /policies/:id to handle guardrail policies**

Replace the GET /:id handler (lines 26-32):

```typescript
router.get('/policies/:id', (req, res) => {
  const db = getDb();
  const policy = db.prepare('SELECT * FROM v2_policies WHERE id = ?').get(req.params.id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });
  const parsed = parseV2Policy(policy) as any;
  if (parsed.policy_type === 'guardrail' && parsed.template_id) {
    const templateRules = db.prepare('SELECT * FROM v2_template_rules WHERE template_id = ? ORDER BY direction, position').all(parsed.template_id);
    parsed.rules = templateRules.map(parseV2Rule);
  } else {
    const rules = db.prepare('SELECT * FROM v2_rules WHERE policy_id = ? ORDER BY direction, position').all(req.params.id);
    parsed.rules = rules.map(parseV2Rule);
  }
  res.json(parsed);
});
```

- [ ] **Step 7: Add multi-cluster namespace support to k8s.ts**

In `server/src/routes/k8s.ts`, update the GET /namespaces handler (lines 11-19) to support `cluster_ids` comma-separated param alongside the existing `cluster_id`:

```typescript
router.get('/namespaces', (req, res) => {
  const db = getDb();
  let sql = 'SELECT * FROM k8s_namespaces WHERE 1=1';
  const params: string[] = [];
  if (req.query.cluster_id) {
    sql += ' AND cluster_id = ?';
    params.push(req.query.cluster_id as string);
  } else if (req.query.cluster_ids) {
    const ids = (req.query.cluster_ids as string).split(',').filter(Boolean);
    if (ids.length > 0) {
      sql += ` AND cluster_id IN (${ids.map(() => '?').join(',')})`;
      params.push(...ids);
    }
  }
  sql += ' ORDER BY name';
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map((r: any) => ({ ...r, labels: JSON.parse(r.labels) })));
});
```

- [ ] **Step 8: Update seed data for plural scope columns**

In `server/src/db/seed.ts`, replace the `insertV2Policy` prepared statement (lines 605-608) and all three `.run()` calls (lines 611-636):

```typescript
  const insertV2Policy = db.prepare(`
    INSERT INTO v2_policies
      (id, name, description, scope_type, scope_cluster_ids, scope_namespace_ids, scope_labels, enabled, provision_status, policy_type, template_id, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertV2Policy.run(
    V2_POLICY_PAYMENTS,
    'Payments Frontend Access',
    'Controls ingress/egress for the payments frontend scope',
    'k8s', JSON.stringify([CLUSTER_USEAST]), JSON.stringify([NS_PAYMENTS]),
    JSON.stringify([{ key: 'app', value: 'frontend' }]),
    1, 'draft', 'standard', null, USER_ALEX, now, now
  );

  insertV2Policy.run(
    V2_POLICY_MONITORING,
    'Monitoring Stack',
    'Monitoring scope for API role workloads',
    'k8s', JSON.stringify([CLUSTER_USEAST]), JSON.stringify([NS_MONITORING]),
    JSON.stringify([{ key: 'role', value: 'api' }]),
    1, 'draft', 'standard', null, USER_ALEX, now, now
  );

  insertV2Policy.run(
    V2_POLICY_BACKEND,
    'Backend Services Deny',
    'Deny non-production access to backend services',
    'k8s', JSON.stringify([CLUSTER_USEAST]), JSON.stringify([NS_BACKEND]),
    JSON.stringify([{ key: 'tier', value: 'web' }, { key: 'env', value: 'production' }]),
    1, 'provisioned', 'standard', null, USER_MORGAN, now, now
  );
```

- [ ] **Step 9: Verify backend**

Run:
```bash
cd PolicyExperience && npm run seed -w server
```
Expected: Seed completes with `v2_policies: 3`, `v2_rules: 10`.

Run TypeScript check:
```bash
cd PolicyExperience/server && npx tsc --noEmit
```
Expected: clean

- [ ] **Step 10: Commit**

```bash
git add server/src/db/schema.sql server/src/db/seed.ts server/src/routes/v2-policies.ts server/src/routes/k8s.ts
git commit -m "feat(v2): add multi-select scope, override_deny action, template tables, and guardrail policy support"
```

---

### Task 2: Client API Types + Override Deny ActionToken + fetchNamespaces Multi-Cluster

**Files:**
- Modify: `client/src/api/v2-policies.ts` (update V2Policy and V2Rule types, update createV2Policy signature)
- Modify: `client/src/api/policies.ts` (update fetchNamespaces to support comma-separated cluster_ids)
- Modify: `client/src/features/rules/ActionToken.tsx` (add override_deny style)

**Interfaces:**
- Consumes: updated backend API from Task 1
- Produces:
  - `V2Policy.scope_cluster_ids: string[]`, `V2Policy.scope_namespace_ids: string[]` (replacing singular fields)
  - `V2Policy.policy_type: 'standard' | 'guardrail'`, `V2Policy.template_id: string | null`
  - `V2Rule.action: 'allow' | 'deny' | 'override_deny'`
  - `ActionToken` accepts `action: 'allow' | 'deny' | 'override_deny'` and renders dark red for override_deny
  - `fetchNamespaces(clusterIds?: string[])` accepts an array and joins with commas for the `cluster_ids` param

- [ ] **Step 1: Update V2Policy type in v2-policies.ts**

Replace the `V2Rule` interface (lines 8-19):

```typescript
export interface V2Rule {
  id: string;
  policy_id: string;
  direction: 'ingress' | 'egress';
  entity: EndpointFilter[];
  services: V2RuleService[];
  action: 'allow' | 'deny' | 'override_deny';
  enabled: number;
  provision_status: 'draft' | 'provisioned';
  position: number;
  notes: string;
}
```

Replace the `V2Policy` interface (lines 21-35):

```typescript
export interface V2Policy {
  id: string;
  name: string;
  description: string;
  scope_type: 'all_workloads' | 'labels' | 'k8s';
  scope_cluster_ids: string[];
  scope_namespace_ids: string[];
  scope_labels: Array<{ key: string; value: string }>;
  enabled: number;
  provision_status: 'draft' | 'provisioned';
  policy_type: 'standard' | 'guardrail';
  template_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  rules?: V2Rule[];
}
```

- [ ] **Step 2: Update createV2Policy signature**

Replace `createV2Policy` function (lines 45-57):

```typescript
export function createV2Policy(data: {
  name: string;
  description?: string;
  scope_type: V2Policy['scope_type'];
  scope_cluster_ids?: string[];
  scope_namespace_ids?: string[];
  scope_labels?: Array<{ key: string; value: string }>;
  policy_type?: 'standard' | 'guardrail';
  template_id?: string;
}) {
  return apiFetch<V2Policy>('/api/v2/policies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
```

- [ ] **Step 3: Update createV2Rule and updateV2Rule action types**

Replace `createV2Rule` (lines 79-89):

```typescript
export function createV2Rule(policyId: string, data: {
  direction: 'ingress' | 'egress';
  entity?: EndpointFilter[];
  services?: V2RuleService[];
  action?: 'allow' | 'deny' | 'override_deny';
}) {
  return apiFetch<V2Rule>(`/api/v2/policies/${policyId}/rules`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
```

Replace `updateV2Rule` (lines 91-102):

```typescript
export function updateV2Rule(ruleId: string, data: Partial<{
  entity: EndpointFilter[];
  services: V2RuleService[];
  action: 'allow' | 'deny' | 'override_deny';
  enabled: boolean;
  notes: string;
}>) {
  return apiFetch<V2Rule>(`/api/v2/rules/${ruleId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
```

- [ ] **Step 4: Update fetchNamespaces to support multi-cluster**

In `client/src/api/policies.ts`, replace `fetchNamespaces` (around line 72-74):

```typescript
export function fetchNamespaces(clusterIdOrIds?: string | string[]) {
  let query = '';
  if (Array.isArray(clusterIdOrIds)) {
    query = clusterIdOrIds.length > 0 ? `?cluster_ids=${clusterIdOrIds.join(',')}` : '';
  } else if (clusterIdOrIds) {
    query = `?cluster_id=${clusterIdOrIds}`;
  }
  return apiFetch<K8sNamespace[]>(`/api/k8s/namespaces${query}`);
}
```

- [ ] **Step 5: Update ActionToken for override_deny**

Replace the contents of `client/src/features/rules/ActionToken.tsx`:

```typescript
import { Token } from '@astryxdesign/core/Token';

interface ActionTokenProps {
  action: 'allow' | 'deny' | 'override_deny';
  size?: 'sm' | 'md' | 'lg';
}

const ACTION_CONFIG: Record<string, { label: string; color: string; style?: React.CSSProperties }> = {
  allow: { label: 'Allow', color: 'green' },
  deny: { label: 'Deny', color: 'red' },
  override_deny: { label: 'Override Deny', color: 'red', style: { background: 'var(--color-red-900)', color: 'var(--color-white)' } },
};

export function ActionToken({ action, size = 'sm' }: ActionTokenProps) {
  const config = ACTION_CONFIG[action] ?? ACTION_CONFIG.allow;
  return (
    <Token
      label={config.label}
      color={config.color}
      size={size}
      style={config.style}
    />
  );
}
```

- [ ] **Step 6: Verify**

Run:
```bash
cd PolicyExperience/client && npx tsc --noEmit
```
Expected: clean. Fix any type errors from the V2Policy field renames (scope_cluster_id → scope_cluster_ids, etc.).

- [ ] **Step 7: Commit**

```bash
git add client/src/api/v2-policies.ts client/src/api/policies.ts client/src/features/rules/ActionToken.tsx
git commit -m "feat(v2): update client types for multi-select scope, override_deny, and guardrail model"
```

---

### Task 3: V2RuleTable — Draft Mode, Override Deny, Action Filter, Add Rule Restyle

**Files:**
- Modify: `client/src/features/v2-rules/V2RuleTable.tsx`

**Interfaces:**
- Consumes:
  - Updated `V2Rule` type with `action: 'allow' | 'deny' | 'override_deny'` from Task 2
  - `ActionToken` with override_deny support from Task 2
  - `V2EntityEditor`, `V2ServiceEditor` (unchanged from current)
  - `createV2Rule`, `updateV2Rule`, `deleteV2Rule` from `api/v2-policies.ts`
  - `EndpointFilter` from `api/policies.ts`
  - `SegmentedControl` from `@astryxdesign/core/SegmentedControl`
- Produces:
  - Updated props interface with optional `draftMode`, `draftRules`, `onDraftRulesChange`, `readOnly`
  - `DraftRule` type exported for use by create page
  - SegmentedControl filter for action type (All / Allow / Deny / Override Deny)
  - Add Rule button moved to left-aligned secondary style on same row as filter
  - When `draftMode=true`, all CRUD operates on local state via `onDraftRulesChange` — no API calls
  - When `readOnly=true`, no Add Rule button, no MoreMenu, no edit mode

- [ ] **Step 1: Update V2RuleTable props and add DraftRule type**

Replace the top section of `V2RuleTable.tsx` (lines 1-43) with:

```typescript
import { useState, useCallback, useMemo } from 'react';
import { Table } from '@astryxdesign/core/Table';
import { proportional, pixel } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Token } from '@astryxdesign/core/Token';
import { Text } from '@astryxdesign/core/Text';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Button } from '@astryxdesign/core/Button';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Selector } from '@astryxdesign/core/Selector';
import type { SelectorOptionData } from '@astryxdesign/core/Selector';
import { SegmentedControl } from '@astryxdesign/core/SegmentedControl';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Banner } from '@astryxdesign/core/Banner';

import type { V2Rule, V2RuleService } from '../../api/v2-policies.js';
import { createV2Rule, updateV2Rule, deleteV2Rule } from '../../api/v2-policies.js';
import type { EndpointFilter } from '../../api/policies.js';
import { getFilterColor, getDisplayValue } from '../rules/endpointDisplay.js';
import { ActionToken } from '../rules/ActionToken.js';
import { V2EntityEditor } from './V2EntityEditor.js';
import { V2ServiceEditor } from './V2ServiceEditor.js';

export interface DraftRule {
  tempId: string;
  direction: 'ingress' | 'egress';
  entity: EndpointFilter[];
  services: V2RuleService[];
  action: 'allow' | 'deny' | 'override_deny';
  enabled: number;
}

interface V2RuleTableProps {
  policyId: string;
  direction: 'ingress' | 'egress';
  rules: V2Rule[];
  onRulesChanged: () => void;
  draftMode?: boolean;
  draftRules?: DraftRule[];
  onDraftRulesChange?: (rules: DraftRule[]) => void;
  readOnly?: boolean;
}

interface EditDraft {
  entity: EndpointFilter[];
  services: V2RuleService[];
  action: 'allow' | 'deny' | 'override_deny';
}

type V2RuleRow = (V2Rule | (DraftRule & { id: string })) & Record<string, unknown>;

const actionOptions: SelectorOptionData[] = [
  { value: 'allow', label: 'Allow' },
  { value: 'deny', label: 'Deny' },
  { value: 'override_deny', label: 'Override Deny' },
];

const filterOptions = [
  { value: 'all', label: 'All' },
  { value: 'allow', label: 'Allow' },
  { value: 'deny', label: 'Deny' },
  { value: 'override_deny', label: 'Override Deny' },
];
```

- [ ] **Step 2: Update renderEntityTokens and renderServiceTokens**

Keep `renderEntityTokens` and `renderServiceTokens` exactly as they are (lines 45-70 in current file). No changes needed.

- [ ] **Step 3: Update the component body — state, handlers, filter**

Replace the component function body (from `export function V2RuleTable` through the end) with the full implementation. Key changes from the current version:

1. Add `filterAction` state: `const [filterAction, setFilterAction] = useState<string>('all');`
2. All handler functions check `draftMode` — if true, manipulate `draftRules` via `onDraftRulesChange` instead of calling API functions
3. Draft mode `handleAddRule`: generates a `tempId` with `crypto.randomUUID()`, appends to `draftRules`, enters edit mode
4. Draft mode `handleSaveEdit`: updates the draft rule in the local array
5. Draft mode `handleDelete`: filters the draft rule from the local array
6. `tableData` applies `filterAction` filter before passing to Table
7. The Add Rule button moves into an HStack with the SegmentedControl filter:

```tsx
{!readOnly && (
  <HStack hAlign="between" vAlign="center">
    <SegmentedControl
      label="Filter by action"
      isLabelHidden
      options={filterOptions}
      value={filterAction}
      onChange={setFilterAction}
      size="sm"
    />
    <Button label="+ Add Rule" variant="secondary" size="sm" onClick={handleAddRule} />
  </HStack>
)}
```

8. When `readOnly` is true, the Actions column renders nothing, and no Add Rule button is shown
9. The `tableData` memo applies the action filter:

```typescript
const tableData: V2RuleRow[] = useMemo(() => {
  const source = draftMode
    ? (draftRules ?? []).map((r, i) => ({ ...r, id: r.tempId, position: i } as V2RuleRow))
    : rules.map((r) => r as V2RuleRow);
  if (filterAction === 'all') return source;
  return source.filter((r) => (r as any).action === filterAction);
}, [draftMode, draftRules, rules, filterAction]);
```

- [ ] **Step 4: Verify**

Run:
```bash
cd PolicyExperience/client && npx tsc --noEmit
```
Expected: clean

- [ ] **Step 5: Commit**

```bash
git add client/src/features/v2-rules/V2RuleTable.tsx
git commit -m "feat(v2): add draft mode, override_deny, action filter, and add-rule restyle to V2RuleTable"
```

---

### Task 4: Direction Visual Component

**Files:**
- Create: `client/src/features/v2-rules/DirectionVisual.tsx`

**Interfaces:**
- Consumes: nothing external
- Produces: `DirectionVisual` component with props `{ direction: 'ingress' | 'egress' }` — renders an inline SVG visual showing traffic direction (globe → arrow → box for ingress, box → arrow → globe for egress)

- [ ] **Step 1: Create DirectionVisual.tsx**

Create `client/src/features/v2-rules/DirectionVisual.tsx`:

```typescript
import { HStack } from '@astryxdesign/core/HStack';

interface DirectionVisualProps {
  direction: 'ingress' | 'egress';
}

function GlobeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="8" stroke="var(--color-gray-600)" strokeWidth="1.5" fill="none" />
      <ellipse cx="10" cy="10" rx="4" ry="8" stroke="var(--color-gray-600)" strokeWidth="1.2" fill="none" />
      <line x1="2" y1="10" x2="18" y2="10" stroke="var(--color-gray-600)" strokeWidth="1.2" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="14" height="14" rx="2" stroke="var(--color-blue-600)" strokeWidth="1.5" fill="var(--color-blue-100)" />
      <line x1="10" y1="3" x2="10" y2="17" stroke="var(--color-blue-600)" strokeWidth="1" opacity="0.4" />
      <line x1="3" y1="10" x2="17" y2="10" stroke="var(--color-blue-600)" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="24" height="12" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="0" y1="6" x2="18" y2="6" stroke="var(--color-gray-500)" strokeWidth="1.5" />
      <polyline points="15,2 20,6 15,10" stroke="var(--color-gray-500)" strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function DirectionVisual({ direction }: DirectionVisualProps) {
  if (direction === 'ingress') {
    return (
      <HStack gap={0.5} vAlign="center">
        <GlobeIcon />
        <ArrowIcon />
        <BoxIcon />
      </HStack>
    );
  }
  return (
    <HStack gap={0.5} vAlign="center">
      <BoxIcon />
      <ArrowIcon />
      <GlobeIcon />
    </HStack>
  );
}
```

- [ ] **Step 2: Verify**

Run:
```bash
cd PolicyExperience/client && npx tsc --noEmit
```
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add client/src/features/v2-rules/DirectionVisual.tsx
git commit -m "feat(v2): add DirectionVisual inline SVG component for ingress/egress"
```

---

### Task 5: Unified Create Policy Page + Route + List Page Update

**Files:**
- Create: `client/src/pages/V2CreatePolicyPage.tsx`
- Modify: `client/src/app/routes.tsx` (add `/policy-v2/new` route)
- Modify: `client/src/pages/V2PolicyListPage.tsx` (replace dialog with navigate to `/policy-v2/new`, update ScopeTokens for plural scope fields)

**Interfaces:**
- Consumes:
  - `createV2Policy`, `createV2Rule`, `V2Policy` from `api/v2-policies.ts` (Task 2)
  - `DraftRule` from `V2RuleTable` (Task 3)
  - `V2RuleTable` with `draftMode` from Task 3
  - `DirectionVisual` from Task 4
  - `fetchClusters`, `fetchNamespaces` from `api/policies.ts`
  - `apiFetch` from `api/client.ts`
  - `RadioList`, `RadioListItem`, `TextInput`, `TextArea`, `Selector`, `Button`, `Banner`, `Heading`, `HStack`, `VStack`, `StackItem`, `Breadcrumbs`, `BreadcrumbItem`, `SegmentedControl` from Astryx
- Produces:
  - `/policy-v2/new` page with unified create flow (policy info + multi-select scope + draft ingress/egress rules + single Create action)
  - Updated list page navigating to `/policy-v2/new` instead of opening dialog

- [ ] **Step 1: Create V2CreatePolicyPage.tsx**

Create `client/src/pages/V2CreatePolicyPage.tsx`. The page has four zones:

**Zone 1: Policy Info** — TextInput for name (required), TextArea for description (optional).

**Zone 2: Scope Selection** — RadioList (All Workloads, Labels [disabled], Kubernetes). For K8s: three MultiSelector components in an HStack:
- Clusters (required): `Selector` with `isMulti`, options from `fetchClusters()`
- Namespaces (optional): `Selector` with `isMulti`, options from `fetchNamespaces(selectedClusterIds)`, disabled until clusters selected
- K8s Labels (optional): `Selector` with `isMulti`, options from workload label extraction, disabled until namespaces selected

**Zone 3: Ingress Rules** — Heading with `DirectionVisual direction="ingress"`, then `V2RuleTable` with `draftMode=true`, `draftRules=ingressDraftRules`, `onDraftRulesChange=setIngressDraftRules`.

**Zone 4: Egress Rules** — Same as Zone 3 for egress.

**Footer:** Cancel (navigates to `/policy-v2`) + Create Policy (validates name, creates policy via API, then creates each draft rule via API, then navigates to `/policy-v2/:id`).

Key state:
```typescript
const [name, setName] = useState('');
const [description, setDescription] = useState('');
const [scopeType, setScopeType] = useState<string>('k8s');
const [selectedClusterIds, setSelectedClusterIds] = useState<string[]>([]);
const [selectedNamespaceIds, setSelectedNamespaceIds] = useState<string[]>([]);
const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
const [ingressDraftRules, setIngressDraftRules] = useState<DraftRule[]>([]);
const [egressDraftRules, setEgressDraftRules] = useState<DraftRule[]>([]);
const [submitting, setSubmitting] = useState(false);
const [error, setError] = useState<string | null>(null);
```

Submit handler:
```typescript
const handleSubmit = async () => {
  if (!name.trim()) { setError('Policy name is required'); return; }
  setSubmitting(true);
  setError(null);
  try {
    const scopeLabels = selectedLabels.map((kv) => {
      const [key, value] = kv.split('=');
      return { key, value };
    });
    const policy = await createV2Policy({
      name: name.trim(),
      description: description.trim(),
      scope_type: scopeType as V2Policy['scope_type'],
      scope_cluster_ids: scopeType === 'k8s' ? selectedClusterIds : [],
      scope_namespace_ids: scopeType === 'k8s' ? selectedNamespaceIds : [],
      scope_labels: scopeType === 'k8s' ? scopeLabels : [],
    });
    for (const rule of [...ingressDraftRules, ...egressDraftRules]) {
      await createV2Rule(policy.id, {
        direction: rule.direction,
        entity: rule.entity,
        services: rule.services,
        action: rule.action,
      });
    }
    navigate(`/policy-v2/${policy.id}`);
  } catch (e) {
    setError(e instanceof Error ? e.message : 'Failed to create policy');
  } finally {
    setSubmitting(false);
  }
};
```

- [ ] **Step 2: Add route for /policy-v2/new**

In `client/src/app/routes.tsx`, add the import:

```typescript
import V2CreatePolicyPage from '../pages/V2CreatePolicyPage.js';
```

Add the route BEFORE the `/:id` route (order matters for matching):

```typescript
{ path: '/policy-v2/new', element: <V2CreatePolicyPage /> },
```

The routes array should now have:
```typescript
{ path: '/policy-v2', element: <V2PolicyListPage /> },
{ path: '/policy-v2/new', element: <V2CreatePolicyPage /> },
{ path: '/policy-v2/:id', element: <V2PolicyDetailPage /> },
```

- [ ] **Step 3: Update V2PolicyListPage — remove dialog, navigate to /new, update ScopeTokens**

In `client/src/pages/V2PolicyListPage.tsx`:

1. Remove the import of `V2CreatePolicyDialog` (line 22)
2. Remove `dialogOpen` state (line 74)
3. Replace Create button `onClick` from `() => setDialogOpen(true)` to `() => navigate('/policy-v2/new')` (line 159)
4. Replace EmptyState Create button similarly (line 183)
5. Remove the `<V2CreatePolicyDialog>` component at the bottom (lines 196-204)
6. Update `ScopeTokens` to use plural scope fields — replace `policy.scope_cluster_id` with `policy.scope_cluster_ids?.[0]` (or loop), replace `policy.scope_namespace_id` with `policy.scope_namespace_ids?.[0]` (or loop):

```typescript
function ScopeTokens({ policy }: { policy: V2Policy }) {
  if (policy.scope_type === 'all_workloads') {
    return <Token label="All Workloads" color="blue" size="sm" />;
  }

  if (policy.scope_type === 'labels') {
    const labelTokens = policy.scope_labels.map((l) => (
      <Token key={`${l.key}=${l.value}`} label={`${l.key}=${l.value}`} color="purple" size="sm" />
    ));
    return (
      <HStack gap={1} vAlign="center" wrap="wrap">
        {labelTokens.length > 0 ? labelTokens : <Token label="Labels" color="purple" size="sm" />}
      </HStack>
    );
  }

  const tokens: ReactNode[] = [];
  for (const cid of (policy.scope_cluster_ids ?? [])) {
    tokens.push(<Token key={`c-${cid}`} label={`Cluster: ${cid}`} color="teal" size="sm" />);
  }
  for (const nid of (policy.scope_namespace_ids ?? [])) {
    tokens.push(<Token key={`ns-${nid}`} label={`NS: ${nid}`} color="cyan" size="sm" />);
  }
  for (const l of policy.scope_labels) {
    tokens.push(<Token key={`${l.key}=${l.value}`} label={`${l.key}=${l.value}`} color="purple" size="sm" />);
  }
  if (tokens.length === 0) {
    return <Token label="Kubernetes" color="teal" size="sm" />;
  }
  return (
    <HStack gap={1} vAlign="center" wrap="wrap">
      {tokens}
    </HStack>
  );
}
```

Also add the guardrail badge — if `policy.policy_type === 'guardrail'`, show a Token in the name column:

In the `name` column `renderCell`, after the description Text, add:
```tsx
{(row as V2Policy).policy_type === 'guardrail' && (
  <Token label="Guardrail" color="orange" size="sm" />
)}
```

- [ ] **Step 4: Verify**

Run:
```bash
cd PolicyExperience/client && npx tsc --noEmit
```
Expected: clean

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/V2CreatePolicyPage.tsx client/src/app/routes.tsx client/src/pages/V2PolicyListPage.tsx
git commit -m "feat(v2): add unified create policy page, remove dialog, update list for multi-select scope"
```

---

### Task 6: Policy Detail Page — Multi-Select Scope, Direction Visuals, Guardrail Mode

**Files:**
- Modify: `client/src/pages/V2PolicyDetailPage.tsx`

**Interfaces:**
- Consumes:
  - Updated `V2Policy` with `scope_cluster_ids`, `scope_namespace_ids`, `policy_type`, `template_id` from Task 2
  - `DirectionVisual` from Task 4
  - Updated `V2RuleTable` with `readOnly` prop from Task 3
  - `fetchClusters`, `fetchNamespaces` from `api/policies.ts`
  - `fetchV2Policy`, `deleteV2Policy`, `updateV2Policy`, `provisionV2Policy` from `api/v2-policies.ts`
  - `fetchV2Template` from `api/v2-templates.ts` (Task 7 — for template name resolution on guardrail policies; if not yet available, show template_id as fallback)
- Produces:
  - Detail page showing multiple clusters/namespaces as Token lists
  - Direction visuals next to ingress/egress headings
  - Guardrail policy mode: "Enforcement Points" heading, read-only rule tables, template banner with link

- [ ] **Step 1: Update V2PolicyDetailPage.tsx**

Replace the full contents of `V2PolicyDetailPage.tsx`. Key changes from the current version:

1. **Multi-cluster/namespace resolution**: Fetch all clusters on mount. Fetch namespaces using `fetchNamespaces(policy.scope_cluster_ids)` when policy loads. Resolve IDs to names using `.find()`.

2. **Scope display**: Replace single cluster/namespace Text with Token lists:
```tsx
<MetadataListItem label="Clusters">
  <HStack gap={0.5} wrap="wrap">
    {(policy.scope_cluster_ids ?? []).map((cid) => {
      const name = clusters.find((c) => c.id === cid)?.name ?? cid;
      return <Token key={cid} label={name} color="teal" size="sm" />;
    })}
  </HStack>
</MetadataListItem>
```

3. **Direction visuals**: Add `DirectionVisual` next to each section heading:
```tsx
<HStack gap={2} vAlign="center">
  <Heading level={2}>Ingress Rules (Who can talk to me)</Heading>
  <DirectionVisual direction="ingress" />
</HStack>
```

4. **Guardrail policy mode**: When `policy.policy_type === 'guardrail'`:
   - Change scope heading from "Scope (Who am I)" to "Enforcement Points"
   - Add a Banner above rules: `"Rules managed by template: {template name or template_id}"`
   - Pass `readOnly` prop to `V2RuleTable`
   - Hide "+ Add Rule" section (handled by readOnly)
   - MoreMenu omits rule-editing options

5. **Convert to Template**: Add "Convert to Template" to the MoreMenu for standard policies (implementation deferred to Task 8).

- [ ] **Step 2: Verify**

Run:
```bash
cd PolicyExperience/client && npx tsc --noEmit
```
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/V2PolicyDetailPage.tsx
git commit -m "feat(v2): update detail page with multi-select scope, direction visuals, and guardrail mode"
```

---

### Task 7: Template Backend + API Client + Template Pages

**Files:**
- Create: `server/src/routes/v2-templates.ts`
- Modify: `server/src/index.ts` (mount template routes)
- Modify: `server/src/db/seed.ts` (add template + guardrail policy seed data)
- Create: `client/src/api/v2-templates.ts`
- Create: `client/src/pages/V2TemplateDetailPage.tsx`
- Create: `client/src/pages/V2TemplateCreatePage.tsx`
- Modify: `client/src/app/routes.tsx` (add template routes)
- Modify: `client/src/pages/V2PolicyListPage.tsx` (add Policies/Templates tab view)

**Interfaces:**
- Consumes:
  - `v2_templates` and `v2_template_rules` tables from Task 1
  - `v2_policies.policy_type` and `v2_policies.template_id` columns from Task 1
  - `V2RuleTable` with `draftMode` and `readOnly` from Task 3
  - `DraftRule` type from Task 3
  - `DirectionVisual` from Task 4
- Produces:
  - Template API routes: CRUD for templates and template rules
  - `V2Template`, `V2TemplateRule` types
  - `fetchV2Templates()`, `fetchV2Template(id)`, `createV2Template(data)`, `updateV2Template(id, data)`, `deleteV2Template(id)` functions
  - `createV2TemplateRule(templateId, data)`, `updateV2TemplateRule(ruleId, data)`, `deleteV2TemplateRule(ruleId)` functions
  - Template detail page with linked policies list and read-only rules
  - Template create/edit page with V2RuleTable in draft/API mode
  - List page tabs: Policies (default) + Templates

- [ ] **Step 1: Create server/src/routes/v2-templates.ts**

```typescript
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

function parseTemplate(row: any) {
  if (!row) return null;
  return row;
}

function parseTemplateRule(row: any) {
  if (!row) return null;
  return { ...row, entity: JSON.parse(row.entity), services: JSON.parse(row.services) };
}

// GET /templates — list all with rule count and linked policy count
router.get('/templates', (_req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT t.*,
      (SELECT COUNT(*) FROM v2_template_rules WHERE template_id = t.id) as rule_count,
      (SELECT COUNT(*) FROM v2_policies WHERE template_id = t.id) as linked_policy_count
    FROM v2_templates t ORDER BY t.name
  `).all();
  res.json(rows);
});

// GET /templates/:id — get single template with rules
router.get('/templates/:id', (req, res) => {
  const db = getDb();
  const template = db.prepare('SELECT * FROM v2_templates WHERE id = ?').get(req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found' });
  const rules = db.prepare('SELECT * FROM v2_template_rules WHERE template_id = ? ORDER BY direction, position').all(req.params.id);
  const linkedPolicies = db.prepare('SELECT id, name FROM v2_policies WHERE template_id = ?').all(req.params.id);
  res.json({ ...parseTemplate(template), rules: rules.map(parseTemplateRule), linked_policies: linkedPolicies });
});

// POST /templates — create template
router.post('/templates', (req, res) => {
  const db = getDb();
  const { name, description, source } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const user = (req as AuthenticatedRequest).user;
  const now = new Date().toISOString();
  const id = uuidv4();
  db.prepare(
    `INSERT INTO v2_templates (id, name, description, source, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name, description ?? '', source ?? 'user_created', user.id, now, now);
  const created = db.prepare('SELECT * FROM v2_templates WHERE id = ?').get(id);
  res.status(201).json(parseTemplate(created));
});

// PATCH /templates/:id — update template
router.patch('/templates/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM v2_templates WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Template not found' });
  const { name, description } = req.body;
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE v2_templates SET name = COALESCE(?, name), description = COALESCE(?, description), updated_at = ? WHERE id = ?`
  ).run(name ?? null, description ?? null, now, req.params.id);
  const updated = db.prepare('SELECT * FROM v2_templates WHERE id = ?').get(req.params.id);
  res.json(parseTemplate(updated));
});

// DELETE /templates/:id — blocked if linked policies exist
router.delete('/templates/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM v2_templates WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Template not found' });
  const linked = db.prepare('SELECT COUNT(*) as c FROM v2_policies WHERE template_id = ?').get(req.params.id) as any;
  if (linked.c > 0) return res.status(409).json({ error: `Cannot delete template — ${linked.c} policies reference it. Remove or reassign those policies first.` });
  db.prepare('DELETE FROM v2_templates WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// GET /templates/:id/rules — list template rules
router.get('/templates/:id/rules', (req, res) => {
  const db = getDb();
  let sql = 'SELECT * FROM v2_template_rules WHERE template_id = ?';
  const params: string[] = [req.params.id];
  if (req.query.direction) {
    sql += ' AND direction = ?';
    params.push(req.query.direction as string);
  }
  sql += ' ORDER BY direction, position';
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(parseTemplateRule));
});

// POST /templates/:id/rules — create template rule
router.post('/templates/:id/rules', (req, res) => {
  const db = getDb();
  const templateId = req.params.id;
  const template = db.prepare('SELECT id FROM v2_templates WHERE id = ?').get(templateId);
  if (!template) return res.status(404).json({ error: 'Template not found' });
  const { direction, entity, services, action } = req.body;
  if (!direction || !['ingress', 'egress'].includes(direction)) return res.status(400).json({ error: 'direction must be ingress or egress' });
  const maxRow = db.prepare('SELECT MAX(position) as maxPos FROM v2_template_rules WHERE template_id = ? AND direction = ?').get(templateId, direction) as any;
  const position = (maxRow?.maxPos ?? -1) + 1;
  const id = uuidv4();
  db.prepare(
    `INSERT INTO v2_template_rules (id, template_id, direction, entity, services, action, enabled, position, notes)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, '')`
  ).run(id, templateId, direction, JSON.stringify(entity ?? []), JSON.stringify(services ?? []), action ?? 'allow', position);
  const created = db.prepare('SELECT * FROM v2_template_rules WHERE id = ?').get(id);
  res.status(201).json(parseTemplateRule(created));
});

// PATCH /template-rules/:id — update template rule
router.patch('/template-rules/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM v2_template_rules WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Template rule not found' });
  const { entity, services, action, enabled, notes } = req.body;
  db.prepare(
    `UPDATE v2_template_rules SET
      entity = COALESCE(?, entity),
      services = COALESCE(?, services),
      action = COALESCE(?, action),
      enabled = COALESCE(?, enabled),
      notes = COALESCE(?, notes)
     WHERE id = ?`
  ).run(
    entity !== undefined ? JSON.stringify(entity) : null,
    services !== undefined ? JSON.stringify(services) : null,
    action ?? null,
    enabled !== undefined ? (enabled ? 1 : 0) : null,
    notes ?? null,
    req.params.id
  );
  const updated = db.prepare('SELECT * FROM v2_template_rules WHERE id = ?').get(req.params.id);
  res.json(parseTemplateRule(updated));
});

// DELETE /template-rules/:id
router.delete('/template-rules/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM v2_template_rules WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Template rule not found' });
  db.prepare('DELETE FROM v2_template_rules WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
```

- [ ] **Step 2: Mount template routes in server/src/index.ts**

Add import after the existing `v2PoliciesRoutes` import:

```typescript
import v2TemplatesRoutes from './routes/v2-templates.js';
```

Add mount after the existing `/api/v2` mount:

```typescript
app.use('/api/v2', v2TemplatesRoutes);
```

- [ ] **Step 3: Add template and guardrail seed data to seed.ts**

Add UUID constants near the top (after the V2_POLICY constants, around line 97):

```typescript
// V2 Templates
const V2_TPL_DNS = 'v2-tpl-dns-egress-baseline-0001';
const V2_TPL_MONITORING = 'v2-tpl-monitoring-ingress-0002';
const V2_TPL_PROD_DENY = 'v2-tpl-prod-deny-external-0003';
const V2_POLICY_DNS_GUARDRAIL = 'v2-policy-dns-guardrail-0004';
```

At the end of the seed transaction (after the v2_rules section, before the closing `});`):

```typescript
  // ── V2 Templates ─────────────────────────────────────────────────────────
  const insertV2Template = db.prepare(`
    INSERT INTO v2_templates (id, name, description, source, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertV2Template.run(V2_TPL_DNS, 'DNS Egress Baseline', 'Allows DNS egress to kube-dns in kube-system', 'illumio_suggested', USER_ALEX, now, now);
  insertV2Template.run(V2_TPL_MONITORING, 'Monitoring Ingress Access', 'Allows Prometheus and Grafana scraping', 'illumio_suggested', USER_ALEX, now, now);
  insertV2Template.run(V2_TPL_PROD_DENY, 'Production Deny External', 'Denies egress to external domains', 'user_created', USER_MORGAN, now, now);

  const insertV2TemplateRule = db.prepare(`
    INSERT INTO v2_template_rules (id, template_id, direction, entity, services, action, enabled, position, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // DNS Egress Baseline — 1 egress rule
  insertV2TemplateRule.run(uuid(), V2_TPL_DNS, 'egress',
    JSON.stringify([{ field: 'k8s_pod_app', operator: 'is', value: { type: 'enum', value: 'kube-dns' } }]),
    JSON.stringify([{ type: 'port', protocol: 'UDP', port: '53' }]),
    'allow', 1, 0, ''
  );

  // Monitoring Ingress Access — 2 ingress rules
  insertV2TemplateRule.run(uuid(), V2_TPL_MONITORING, 'ingress',
    JSON.stringify([{ field: 'label_role', operator: 'is', value: { type: 'enum', value: 'prometheus' } }]),
    JSON.stringify([{ type: 'port', protocol: 'TCP', port: '9090' }]),
    'allow', 1, 0, ''
  );
  insertV2TemplateRule.run(uuid(), V2_TPL_MONITORING, 'ingress',
    JSON.stringify([{ field: 'label_role', operator: 'is', value: { type: 'enum', value: 'grafana' } }]),
    JSON.stringify([{ type: 'port', protocol: 'TCP', port: '3000' }]),
    'allow', 1, 1, ''
  );

  // Production Deny External — 1 egress rule
  insertV2TemplateRule.run(uuid(), V2_TPL_PROD_DENY, 'egress',
    JSON.stringify([{ field: 'fqdn', operator: 'matches', value: { type: 'enum', value: '*.external.com' } }]),
    JSON.stringify([{ type: 'named', name: 'All Services' }]),
    'deny', 1, 0, ''
  );

  // Guardrail Policy: DNS Access — All Production Clusters
  insertV2Policy.run(
    V2_POLICY_DNS_GUARDRAIL,
    'DNS Access — All Production Clusters',
    'Guardrail: DNS egress across production clusters',
    'k8s', JSON.stringify([CLUSTER_USEAST, CLUSTER_EUWEST]), JSON.stringify([]),
    JSON.stringify([]),
    1, 'draft', 'guardrail', V2_TPL_DNS, USER_ALEX, now, now
  );
```

Update the log counts section at the bottom to include:

```typescript
console.log('  v2_templates:', (db2.prepare('SELECT count(*) as c FROM v2_templates').get() as { c: number }).c);
console.log('  v2_template_rules:', (db2.prepare('SELECT count(*) as c FROM v2_template_rules').get() as { c: number }).c);
```

- [ ] **Step 4: Create client/src/api/v2-templates.ts**

```typescript
import { apiFetch } from './client.js';
import type { EndpointFilter } from './policies.js';
import type { V2RuleService } from './v2-policies.js';

export interface V2TemplateRule {
  id: string;
  template_id: string;
  direction: 'ingress' | 'egress';
  entity: EndpointFilter[];
  services: V2RuleService[];
  action: 'allow' | 'deny' | 'override_deny';
  enabled: number;
  position: number;
  notes: string;
}

export interface V2Template {
  id: string;
  name: string;
  description: string;
  source: 'illumio_suggested' | 'user_created';
  created_by: string;
  created_at: string;
  updated_at: string;
  rule_count?: number;
  linked_policy_count?: number;
  rules?: V2TemplateRule[];
  linked_policies?: Array<{ id: string; name: string }>;
}

export function fetchV2Templates() {
  return apiFetch<V2Template[]>('/api/v2/templates');
}

export function fetchV2Template(id: string) {
  return apiFetch<V2Template>(`/api/v2/templates/${id}`);
}

export function createV2Template(data: {
  name: string;
  description?: string;
  source?: 'illumio_suggested' | 'user_created';
}) {
  return apiFetch<V2Template>('/api/v2/templates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateV2Template(id: string, data: Partial<{ name: string; description: string }>) {
  return apiFetch<V2Template>(`/api/v2/templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteV2Template(id: string) {
  return apiFetch<void>(`/api/v2/templates/${id}`, { method: 'DELETE' });
}

export function fetchV2TemplateRules(templateId: string, direction?: 'ingress' | 'egress') {
  const q = direction ? `?direction=${direction}` : '';
  return apiFetch<V2TemplateRule[]>(`/api/v2/templates/${templateId}/rules${q}`);
}

export function createV2TemplateRule(templateId: string, data: {
  direction: 'ingress' | 'egress';
  entity?: EndpointFilter[];
  services?: V2RuleService[];
  action?: 'allow' | 'deny' | 'override_deny';
}) {
  return apiFetch<V2TemplateRule>(`/api/v2/templates/${templateId}/rules`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateV2TemplateRule(ruleId: string, data: Partial<{
  entity: EndpointFilter[];
  services: V2RuleService[];
  action: 'allow' | 'deny' | 'override_deny';
  enabled: boolean;
  notes: string;
}>) {
  return apiFetch<V2TemplateRule>(`/api/v2/template-rules/${ruleId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteV2TemplateRule(ruleId: string) {
  return apiFetch<void>(`/api/v2/template-rules/${ruleId}`, { method: 'DELETE' });
}
```

- [ ] **Step 5: Create client/src/pages/V2TemplateDetailPage.tsx**

Template detail page with:
- Breadcrumbs: Policy-v2 > Templates > {template.name}
- Header: template name, source badge (Token: "Illumio Suggested" orange or "User Created" blue), Edit button (navigates to `/policy-v2/templates/:id/edit`), MoreMenu (Delete — shows error if linked policies > 0)
- Linked Policies section: list of guardrail policy names as links to `/policy-v2/:policyId`
- Ingress Rules section: `V2RuleTable` with `readOnly` — pass template rules filtered by direction
- Egress Rules section: same

The template rules from `template.rules` need to be shaped like `V2Rule` for the table. Map `V2TemplateRule` to match `V2Rule` structure (add `policy_id: ''` and `provision_status: 'draft'` placeholders).

- [ ] **Step 6: Create client/src/pages/V2TemplateCreatePage.tsx**

Template create page at `/policy-v2/templates/new`:
- Breadcrumbs: Policy-v2 > Templates > Create Template
- Zone 1: Template Info — TextInput for name, TextArea for description
- Zone 2: Ingress Rules — V2RuleTable with draftMode
- Zone 3: Egress Rules — V2RuleTable with draftMode
- Footer: Cancel (navigate to `/policy-v2`) + Create Template

Submit handler: creates template, then creates each draft rule via `createV2TemplateRule`, navigates to template detail page.

Also handle edit mode at `/policy-v2/templates/:id/edit` — same layout, but load existing template + rules, use API mode for V2RuleTable (not draft mode), and Save button calls `updateV2Template`. Check the URL params to determine create vs edit mode.

- [ ] **Step 7: Add template routes to routes.tsx**

Add imports:

```typescript
import V2TemplateDetailPage from '../pages/V2TemplateDetailPage.js';
import V2TemplateCreatePage from '../pages/V2TemplateCreatePage.js';
```

Add routes (order matters — put specific paths before `:id`):

```typescript
{ path: '/policy-v2/templates/new', element: <V2TemplateCreatePage /> },
{ path: '/policy-v2/templates/:id/edit', element: <V2TemplateCreatePage /> },
{ path: '/policy-v2/templates/:id', element: <V2TemplateDetailPage /> },
```

These go AFTER `/policy-v2/new` and BEFORE `/policy-v2/:id`.

- [ ] **Step 8: Add Policies/Templates tab view to V2PolicyListPage**

In `V2PolicyListPage.tsx`, add a tab view at the top using `TabList` and `Tab` from Astryx:

```typescript
const [activeTab, setActiveTab] = useState<'policies' | 'templates'>('policies');
```

Below the heading row, add:
```tsx
<TabList>
  <Tab isSelected={activeTab === 'policies'} onClick={() => setActiveTab('policies')}>Policies</Tab>
  <Tab isSelected={activeTab === 'templates'} onClick={() => setActiveTab('templates')}>Templates</Tab>
</TabList>
```

When `activeTab === 'policies'`: show existing policy table (unchanged). The Create button says "Create Policy" and navigates to `/policy-v2/new`.

When `activeTab === 'templates'`: fetch templates via `fetchV2Templates()`, render a Table with columns:
1. Name (proportional(2)) — template name + description
2. Source (pixel(160)) — Token: "Illumio Suggested" (orange) or "User Created" (blue)
3. Rules (pixel(80)) — rule_count number
4. Policies (pixel(80)) — linked_policy_count number
5. Actions (pixel(60)) — MoreMenu with Edit (navigate to edit page) and Delete

The Create button changes to "Create Template" and navigates to `/policy-v2/templates/new`.

Row click navigates to `/policy-v2/templates/:id`.

- [ ] **Step 9: Verify**

Run:
```bash
cd PolicyExperience && npm run seed -w server
```
Expected: `v2_policies: 4`, `v2_rules: 10`, `v2_templates: 3`, `v2_template_rules: 4`.

Run:
```bash
cd PolicyExperience/server && npx tsc --noEmit
cd PolicyExperience/client && npx tsc --noEmit
```
Expected: both clean

- [ ] **Step 10: Commit**

```bash
git add server/src/routes/v2-templates.ts server/src/index.ts server/src/db/seed.ts client/src/api/v2-templates.ts client/src/pages/V2TemplateDetailPage.tsx client/src/pages/V2TemplateCreatePage.tsx client/src/app/routes.tsx client/src/pages/V2PolicyListPage.tsx
git commit -m "feat(v2): add template CRUD, guardrail seed data, template pages, and policies/templates tab view"
```

---

### Task 8: Convert to Template Dialog + Create Policy Guardrail Mode

**Files:**
- Create: `client/src/features/v2-rules/ConvertToTemplateDialog.tsx`
- Modify: `client/src/pages/V2CreatePolicyPage.tsx` (add guardrail mode with SegmentedControl + template picker)
- Modify: `client/src/pages/V2PolicyDetailPage.tsx` (wire up Convert to Template menu action)
- Create: `server/src/routes/v2-policies.ts` (add POST `/policies/:id/convert-to-template` endpoint)

**Interfaces:**
- Consumes:
  - `createV2Template`, `createV2TemplateRule`, `fetchV2Templates`, `V2Template` from `api/v2-templates.ts` (Task 7)
  - `fetchV2Policy`, `updateV2Policy`, `V2Policy`, `V2Rule` from `api/v2-policies.ts`
  - `V2RuleTable` with `readOnly` from Task 3
- Produces:
  - `ConvertToTemplateDialog` component: `{ isOpen, onClose, policy: V2Policy, onConverted: () => void }`
  - Policy create page guardrail mode: SegmentedControl (Standard | Guardrail), template picker in Selector, read-only rule preview
  - `POST /api/v2/policies/:id/convert-to-template` server endpoint

- [ ] **Step 1: Add convert-to-template endpoint**

In `server/src/routes/v2-policies.ts`, add after the provision endpoint:

```typescript
// POST /policies/:id/convert-to-template
router.post('/policies/:id/convert-to-template', (req, res) => {
  const db = getDb();
  const policy = db.prepare('SELECT * FROM v2_policies WHERE id = ?').get(req.params.id) as any;
  if (!policy) return res.status(404).json({ error: 'Policy not found' });
  if (policy.policy_type !== 'standard') return res.status(400).json({ error: 'Only standard policies can be converted' });
  const { template_name, template_description, convert_policy } = req.body;
  if (!template_name) return res.status(400).json({ error: 'template_name is required' });
  const user = (req as AuthenticatedRequest).user;
  const now = new Date().toISOString();
  const templateId = uuidv4();
  db.transaction(() => {
    db.prepare(
      `INSERT INTO v2_templates (id, name, description, source, created_by, created_at, updated_at)
       VALUES (?, ?, ?, 'user_created', ?, ?, ?)`
    ).run(templateId, template_name, template_description ?? '', user.id, now, now);
    const rules = db.prepare('SELECT * FROM v2_rules WHERE policy_id = ?').all(req.params.id);
    const insertTplRule = db.prepare(
      `INSERT INTO v2_template_rules (id, template_id, direction, entity, services, action, enabled, position, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const r of rules as any[]) {
      insertTplRule.run(uuidv4(), templateId, r.direction, r.entity, r.services, r.action, r.enabled, r.position, r.notes);
    }
    if (convert_policy) {
      db.prepare("UPDATE v2_policies SET policy_type = 'guardrail', template_id = ?, updated_at = ? WHERE id = ?").run(templateId, now, req.params.id);
      db.prepare('DELETE FROM v2_rules WHERE policy_id = ?').run(req.params.id);
    }
  })();
  const template = db.prepare('SELECT * FROM v2_templates WHERE id = ?').get(templateId);
  res.status(201).json(template);
});
```

- [ ] **Step 2: Create ConvertToTemplateDialog.tsx**

Create `client/src/features/v2-rules/ConvertToTemplateDialog.tsx`:

```typescript
import { useState, useCallback } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Checkbox } from '@astryxdesign/core/Checkbox';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Banner } from '@astryxdesign/core/Banner';

import { apiFetch } from '../../api/client.js';
import type { V2Policy } from '../../api/v2-policies.js';

interface ConvertToTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  policy: V2Policy;
  onConverted: () => void;
}

export function ConvertToTemplateDialog({ isOpen, onClose, policy, onConverted }: ConvertToTemplateDialogProps) {
  const [templateName, setTemplateName] = useState(`${policy.name} Template`);
  const [templateDescription, setTemplateDescription] = useState('');
  const [convertPolicy, setConvertPolicy] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!templateName.trim()) { setError('Template name is required'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/api/v2/policies/${policy.id}/convert-to-template`, {
        method: 'POST',
        body: JSON.stringify({
          template_name: templateName.trim(),
          template_description: templateDescription.trim(),
          convert_policy: convertPolicy,
        }),
      });
      onConverted();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Conversion failed');
    } finally {
      setSubmitting(false);
    }
  }, [policy.id, templateName, templateDescription, convertPolicy, onConverted, onClose]);

  return (
    <Dialog isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} purpose="form" width={520}>
      <DialogHeader title="Convert to Template" onOpenChange={(open) => { if (!open) onClose(); }} />
      <VStack gap={3} padding={4}>
        {error && <Banner status="error" title={error} isDismissable onDismiss={() => setError(null)} />}
        <FormLayout>
          <TextInput label="Template Name" value={templateName} onChange={setTemplateName} isRequired />
          <TextArea label="Description" value={templateDescription} onChange={setTemplateDescription} isOptional rows={2} />
          <Checkbox label="Convert this policy to a guardrail referencing the new template" isSelected={convertPolicy} onChange={setConvertPolicy} />
        </FormLayout>
      </VStack>
      <HStack padding={4} hAlign="end" gap={2}>
        <Button label="Cancel" variant="secondary" onClick={onClose} isDisabled={submitting} />
        <Button label="Convert" variant="primary" onClick={handleSubmit} isLoading={submitting} isDisabled={!templateName.trim()} />
      </HStack>
    </Dialog>
  );
}
```

- [ ] **Step 3: Wire ConvertToTemplateDialog into V2PolicyDetailPage**

In `V2PolicyDetailPage.tsx`, add state and import for the convert dialog:

```typescript
import { ConvertToTemplateDialog } from '../features/v2-rules/ConvertToTemplateDialog.js';
```

Add state: `const [convertDialogOpen, setConvertDialogOpen] = useState(false);`

Add to the MoreMenu items (for standard policies only):

```typescript
...(policy.policy_type === 'standard' ? [{
  label: 'Convert to Template',
  onClick: () => setConvertDialogOpen(true),
}] : []),
```

Add the dialog component at the bottom of the JSX:

```tsx
{policy.policy_type === 'standard' && (
  <ConvertToTemplateDialog
    isOpen={convertDialogOpen}
    onClose={() => setConvertDialogOpen(false)}
    policy={policy}
    onConverted={refetch}
  />
)}
```

- [ ] **Step 4: Add guardrail mode to V2CreatePolicyPage**

In `V2CreatePolicyPage.tsx`, add at the top of the form a SegmentedControl:

```tsx
const [policyType, setPolicyType] = useState<'standard' | 'guardrail'>('standard');
const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
const [templates, setTemplates] = useState<V2Template[]>([]);
const [templatePreviewRules, setTemplatePreviewRules] = useState<V2TemplateRule[]>([]);
```

Fetch templates on mount. When `policyType === 'guardrail'`:
- Show a Template Selector (dropdown populated from `fetchV2Templates()`)
- When a template is selected, fetch its rules and display them in read-only V2RuleTables
- Hide the draft rule editors (zones 3 & 4 switch to read-only template preview)
- The scope selectors become "Enforcement Points" labels

Submit handler for guardrail:
```typescript
const policy = await createV2Policy({
  name: name.trim(),
  description: description.trim(),
  scope_type: scopeType as V2Policy['scope_type'],
  scope_cluster_ids: scopeType === 'k8s' ? selectedClusterIds : [],
  scope_namespace_ids: scopeType === 'k8s' ? selectedNamespaceIds : [],
  scope_labels: scopeType === 'k8s' ? scopeLabels : [],
  policy_type: 'guardrail',
  template_id: selectedTemplateId,
});
navigate(`/policy-v2/${policy.id}`);
```

- [ ] **Step 5: Verify end-to-end**

Run:
```bash
cd PolicyExperience && npm run seed -w server
cd PolicyExperience/server && npx tsc --noEmit
cd PolicyExperience/client && npx tsc --noEmit
```
Expected: all clean

Full test flow:
1. Navigate to `/policy-v2` — Policies tab shows 4 policies (3 standard + 1 guardrail with "Guardrail" badge)
2. Templates tab shows 3 templates with rule counts
3. Click "DNS Egress Baseline" template — detail page shows 1 egress rule, linked policy "DNS Access — All Production Clusters"
4. Click "DNS Access — All Production Clusters" — guardrail detail page shows "Enforcement Points" heading, template banner, read-only rules
5. Click "Create Policy" → unified create page. Switch to "Guardrail Policy" → template picker appears, draft rule editors replaced with read-only template preview
6. Create a standard policy with ingress/egress rules in draft mode — all saved in one transaction
7. On a standard policy detail, MoreMenu → "Convert to Template" → dialog → converts successfully

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/v2-policies.ts client/src/features/v2-rules/ConvertToTemplateDialog.tsx client/src/pages/V2PolicyDetailPage.tsx client/src/pages/V2CreatePolicyPage.tsx
git commit -m "feat(v2): add convert-to-template, guardrail create mode, and wire up template dialog"
```

---

### Task 9: Cleanup — Delete V2CreatePolicyDialog

**Files:**
- Delete: `client/src/features/v2-rules/V2CreatePolicyDialog.tsx`

**Interfaces:**
- Consumes: nothing (the dialog should no longer be imported anywhere after Task 5)
- Produces: cleaner codebase without dead code

- [ ] **Step 1: Verify no remaining imports**

Run:
```bash
grep -r "V2CreatePolicyDialog" client/src/ --include="*.tsx" --include="*.ts"
```
Expected: no results (the import was removed in Task 5).

- [ ] **Step 2: Delete the file**

```bash
rm client/src/features/v2-rules/V2CreatePolicyDialog.tsx
```

- [ ] **Step 3: Verify**

Run:
```bash
cd PolicyExperience/client && npx tsc --noEmit
```
Expected: clean

- [ ] **Step 4: Commit**

```bash
git add -u client/src/features/v2-rules/V2CreatePolicyDialog.tsx
git commit -m "chore(v2): remove replaced V2CreatePolicyDialog"
```
