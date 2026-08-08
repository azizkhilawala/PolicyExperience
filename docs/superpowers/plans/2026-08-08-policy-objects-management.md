# Policy Objects Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full CRUD management for Services, IP Lists, Label Groups, and Virtual Services — plus integration into both V1 and V2 rule editors for named-object selection and inline creation.

**Architecture:** New `services` table + timestamp columns on 3 existing tables. A single `/api/objects` Express router provides CRUD for all 4 types with referential delete guards. The client gets a typed API layer, a four-tab `ObjectsPage`, and dialog-based create/edit. Both V2 and V1 rule editors are extended with named-service pickers and inline-create dialogs.

**Tech Stack:** React 18 + TypeScript strict, Astryx v0.2.0 design system (per-component subpath imports), Express 5, better-sqlite3, Vite

## Global Constraints

- Astryx design system imports MUST use per-component subpath pattern: `import { X } from '@astryxdesign/core/X'`
- All API functions use `apiFetch` from `client/src/api/client.ts`
- Fixed UUIDs in seed data follow existing `prefix-name-NNN` pattern
- `getDb()` from `server/src/db/connection.ts` is the only database accessor
- `AuthenticatedRequest` from `server/src/middleware/auth.ts` provides `req.user.id`
- Dialog pattern: `Dialog` + `DialogHeader` + `FormLayout` + `useEffect` reset on `isOpen` change (see `ConvertToTemplateDialog.tsx`)
- No tests in this codebase — testing is manual via dev server
- The read-only endpoints in `server/src/routes/resources.ts` remain untouched

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `server/src/db/schema.sql` | Modify | Add `services` table; add timestamp+created_by columns to `ip_lists`, `label_groups`, `virtual_services` |
| `server/src/db/seed.ts` | Modify | Add 5 service seed rows; add timestamp columns to existing ip_lists/label_groups/virtual_services inserts |
| `server/src/routes/objects.ts` | Create | Full CRUD router for all 4 object types at `/api/objects/*` |
| `server/src/index.ts` | Modify | Mount `/api/objects` router |
| `client/src/api/objects.ts` | Create | 4 interfaces + 20 typed API functions |
| `client/src/pages/ObjectsPage.tsx` | Create | Four-tab CRUD page |
| `client/src/app/routes.tsx` | Modify | Add `/objects` route |
| `client/src/app/App.tsx` | Modify | Add "Objects" nav item |
| `client/src/features/objects/ServiceDialog.tsx` | Create | Create/edit service dialog |
| `client/src/features/objects/IpListDialog.tsx` | Create | Create/edit IP list dialog |
| `client/src/features/objects/LabelGroupDialog.tsx` | Create | Create/edit label group dialog |
| `client/src/features/objects/VirtualServiceDialog.tsx` | Create | Create/edit virtual service dialog |
| `client/src/features/v2-rules/V2ServiceEditor.tsx` | Modify | Add named-service picker + inline ServiceDialog |
| `client/src/features/v2-rules/V2EntityEditor.tsx` | Modify | Add "+ Create" button with inline IpListDialog/LabelGroupDialog |
| `client/src/features/rules/ServiceEditor.tsx` | Modify | Add saved_service enum field + inline ServiceDialog |
| `client/src/features/rules/EndpointEditor.tsx` | Modify | Add "+ Create" button with inline IpListDialog/LabelGroupDialog |

---

### Task 1: Database Schema + Seed Data

**Files:**
- Modify: `server/src/db/schema.sql`
- Modify: `server/src/db/seed.ts`

**Interfaces:**
- Consumes: existing schema tables `ip_lists`, `label_groups`, `virtual_services`, existing seed constants `USER_ALEX`, `now`
- Produces: `services` table; `created_by`, `created_at`, `updated_at` columns on `ip_lists`, `label_groups`, `virtual_services`; 5 service seed rows with constants `SVC_HTTPS`, `SVC_HTTP`, `SVC_DNS`, `SVC_SSH`, `SVC_PG`

- [ ] **Step 1: Add `services` table to schema.sql**

Add this `CREATE TABLE` after the `virtual_services` table (after line 53):

```sql
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  port INTEGER NOT NULL,
  to_port INTEGER,
  protocol TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

- [ ] **Step 2: Add timestamp columns to existing tables in schema.sql**

Modify the `ip_lists` table (currently lines 35-40) to add the three new columns:

```sql
CREATE TABLE IF NOT EXISTS ip_lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cidr TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT '2026-07-28T10:00:00Z',
  updated_at TEXT NOT NULL DEFAULT '2026-07-28T10:00:00Z'
);
```

Modify the `label_groups` table (currently lines 16-20) to add the three new columns:

```sql
CREATE TABLE IF NOT EXISTS label_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  label_ids TEXT NOT NULL DEFAULT '[]',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT '2026-07-28T10:00:00Z',
  updated_at TEXT NOT NULL DEFAULT '2026-07-28T10:00:00Z'
);
```

Modify the `virtual_services` table (currently lines 48-53) to add the three new columns:

```sql
CREATE TABLE IF NOT EXISTS virtual_services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  port INTEGER NOT NULL,
  protocol TEXT NOT NULL DEFAULT 'TCP',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT '2026-07-28T10:00:00Z',
  updated_at TEXT NOT NULL DEFAULT '2026-07-28T10:00:00Z'
);
```

- [ ] **Step 3: Add service seed constants to seed.ts**

Add after the existing virtual service constants (after `const VS_METRICS = ...` around line 73):

```typescript
// Services
const SVC_HTTPS = 'svc-https-443-tcp-0001';
const SVC_HTTP = 'svc-http-80-tcp-0002';
const SVC_DNS = 'svc-dns-53-udp-0003';
const SVC_SSH = 'svc-ssh-22-tcp-0004';
const SVC_PG = 'svc-postgres-5432-tcp-0005';
```

- [ ] **Step 4: Add DELETE FROM services to the seed transaction's clear block**

In the `db.exec` block that clears all tables, add `DELETE FROM services;` after `DELETE FROM virtual_services;`.

- [ ] **Step 5: Add service inserts to seed.ts**

After the virtual services insert block (after line 208), add:

```typescript
  // ── Services ──────────────────────────────────────────────────────────────
  const insertService = db.prepare(
    'INSERT INTO services (id, name, description, port, to_port, protocol, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  insertService.run(SVC_HTTPS, 'HTTPS', 'Secure HTTP over TLS', 443, null, 'TCP', USER_ALEX, now, now);
  insertService.run(SVC_HTTP, 'HTTP', 'Standard HTTP traffic', 80, null, 'TCP', USER_ALEX, now, now);
  insertService.run(SVC_DNS, 'DNS', 'Domain name resolution', 53, null, 'UDP', USER_ALEX, now, now);
  insertService.run(SVC_SSH, 'SSH', 'Secure shell access', 22, null, 'TCP', USER_ALEX, now, now);
  insertService.run(SVC_PG, 'PostgreSQL', 'PostgreSQL database', 5432, null, 'TCP', USER_ALEX, now, now);
```

- [ ] **Step 6: Update existing label_groups inserts to include timestamp columns**

Change the existing insert prepare from:
```typescript
  const insertLabelGroup = db.prepare(
    'INSERT INTO label_groups (id, name, label_ids) VALUES (?, ?, ?)'
  );
  insertLabelGroup.run(LG_WEB_TIER, 'Web Tier', JSON.stringify([LBL_ROLE_WEB, LBL_ROLE_LB]));
  insertLabelGroup.run(LG_DB_TIER, 'Database Tier', JSON.stringify([LBL_ROLE_DB, LBL_ROLE_CACHE]));
  insertLabelGroup.run(LG_PROD_APPS, 'Production Apps', JSON.stringify([LBL_APP_HRM, LBL_APP_ERP, LBL_APP_PAYMENT]));
```

To:
```typescript
  const insertLabelGroup = db.prepare(
    'INSERT INTO label_groups (id, name, label_ids, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  insertLabelGroup.run(LG_WEB_TIER, 'Web Tier', JSON.stringify([LBL_ROLE_WEB, LBL_ROLE_LB]), USER_ALEX, now, now);
  insertLabelGroup.run(LG_DB_TIER, 'Database Tier', JSON.stringify([LBL_ROLE_DB, LBL_ROLE_CACHE]), USER_ALEX, now, now);
  insertLabelGroup.run(LG_PROD_APPS, 'Production Apps', JSON.stringify([LBL_APP_HRM, LBL_APP_ERP, LBL_APP_PAYMENT]), USER_ALEX, now, now);
```

- [ ] **Step 7: Update existing ip_lists inserts to include timestamp columns**

Change the existing insert prepare from:
```typescript
  const insertIpList = db.prepare(
    'INSERT INTO ip_lists (id, name, cidr, description) VALUES (?, ?, ?, ?)'
  );
  insertIpList.run(IPL_CORPORATE, 'Corporate Network', '10.0.0.0/8', '');
  insertIpList.run(IPL_VPN, 'VPN Gateway', '172.16.0.0/12', '');
  insertIpList.run(IPL_CDN, 'Public CDN', '203.0.113.0/24', '');
  insertIpList.run(IPL_PAYMENT, 'Payment Processor Network', '192.168.1.0/24', '');
  insertIpList.run(IPL_MONITORING, 'Monitoring Subnet', '10.100.0.0/16', '');
```

To:
```typescript
  const insertIpList = db.prepare(
    'INSERT INTO ip_lists (id, name, cidr, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  insertIpList.run(IPL_CORPORATE, 'Corporate Network', '10.0.0.0/8', '', USER_ALEX, now, now);
  insertIpList.run(IPL_VPN, 'VPN Gateway', '172.16.0.0/12', '', USER_ALEX, now, now);
  insertIpList.run(IPL_CDN, 'Public CDN', '203.0.113.0/24', '', USER_ALEX, now, now);
  insertIpList.run(IPL_PAYMENT, 'Payment Processor Network', '192.168.1.0/24', '', USER_ALEX, now, now);
  insertIpList.run(IPL_MONITORING, 'Monitoring Subnet', '10.100.0.0/16', '', USER_ALEX, now, now);
```

- [ ] **Step 8: Update existing virtual_services inserts to include timestamp columns**

Change the existing insert prepare from:
```typescript
  const insertVirtualService = db.prepare(
    'INSERT INTO virtual_services (id, name, port, protocol) VALUES (?, ?, ?, ?)'
  );
  insertVirtualService.run(VS_PAYMENT_API, 'Payment API', 443, 'TCP');
  insertVirtualService.run(VS_INTERNAL_DNS, 'Internal DNS', 53, 'UDP');
  insertVirtualService.run(VS_METRICS, 'Metrics Endpoint', 9090, 'TCP');
```

To:
```typescript
  const insertVirtualService = db.prepare(
    'INSERT INTO virtual_services (id, name, port, protocol, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  insertVirtualService.run(VS_PAYMENT_API, 'Payment API', 443, 'TCP', USER_ALEX, now, now);
  insertVirtualService.run(VS_INTERNAL_DNS, 'Internal DNS', 53, 'UDP', USER_ALEX, now, now);
  insertVirtualService.run(VS_METRICS, 'Metrics Endpoint', 9090, 'TCP', USER_ALEX, now, now);
```

- [ ] **Step 9: Add services count to the log block at end of seed.ts**

After the `virtual_services` count line, add:
```typescript
console.log('  services:', (db2.prepare('SELECT count(*) as c FROM services').get() as { c: number }).c);
```

- [ ] **Step 10: Delete existing database and re-seed**

```bash
rm -f server/data/policy.db server/data/policy.db-shm server/data/policy.db-wal
npm run seed -w server
```

Verify output shows `services: 5` and all other counts remain unchanged.

- [ ] **Step 11: Commit**

```bash
git add server/src/db/schema.sql server/src/db/seed.ts
git commit -m "feat(objects): add services table and timestamp columns to ip_lists, label_groups, virtual_services"
```

---

### Task 2: Backend CRUD API

**Files:**
- Create: `server/src/routes/objects.ts`
- Modify: `server/src/index.ts`

**Interfaces:**
- Consumes: `getDb()` from `server/src/db/connection.ts`, `AuthenticatedRequest` from `server/src/middleware/auth.ts`, `uuidv4()` from `uuid`, tables `services`, `ip_lists`, `label_groups`, `virtual_services`, `v2_rules`, `rules`
- Produces: Express router mounted at `/api/objects` with 20 endpoints (5 per object type: GET list, GET by id, POST create, PATCH update, DELETE with guard)

- [ ] **Step 1: Create `server/src/routes/objects.ts`**

Create the file with the full CRUD router. Follow the pattern from `server/src/routes/v2-policies.ts` (same imports, same `Router()` pattern, same `AuthenticatedRequest` usage for `created_by`).

```typescript
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// ─── Services (/services) ───────────────────────────────────────────────────

router.get('/services', (_req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM services ORDER BY name').all();
  res.json(rows);
});

router.get('/services/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Service not found' });
  res.json(row);
});

router.post('/services', (req, res) => {
  const db = getDb();
  const { name, port, protocol, to_port, description } = req.body;
  if (!name || port === undefined || !protocol) {
    return res.status(400).json({ error: 'name, port, and protocol are required' });
  }
  const user = (req as AuthenticatedRequest).user;
  const now = new Date().toISOString();
  const id = uuidv4();
  db.prepare(
    `INSERT INTO services (id, name, description, port, to_port, protocol, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name, description ?? '', port, to_port ?? null, protocol, user.id, now, now);
  const created = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
  res.status(201).json(created);
});

router.patch('/services/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Service not found' });
  const { name, description, port, to_port, protocol } = req.body;
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE services SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      port = COALESCE(?, port),
      to_port = COALESCE(?, to_port),
      protocol = COALESCE(?, protocol),
      updated_at = ?
     WHERE id = ?`
  ).run(name ?? null, description ?? null, port ?? null, to_port !== undefined ? to_port : null, protocol ?? null, now, req.params.id);
  const updated = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/services/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Service not found' });
  const serviceName = existing.name;
  const v2Count = (db.prepare(
    `SELECT COUNT(*) as c FROM v2_rules WHERE services LIKE ?`
  ).get(`%"name":"${serviceName}"%`) as { c: number }).c;
  const v1Count = (db.prepare(
    `SELECT COUNT(*) as c FROM rules WHERE services LIKE ?`
  ).get(`%"name":"${serviceName}"%`) as { c: number }).c;
  const total = v2Count + v1Count;
  if (total > 0) {
    return res.status(409).json({ error: `Cannot delete: referenced by ${total} rules` });
  }
  db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// ─── IP Lists (/ip-lists) ──────────────────────────────────────────────────

function parseIpList(row: any) {
  return row;
}

router.get('/ip-lists', (_req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM ip_lists ORDER BY name').all();
  res.json(rows.map(parseIpList));
});

router.get('/ip-lists/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM ip_lists WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'IP List not found' });
  res.json(parseIpList(row));
});

router.post('/ip-lists', (req, res) => {
  const db = getDb();
  const { name, cidr, description } = req.body;
  if (!name || !cidr) {
    return res.status(400).json({ error: 'name and cidr are required' });
  }
  const user = (req as AuthenticatedRequest).user;
  const now = new Date().toISOString();
  const id = uuidv4();
  db.prepare(
    `INSERT INTO ip_lists (id, name, cidr, description, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name, cidr, description ?? '', user.id, now, now);
  const created = db.prepare('SELECT * FROM ip_lists WHERE id = ?').get(id);
  res.status(201).json(parseIpList(created));
});

router.patch('/ip-lists/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM ip_lists WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'IP List not found' });
  const { name, cidr, description } = req.body;
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE ip_lists SET
      name = COALESCE(?, name),
      cidr = COALESCE(?, cidr),
      description = COALESCE(?, description),
      updated_at = ?
     WHERE id = ?`
  ).run(name ?? null, cidr ?? null, description ?? null, now, req.params.id);
  const updated = db.prepare('SELECT * FROM ip_lists WHERE id = ?').get(req.params.id);
  res.json(parseIpList(updated));
});

router.delete('/ip-lists/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM ip_lists WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'IP List not found' });
  const ipName = existing.name;
  const v2Count = (db.prepare(
    `SELECT COUNT(*) as c FROM v2_rules WHERE entity LIKE ?`
  ).get(`%"field":"ip_list"%${ipName}%`) as { c: number }).c;
  const v1Count = (db.prepare(
    `SELECT COUNT(*) as c FROM rules WHERE source LIKE ? OR destination LIKE ?`
  ).get(`%"field":"ip_list"%${ipName}%`, `%"field":"ip_list"%${ipName}%`) as { c: number }).c;
  const total = v2Count + v1Count;
  if (total > 0) {
    return res.status(409).json({ error: `Cannot delete: referenced by ${total} rules` });
  }
  db.prepare('DELETE FROM ip_lists WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// ─── Label Groups (/label-groups) ──────────────────────────────────────────

function parseLabelGroup(row: any) {
  if (!row) return null;
  return { ...row, label_ids: JSON.parse(row.label_ids) };
}

router.get('/label-groups', (_req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM label_groups ORDER BY name').all();
  res.json(rows.map(parseLabelGroup));
});

router.get('/label-groups/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM label_groups WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Label Group not found' });
  res.json(parseLabelGroup(row));
});

router.post('/label-groups', (req, res) => {
  const db = getDb();
  const { name, label_ids } = req.body;
  if (!name || !label_ids) {
    return res.status(400).json({ error: 'name and label_ids are required' });
  }
  const user = (req as AuthenticatedRequest).user;
  const now = new Date().toISOString();
  const id = uuidv4();
  db.prepare(
    `INSERT INTO label_groups (id, name, label_ids, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, name, JSON.stringify(label_ids), user.id, now, now);
  const created = db.prepare('SELECT * FROM label_groups WHERE id = ?').get(id);
  res.status(201).json(parseLabelGroup(created));
});

router.patch('/label-groups/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM label_groups WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Label Group not found' });
  const { name, label_ids } = req.body;
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE label_groups SET
      name = COALESCE(?, name),
      label_ids = COALESCE(?, label_ids),
      updated_at = ?
     WHERE id = ?`
  ).run(name ?? null, label_ids ? JSON.stringify(label_ids) : null, now, req.params.id);
  const updated = db.prepare('SELECT * FROM label_groups WHERE id = ?').get(req.params.id);
  res.json(parseLabelGroup(updated));
});

router.delete('/label-groups/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM label_groups WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Label Group not found' });
  const lgName = existing.name;
  const v2Count = (db.prepare(
    `SELECT COUNT(*) as c FROM v2_rules WHERE entity LIKE ?`
  ).get(`%"field":"label_group"%${lgName}%`) as { c: number }).c;
  const v1Count = (db.prepare(
    `SELECT COUNT(*) as c FROM rules WHERE source LIKE ? OR destination LIKE ?`
  ).get(`%"field":"label_group"%${lgName}%`, `%"field":"label_group"%${lgName}%`) as { c: number }).c;
  const total = v2Count + v1Count;
  if (total > 0) {
    return res.status(409).json({ error: `Cannot delete: referenced by ${total} rules` });
  }
  db.prepare('DELETE FROM label_groups WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// ─── Virtual Services (/virtual-services) ──────────────────────────────────

router.get('/virtual-services', (_req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM virtual_services ORDER BY name').all();
  res.json(rows);
});

router.get('/virtual-services/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM virtual_services WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Virtual Service not found' });
  res.json(row);
});

router.post('/virtual-services', (req, res) => {
  const db = getDb();
  const { name, port, protocol } = req.body;
  if (!name || port === undefined || !protocol) {
    return res.status(400).json({ error: 'name, port, and protocol are required' });
  }
  const user = (req as AuthenticatedRequest).user;
  const now = new Date().toISOString();
  const id = uuidv4();
  db.prepare(
    `INSERT INTO virtual_services (id, name, port, protocol, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name, port, protocol, user.id, now, now);
  const created = db.prepare('SELECT * FROM virtual_services WHERE id = ?').get(id);
  res.status(201).json(created);
});

router.patch('/virtual-services/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM virtual_services WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Virtual Service not found' });
  const { name, port, protocol } = req.body;
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE virtual_services SET
      name = COALESCE(?, name),
      port = COALESCE(?, port),
      protocol = COALESCE(?, protocol),
      updated_at = ?
     WHERE id = ?`
  ).run(name ?? null, port ?? null, protocol ?? null, now, req.params.id);
  const updated = db.prepare('SELECT * FROM virtual_services WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/virtual-services/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM virtual_services WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Virtual Service not found' });
  const vsName = existing.name;
  const v2Count = (db.prepare(
    `SELECT COUNT(*) as c FROM v2_rules WHERE entity LIKE ?`
  ).get(`%"field":"virtual_service"%${vsName}%`) as { c: number }).c;
  const v1Count = (db.prepare(
    `SELECT COUNT(*) as c FROM rules WHERE source LIKE ? OR destination LIKE ?`
  ).get(`%"field":"virtual_service"%${vsName}%`, `%"field":"virtual_service"%${vsName}%`) as { c: number }).c;
  const total = v2Count + v1Count;
  if (total > 0) {
    return res.status(409).json({ error: `Cannot delete: referenced by ${total} rules` });
  }
  db.prepare('DELETE FROM virtual_services WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
```

- [ ] **Step 2: Mount the router in `server/src/index.ts`**

Add the import after the existing `v2TemplatesRoutes` import (line 13):
```typescript
import objectsRoutes from './routes/objects.js';
```

Add the mount after `app.use('/api/v2', v2TemplatesRoutes);` (line 32):
```typescript
app.use('/api/objects', objectsRoutes);
```

- [ ] **Step 3: Verify the backend**

```bash
rm -f server/data/policy.db server/data/policy.db-shm server/data/policy.db-wal
npm run seed -w server
npm run dev -w server &
```

Test with curl:
```bash
curl http://localhost:3001/api/objects/services | jq '.'
curl http://localhost:3001/api/objects/ip-lists | jq '.'
curl http://localhost:3001/api/objects/label-groups | jq '.'
curl http://localhost:3001/api/objects/virtual-services | jq '.'
```

Verify each returns the correct seeded data. Kill the dev server.

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/objects.ts server/src/index.ts
git commit -m "feat(objects): add CRUD backend API for services, ip-lists, label-groups, virtual-services"
```

---

### Task 3: Client API Layer

**Files:**
- Create: `client/src/api/objects.ts`

**Interfaces:**
- Consumes: `apiFetch` from `client/src/api/client.ts`
- Produces: Interfaces `Service`, `IpList` (as `ObjIpList`), `LabelGroup` (as `ObjLabelGroup`), `VirtualService` (as `ObjVirtualService`); 20 functions: `fetchServices`, `fetchServiceById`, `createService`, `updateService`, `deleteService`, `fetchObjIpLists`, `fetchObjIpListById`, `createIpList`, `updateIpList`, `deleteIpList`, `fetchObjLabelGroups`, `fetchObjLabelGroupById`, `createLabelGroup`, `updateLabelGroup`, `deleteLabelGroup`, `fetchObjVirtualServices`, `fetchObjVirtualServiceById`, `createVirtualService`, `updateVirtualService`, `deleteVirtualService`

Note: The "Obj" prefix on IP List, Label Group, and Virtual Service fetch functions avoids collisions with existing functions in `policies.ts` that hit the read-only endpoints. The interfaces use the same names as the spec but the export names are prefixed.

- [ ] **Step 1: Create `client/src/api/objects.ts`**

```typescript
import { apiFetch } from './client.js';

export interface Service {
  id: string;
  name: string;
  description: string;
  port: number;
  to_port: number | null;
  protocol: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ObjIpList {
  id: string;
  name: string;
  cidr: string;
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ObjLabelGroup {
  id: string;
  name: string;
  label_ids: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ObjVirtualService {
  id: string;
  name: string;
  port: number;
  protocol: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Services ───────────────────────────────────────────────────────────────

export function fetchServices() {
  return apiFetch<Service[]>('/api/objects/services');
}

export function fetchServiceById(id: string) {
  return apiFetch<Service>(`/api/objects/services/${id}`);
}

export function createService(data: {
  name: string;
  port: number;
  protocol: string;
  to_port?: number | null;
  description?: string;
}) {
  return apiFetch<Service>('/api/objects/services', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateService(id: string, data: Partial<{
  name: string;
  port: number;
  protocol: string;
  to_port: number | null;
  description: string;
}>) {
  return apiFetch<Service>(`/api/objects/services/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteService(id: string) {
  return apiFetch<void>(`/api/objects/services/${id}`, { method: 'DELETE' });
}

// ─── IP Lists ───────────────────────────────────────────────────────────────

export function fetchObjIpLists() {
  return apiFetch<ObjIpList[]>('/api/objects/ip-lists');
}

export function fetchObjIpListById(id: string) {
  return apiFetch<ObjIpList>(`/api/objects/ip-lists/${id}`);
}

export function createIpList(data: {
  name: string;
  cidr: string;
  description?: string;
}) {
  return apiFetch<ObjIpList>('/api/objects/ip-lists', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateIpList(id: string, data: Partial<{
  name: string;
  cidr: string;
  description: string;
}>) {
  return apiFetch<ObjIpList>(`/api/objects/ip-lists/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteIpList(id: string) {
  return apiFetch<void>(`/api/objects/ip-lists/${id}`, { method: 'DELETE' });
}

// ─── Label Groups ───────────────────────────────────────────────────────────

export function fetchObjLabelGroups() {
  return apiFetch<ObjLabelGroup[]>('/api/objects/label-groups');
}

export function fetchObjLabelGroupById(id: string) {
  return apiFetch<ObjLabelGroup>(`/api/objects/label-groups/${id}`);
}

export function createLabelGroup(data: {
  name: string;
  label_ids: string[];
}) {
  return apiFetch<ObjLabelGroup>('/api/objects/label-groups', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateLabelGroup(id: string, data: Partial<{
  name: string;
  label_ids: string[];
}>) {
  return apiFetch<ObjLabelGroup>(`/api/objects/label-groups/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteLabelGroup(id: string) {
  return apiFetch<void>(`/api/objects/label-groups/${id}`, { method: 'DELETE' });
}

// ─── Virtual Services ───────────────────────────────────────────────────────

export function fetchObjVirtualServices() {
  return apiFetch<ObjVirtualService[]>('/api/objects/virtual-services');
}

export function fetchObjVirtualServiceById(id: string) {
  return apiFetch<ObjVirtualService>(`/api/objects/virtual-services/${id}`);
}

export function createVirtualService(data: {
  name: string;
  port: number;
  protocol: string;
}) {
  return apiFetch<ObjVirtualService>('/api/objects/virtual-services', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateVirtualService(id: string, data: Partial<{
  name: string;
  port: number;
  protocol: string;
}>) {
  return apiFetch<ObjVirtualService>(`/api/objects/virtual-services/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteVirtualService(id: string) {
  return apiFetch<void>(`/api/objects/virtual-services/${id}`, { method: 'DELETE' });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit -p client/tsconfig.json
```

- [ ] **Step 3: Commit**

```bash
git add client/src/api/objects.ts
git commit -m "feat(objects): add typed client API layer for all 4 object types"
```

---

### Task 4: Create/Edit Dialogs

**Files:**
- Create: `client/src/features/objects/ServiceDialog.tsx`
- Create: `client/src/features/objects/IpListDialog.tsx`
- Create: `client/src/features/objects/LabelGroupDialog.tsx`
- Create: `client/src/features/objects/VirtualServiceDialog.tsx`

**Interfaces:**
- Consumes: `Service`, `ObjIpList`, `ObjLabelGroup`, `ObjVirtualService`, `createService`, `updateService`, `createIpList`, `updateIpList`, `createLabelGroup`, `updateLabelGroup`, `createVirtualService`, `updateVirtualService` from `client/src/api/objects.ts`; `fetchLabels` from `client/src/api/labels.ts`; Astryx `Dialog`, `DialogHeader`, `FormLayout`, `TextInput`, `TextArea`, `Selector`, `Button`, `HStack`, `VStack`, `Banner`
- Produces: `ServiceDialog`, `IpListDialog`, `LabelGroupDialog`, `VirtualServiceDialog` — each with props `{ isOpen, onClose, onSaved, [objectProp]? }`

All four dialogs follow the `ConvertToTemplateDialog` pattern from `client/src/features/v2-rules/ConvertToTemplateDialog.tsx`:
- `Dialog` + `DialogHeader` wrapping
- `useEffect` resets all state when `isOpen` becomes `true`
- `FormLayout` for fields
- Error `Banner` above form
- `HStack` footer with Cancel (secondary) + Submit (primary)
- Dialog `purpose="form"` and `width={480}`

- [ ] **Step 1: Create `client/src/features/objects/ServiceDialog.tsx`**

```typescript
import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Selector } from '@astryxdesign/core/Selector';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Banner } from '@astryxdesign/core/Banner';

import type { Service } from '../../api/objects.js';
import { createService, updateService } from '../../api/objects.js';

const PROTOCOL_OPTIONS = [
  { value: 'TCP', label: 'TCP' },
  { value: 'UDP', label: 'UDP' },
  { value: 'ICMP', label: 'ICMP' },
  { value: 'GRE', label: 'GRE' },
];

interface ServiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (service: Service) => void;
  service?: Service;
}

export function ServiceDialog({ isOpen, onClose, onSaved, service }: ServiceDialogProps) {
  const isEdit = !!service;
  const [name, setName] = useState('');
  const [port, setPort] = useState('');
  const [toPort, setToPort] = useState('');
  const [protocol, setProtocol] = useState('TCP');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(service?.name ?? '');
      setPort(service ? String(service.port) : '');
      setToPort(service?.to_port != null ? String(service.to_port) : '');
      setProtocol(service?.protocol ?? 'TCP');
      setDescription(service?.description ?? '');
      setSubmitting(false);
      setError(null);
    }
  }, [isOpen, service]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!port.trim() || isNaN(Number(port))) { setError('Port is required and must be a number'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const data = {
        name: name.trim(),
        port: Number(port),
        protocol,
        to_port: toPort.trim() ? Number(toPort) : null,
        description: description.trim(),
      };
      const result = isEdit
        ? await updateService(service!.id, data)
        : await createService(data);
      onSaved(result);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  }, [name, port, toPort, protocol, description, isEdit, service, onSaved, onClose]);

  return (
    <Dialog isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} purpose="form" width={480}>
      <DialogHeader title={isEdit ? 'Edit Service' : 'Create Service'} onOpenChange={(open) => { if (!open) onClose(); }} />
      <VStack gap={3} padding={4}>
        {error && <Banner status="error" title={error} isDismissable onDismiss={() => setError(null)} />}
        <FormLayout>
          <TextInput label="Name" value={name} onChange={setName} isRequired />
          <TextInput label="Port" value={port} onChange={setPort} isRequired />
          <TextInput label="Port Range End (optional)" value={toPort} onChange={setToPort} />
          <Selector label="Protocol" options={PROTOCOL_OPTIONS} value={protocol} onChange={setProtocol} />
          <TextArea label="Description" value={description} onChange={setDescription} isOptional rows={2} />
        </FormLayout>
      </VStack>
      <HStack padding={4} hAlign="end" gap={2}>
        <Button label="Cancel" variant="secondary" onClick={onClose} isDisabled={submitting} />
        <Button label={isEdit ? 'Save' : 'Create'} variant="primary" onClick={handleSubmit} isLoading={submitting} isDisabled={!name.trim() || !port.trim()} />
      </HStack>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create `client/src/features/objects/IpListDialog.tsx`**

```typescript
import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Banner } from '@astryxdesign/core/Banner';

import type { ObjIpList } from '../../api/objects.js';
import { createIpList, updateIpList } from '../../api/objects.js';

interface IpListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (ipList: ObjIpList) => void;
  ipList?: ObjIpList;
}

export function IpListDialog({ isOpen, onClose, onSaved, ipList }: IpListDialogProps) {
  const isEdit = !!ipList;
  const [name, setName] = useState('');
  const [cidr, setCidr] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(ipList?.name ?? '');
      setCidr(ipList?.cidr ?? '');
      setDescription(ipList?.description ?? '');
      setSubmitting(false);
      setError(null);
    }
  }, [isOpen, ipList]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!cidr.trim()) { setError('CIDR is required'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const data = { name: name.trim(), cidr: cidr.trim(), description: description.trim() };
      const result = isEdit
        ? await updateIpList(ipList!.id, data)
        : await createIpList(data);
      onSaved(result);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  }, [name, cidr, description, isEdit, ipList, onSaved, onClose]);

  return (
    <Dialog isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} purpose="form" width={480}>
      <DialogHeader title={isEdit ? 'Edit IP List' : 'Create IP List'} onOpenChange={(open) => { if (!open) onClose(); }} />
      <VStack gap={3} padding={4}>
        {error && <Banner status="error" title={error} isDismissable onDismiss={() => setError(null)} />}
        <FormLayout>
          <TextInput label="Name" value={name} onChange={setName} isRequired />
          <TextInput label="CIDR" value={cidr} onChange={setCidr} isRequired placeholder="10.0.0.0/8" />
          <TextArea label="Description" value={description} onChange={setDescription} isOptional rows={2} />
        </FormLayout>
      </VStack>
      <HStack padding={4} hAlign="end" gap={2}>
        <Button label="Cancel" variant="secondary" onClick={onClose} isDisabled={submitting} />
        <Button label={isEdit ? 'Save' : 'Create'} variant="primary" onClick={handleSubmit} isLoading={submitting} isDisabled={!name.trim() || !cidr.trim()} />
      </HStack>
    </Dialog>
  );
}
```

- [ ] **Step 3: Create `client/src/features/objects/LabelGroupDialog.tsx`**

```typescript
import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Banner } from '@astryxdesign/core/Banner';
import { Token } from '@astryxdesign/core/Token';

import type { ObjLabelGroup } from '../../api/objects.js';
import { createLabelGroup, updateLabelGroup } from '../../api/objects.js';
import type { Label } from '../../api/labels.js';
import { useLabels } from '../../hooks/useLabels.js';

interface LabelGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (labelGroup: ObjLabelGroup) => void;
  labelGroup?: ObjLabelGroup;
}

export function LabelGroupDialog({ isOpen, onClose, onSaved, labelGroup }: LabelGroupDialogProps) {
  const isEdit = !!labelGroup;
  const allLabels = useLabels();
  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(labelGroup?.name ?? '');
      setSelectedIds(labelGroup?.label_ids ?? []);
      setSubmitting(false);
      setError(null);
    }
  }, [isOpen, labelGroup]);

  const labelOptions = allLabels
    .filter((l: Label) => !selectedIds.includes(l.id))
    .map((l: Label) => ({ value: l.id, label: `${l.key}=${l.value}` }));

  const handleAddLabel = useCallback((labelId: string) => {
    if (labelId && !selectedIds.includes(labelId)) {
      setSelectedIds([...selectedIds, labelId]);
    }
  }, [selectedIds]);

  const handleRemoveLabel = useCallback((labelId: string) => {
    setSelectedIds(selectedIds.filter((id) => id !== labelId));
  }, [selectedIds]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (selectedIds.length === 0) { setError('At least one label is required'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const data = { name: name.trim(), label_ids: selectedIds };
      const result = isEdit
        ? await updateLabelGroup(labelGroup!.id, data)
        : await createLabelGroup(data);
      onSaved(result);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  }, [name, selectedIds, isEdit, labelGroup, onSaved, onClose]);

  const resolveLabelName = (id: string): string => {
    const label = allLabels.find((l: Label) => l.id === id);
    return label ? `${label.key}=${label.value}` : id;
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} purpose="form" width={480}>
      <DialogHeader title={isEdit ? 'Edit Label Group' : 'Create Label Group'} onOpenChange={(open) => { if (!open) onClose(); }} />
      <VStack gap={3} padding={4}>
        {error && <Banner status="error" title={error} isDismissable onDismiss={() => setError(null)} />}
        <FormLayout>
          <TextInput label="Name" value={name} onChange={setName} isRequired />
          <Selector
            label="Add Label"
            options={labelOptions}
            value=""
            onChange={handleAddLabel}
            placeholder="Select a label…"
          />
        </FormLayout>
        {selectedIds.length > 0 && (
          <HStack gap={0.5} wrap="wrap">
            {selectedIds.map((id) => (
              <Token
                key={id}
                label={resolveLabelName(id)}
                color="purple"
                size="sm"
                onRemove={() => handleRemoveLabel(id)}
              />
            ))}
          </HStack>
        )}
      </VStack>
      <HStack padding={4} hAlign="end" gap={2}>
        <Button label="Cancel" variant="secondary" onClick={onClose} isDisabled={submitting} />
        <Button label={isEdit ? 'Save' : 'Create'} variant="primary" onClick={handleSubmit} isLoading={submitting} isDisabled={!name.trim() || selectedIds.length === 0} />
      </HStack>
    </Dialog>
  );
}
```

- [ ] **Step 4: Create `client/src/features/objects/VirtualServiceDialog.tsx`**

```typescript
import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Banner } from '@astryxdesign/core/Banner';

import type { ObjVirtualService } from '../../api/objects.js';
import { createVirtualService, updateVirtualService } from '../../api/objects.js';

const PROTOCOL_OPTIONS = [
  { value: 'TCP', label: 'TCP' },
  { value: 'UDP', label: 'UDP' },
];

interface VirtualServiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (virtualService: ObjVirtualService) => void;
  virtualService?: ObjVirtualService;
}

export function VirtualServiceDialog({ isOpen, onClose, onSaved, virtualService }: VirtualServiceDialogProps) {
  const isEdit = !!virtualService;
  const [name, setName] = useState('');
  const [port, setPort] = useState('');
  const [protocol, setProtocol] = useState('TCP');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(virtualService?.name ?? '');
      setPort(virtualService ? String(virtualService.port) : '');
      setProtocol(virtualService?.protocol ?? 'TCP');
      setSubmitting(false);
      setError(null);
    }
  }, [isOpen, virtualService]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!port.trim() || isNaN(Number(port))) { setError('Port is required and must be a number'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const data = { name: name.trim(), port: Number(port), protocol };
      const result = isEdit
        ? await updateVirtualService(virtualService!.id, data)
        : await createVirtualService(data);
      onSaved(result);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  }, [name, port, protocol, isEdit, virtualService, onSaved, onClose]);

  return (
    <Dialog isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} purpose="form" width={480}>
      <DialogHeader title={isEdit ? 'Edit Virtual Service' : 'Create Virtual Service'} onOpenChange={(open) => { if (!open) onClose(); }} />
      <VStack gap={3} padding={4}>
        {error && <Banner status="error" title={error} isDismissable onDismiss={() => setError(null)} />}
        <FormLayout>
          <TextInput label="Name" value={name} onChange={setName} isRequired />
          <TextInput label="Port" value={port} onChange={setPort} isRequired />
          <Selector label="Protocol" options={PROTOCOL_OPTIONS} value={protocol} onChange={setProtocol} />
        </FormLayout>
      </VStack>
      <HStack padding={4} hAlign="end" gap={2}>
        <Button label="Cancel" variant="secondary" onClick={onClose} isDisabled={submitting} />
        <Button label={isEdit ? 'Save' : 'Create'} variant="primary" onClick={handleSubmit} isLoading={submitting} isDisabled={!name.trim() || !port.trim()} />
      </HStack>
    </Dialog>
  );
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit -p client/tsconfig.json
```

- [ ] **Step 6: Commit**

```bash
git add client/src/features/objects/
git commit -m "feat(objects): add create/edit dialogs for services, ip-lists, label-groups, virtual-services"
```

---

### Task 5: Objects Page + Navigation

**Files:**
- Create: `client/src/pages/ObjectsPage.tsx`
- Modify: `client/src/app/routes.tsx`
- Modify: `client/src/app/App.tsx`

**Interfaces:**
- Consumes: `Service`, `ObjIpList`, `ObjLabelGroup`, `ObjVirtualService` from `client/src/api/objects.ts`; `fetchServices`, `deleteService`, `fetchObjIpLists`, `deleteIpList`, `fetchObjLabelGroups`, `deleteLabelGroup`, `fetchObjVirtualServices`, `deleteVirtualService` from `client/src/api/objects.ts`; `ServiceDialog`, `IpListDialog`, `LabelGroupDialog`, `VirtualServiceDialog` from `client/src/features/objects/`; Astryx `TabList`, `Tab`, `Table`, `Button`, `Banner`, `MoreMenu`, `HStack`, `VStack`, `Token`, `Icon`; `useLabels` from `client/src/hooks/useLabels.js`
- Produces: `ObjectsPage` component rendered at `/objects`; "Objects" nav item in sidebar

- [ ] **Step 1: Create `client/src/pages/ObjectsPage.tsx`**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { TabList, Tab } from '@astryxdesign/core/TabList';
import { Table } from '@astryxdesign/core/Table';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Token } from '@astryxdesign/core/Token';

import type { Service, ObjIpList, ObjLabelGroup, ObjVirtualService } from '../api/objects.js';
import {
  fetchServices, deleteService,
  fetchObjIpLists, deleteIpList,
  fetchObjLabelGroups, deleteLabelGroup,
  fetchObjVirtualServices, deleteVirtualService,
} from '../api/objects.js';
import { useLabels } from '../hooks/useLabels.js';
import { ServiceDialog } from '../features/objects/ServiceDialog.js';
import { IpListDialog } from '../features/objects/IpListDialog.js';
import { LabelGroupDialog } from '../features/objects/LabelGroupDialog.js';
import { VirtualServiceDialog } from '../features/objects/VirtualServiceDialog.js';

type ActiveTab = 'services' | 'ip-lists' | 'label-groups' | 'virtual-services';

export default function ObjectsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('services');
  const labels = useLabels();

  // ─── Services state ───────────────────────────────────────────────────────
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | undefined>(undefined);
  const [serviceDeleteError, setServiceDeleteError] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    setServicesLoading(true);
    try { setServices(await fetchServices()); }
    catch { /* empty */ }
    finally { setServicesLoading(false); }
  }, []);

  useEffect(() => { loadServices(); }, [loadServices]);

  // ─── IP Lists state ───────────────────────────────────────────────────────
  const [ipLists, setIpLists] = useState<ObjIpList[]>([]);
  const [ipListsLoading, setIpListsLoading] = useState(true);
  const [ipListDialogOpen, setIpListDialogOpen] = useState(false);
  const [editingIpList, setEditingIpList] = useState<ObjIpList | undefined>(undefined);
  const [ipListDeleteError, setIpListDeleteError] = useState<string | null>(null);

  const loadIpLists = useCallback(async () => {
    setIpListsLoading(true);
    try { setIpLists(await fetchObjIpLists()); }
    catch { /* empty */ }
    finally { setIpListsLoading(false); }
  }, []);

  useEffect(() => { loadIpLists(); }, [loadIpLists]);

  // ─── Label Groups state ───────────────────────────────────────────────────
  const [labelGroups, setLabelGroups] = useState<ObjLabelGroup[]>([]);
  const [labelGroupsLoading, setLabelGroupsLoading] = useState(true);
  const [labelGroupDialogOpen, setLabelGroupDialogOpen] = useState(false);
  const [editingLabelGroup, setEditingLabelGroup] = useState<ObjLabelGroup | undefined>(undefined);
  const [labelGroupDeleteError, setLabelGroupDeleteError] = useState<string | null>(null);

  const loadLabelGroups = useCallback(async () => {
    setLabelGroupsLoading(true);
    try { setLabelGroups(await fetchObjLabelGroups()); }
    catch { /* empty */ }
    finally { setLabelGroupsLoading(false); }
  }, []);

  useEffect(() => { loadLabelGroups(); }, [loadLabelGroups]);

  // ─── Virtual Services state ───────────────────────────────────────────────
  const [virtualServices, setVirtualServices] = useState<ObjVirtualService[]>([]);
  const [vsLoading, setVsLoading] = useState(true);
  const [vsDialogOpen, setVsDialogOpen] = useState(false);
  const [editingVs, setEditingVs] = useState<ObjVirtualService | undefined>(undefined);
  const [vsDeleteError, setVsDeleteError] = useState<string | null>(null);

  const loadVirtualServices = useCallback(async () => {
    setVsLoading(true);
    try { setVirtualServices(await fetchObjVirtualServices()); }
    catch { /* empty */ }
    finally { setVsLoading(false); }
  }, []);

  useEffect(() => { loadVirtualServices(); }, [loadVirtualServices]);

  // ─── Delete handlers ─────────────────────────────────────────────────────
  const handleDeleteService = useCallback(async (id: string) => {
    try { await deleteService(id); setServiceDeleteError(null); loadServices(); }
    catch (e) { setServiceDeleteError(e instanceof Error ? e.message : 'Delete failed'); }
  }, [loadServices]);

  const handleDeleteIpList = useCallback(async (id: string) => {
    try { await deleteIpList(id); setIpListDeleteError(null); loadIpLists(); }
    catch (e) { setIpListDeleteError(e instanceof Error ? e.message : 'Delete failed'); }
  }, [loadIpLists]);

  const handleDeleteLabelGroup = useCallback(async (id: string) => {
    try { await deleteLabelGroup(id); setLabelGroupDeleteError(null); loadLabelGroups(); }
    catch (e) { setLabelGroupDeleteError(e instanceof Error ? e.message : 'Delete failed'); }
  }, [loadLabelGroups]);

  const handleDeleteVs = useCallback(async (id: string) => {
    try { await deleteVirtualService(id); setVsDeleteError(null); loadVirtualServices(); }
    catch (e) { setVsDeleteError(e instanceof Error ? e.message : 'Delete failed'); }
  }, [loadVirtualServices]);

  // ─── Label name resolver ─────────────────────────────────────────────────
  const resolveLabelName = (id: string): string => {
    const label = labels.find((l) => l.id === id);
    return label ? `${label.key}=${label.value}` : id;
  };

  return (
    <VStack gap={3} padding={4}>
      <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Policy Objects</h1>

      <TabList value={activeTab} onChange={(v) => setActiveTab(v as ActiveTab)}>
        <Tab value="services" label="Services" />
        <Tab value="ip-lists" label="IP Lists" />
        <Tab value="label-groups" label="Label Groups" />
        <Tab value="virtual-services" label="Virtual Services" />
      </TabList>

      {/* ─── Services tab ─────────────────────────────────────────────────── */}
      {activeTab === 'services' && (
        <VStack gap={2}>
          <HStack hAlign="end">
            <Button label="+ Create Service" variant="primary" onClick={() => { setEditingService(undefined); setServiceDialogOpen(true); }} />
          </HStack>
          {serviceDeleteError && <Banner status="error" title={serviceDeleteError} isDismissable onDismiss={() => setServiceDeleteError(null)} />}
          <Table
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'portRange', header: 'Port / Range' },
              { key: 'protocol', header: 'Protocol' },
              { key: 'description', header: 'Description' },
              { key: 'actions', header: '', width: 60 },
            ]}
            rows={services.map((s) => ({
              id: s.id,
              name: s.name,
              portRange: s.to_port != null ? `${s.port}–${s.to_port}` : String(s.port),
              protocol: s.protocol,
              description: s.description,
              actions: (
                <MoreMenu items={[
                  { label: 'Edit', onClick: () => { setEditingService(s); setServiceDialogOpen(true); } },
                  { label: 'Delete', onClick: () => handleDeleteService(s.id) },
                ]} />
              ),
            }))}
            isLoading={servicesLoading}
          />
          <ServiceDialog
            isOpen={serviceDialogOpen}
            onClose={() => setServiceDialogOpen(false)}
            onSaved={() => loadServices()}
            service={editingService}
          />
        </VStack>
      )}

      {/* ─── IP Lists tab ─────────────────────────────────────────────────── */}
      {activeTab === 'ip-lists' && (
        <VStack gap={2}>
          <HStack hAlign="end">
            <Button label="+ Create IP List" variant="primary" onClick={() => { setEditingIpList(undefined); setIpListDialogOpen(true); }} />
          </HStack>
          {ipListDeleteError && <Banner status="error" title={ipListDeleteError} isDismissable onDismiss={() => setIpListDeleteError(null)} />}
          <Table
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'cidr', header: 'CIDR' },
              { key: 'description', header: 'Description' },
              { key: 'actions', header: '', width: 60 },
            ]}
            rows={ipLists.map((ip) => ({
              id: ip.id,
              name: ip.name,
              cidr: ip.cidr,
              description: ip.description,
              actions: (
                <MoreMenu items={[
                  { label: 'Edit', onClick: () => { setEditingIpList(ip); setIpListDialogOpen(true); } },
                  { label: 'Delete', onClick: () => handleDeleteIpList(ip.id) },
                ]} />
              ),
            }))}
            isLoading={ipListsLoading}
          />
          <IpListDialog
            isOpen={ipListDialogOpen}
            onClose={() => setIpListDialogOpen(false)}
            onSaved={() => loadIpLists()}
            ipList={editingIpList}
          />
        </VStack>
      )}

      {/* ─── Label Groups tab ─────────────────────────────────────────────── */}
      {activeTab === 'label-groups' && (
        <VStack gap={2}>
          <HStack hAlign="end">
            <Button label="+ Create Label Group" variant="primary" onClick={() => { setEditingLabelGroup(undefined); setLabelGroupDialogOpen(true); }} />
          </HStack>
          {labelGroupDeleteError && <Banner status="error" title={labelGroupDeleteError} isDismissable onDismiss={() => setLabelGroupDeleteError(null)} />}
          <Table
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'labels', header: 'Labels' },
              { key: 'actions', header: '', width: 60 },
            ]}
            rows={labelGroups.map((lg) => ({
              id: lg.id,
              name: lg.name,
              labels: (
                <HStack gap={0.5} wrap="wrap">
                  {lg.label_ids.map((lid) => (
                    <Token key={lid} label={resolveLabelName(lid)} color="purple" size="sm" />
                  ))}
                </HStack>
              ),
              actions: (
                <MoreMenu items={[
                  { label: 'Edit', onClick: () => { setEditingLabelGroup(lg); setLabelGroupDialogOpen(true); } },
                  { label: 'Delete', onClick: () => handleDeleteLabelGroup(lg.id) },
                ]} />
              ),
            }))}
            isLoading={labelGroupsLoading}
          />
          <LabelGroupDialog
            isOpen={labelGroupDialogOpen}
            onClose={() => setLabelGroupDialogOpen(false)}
            onSaved={() => loadLabelGroups()}
            labelGroup={editingLabelGroup}
          />
        </VStack>
      )}

      {/* ─── Virtual Services tab ─────────────────────────────────────────── */}
      {activeTab === 'virtual-services' && (
        <VStack gap={2}>
          <HStack hAlign="end">
            <Button label="+ Create Virtual Service" variant="primary" onClick={() => { setEditingVs(undefined); setVsDialogOpen(true); }} />
          </HStack>
          {vsDeleteError && <Banner status="error" title={vsDeleteError} isDismissable onDismiss={() => setVsDeleteError(null)} />}
          <Table
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'port', header: 'Port' },
              { key: 'protocol', header: 'Protocol' },
              { key: 'actions', header: '', width: 60 },
            ]}
            rows={virtualServices.map((vs) => ({
              id: vs.id,
              name: vs.name,
              port: String(vs.port),
              protocol: vs.protocol,
              actions: (
                <MoreMenu items={[
                  { label: 'Edit', onClick: () => { setEditingVs(vs); setVsDialogOpen(true); } },
                  { label: 'Delete', onClick: () => handleDeleteVs(vs.id) },
                ]} />
              ),
            }))}
            isLoading={vsLoading}
          />
          <VirtualServiceDialog
            isOpen={vsDialogOpen}
            onClose={() => setVsDialogOpen(false)}
            onSaved={() => loadVirtualServices()}
            virtualService={editingVs}
          />
        </VStack>
      )}
    </VStack>
  );
}
```

- [ ] **Step 2: Add route to `client/src/app/routes.tsx`**

Add import at the top:
```typescript
import ObjectsPage from '../pages/ObjectsPage.js';
```

Add route before the catch-all `{ path: '*', ... }`:
```typescript
  { path: '/objects', element: <ObjectsPage /> },
```

- [ ] **Step 3: Add nav item to `client/src/app/App.tsx`**

In the `<SideNav>` section, add a new `SideNavItem` between the "Policy-v2" item and the "Settings" item:

```tsx
          <SideNavItem
            label="Objects"
            href="/objects"
            isSelected={location.pathname.startsWith('/objects')}
            icon={<Icon icon="stack" />}
          />
```

- [ ] **Step 4: Verify the page loads**

Start the dev server and navigate to `/objects`. Verify:
- All four tabs render with seeded data
- Create dialog opens from the "+ Create" button
- Edit dialog opens from the row MoreMenu "Edit" option
- Delete works from the MoreMenu "Delete" option
- The "Objects" nav item appears in the sidebar and highlights when active

```bash
npm run dev
```

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/ObjectsPage.tsx client/src/app/routes.tsx client/src/app/App.tsx
git commit -m "feat(objects): add Objects page with four-tab CRUD layout and navigation"
```

---

### Task 6: V2 Rule Editor Integration

**Files:**
- Modify: `client/src/features/v2-rules/V2ServiceEditor.tsx`
- Modify: `client/src/features/v2-rules/V2EntityEditor.tsx`

**Interfaces:**
- Consumes: `Service` and `fetchServices` from `client/src/api/objects.ts`; `ServiceDialog` from `client/src/features/objects/ServiceDialog.js`; `IpListDialog` from `client/src/features/objects/IpListDialog.js`; `LabelGroupDialog` from `client/src/features/objects/LabelGroupDialog.js`; existing `V2ServiceEditorProps`, `V2EntityEditorProps`
- Produces: Updated `V2ServiceEditor` with named-service picker + inline-create; updated `V2EntityEditor` with "+ Create" button and inline IP List/Label Group dialogs

- [ ] **Step 1: Update `V2ServiceEditor.tsx`**

Add imports for `fetchServices` and `ServiceDialog`:
```typescript
import type { Service } from '../../api/objects.js';
import { fetchServices } from '../../api/objects.js';
import { ServiceDialog } from '../objects/ServiceDialog.js';
```

Add state for named services and dialog:
```typescript
const [services, setServices] = useState<Service[]>([]);
const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
```

Add `useEffect` to fetch services on mount (alongside the existing virtual services fetch):
```typescript
useEffect(() => {
  fetchServices().then(setServices).catch(() => {});
}, []);
```

Restructure `selectorOptions` to include named services, a divider, and the create option:
```typescript
const selectorOptions = [
  { value: 'all', label: 'All Services' },
  { type: 'divider' as const },
  ...services.map((s) => ({
    value: `svc__${s.id}`,
    label: `${s.name} (${s.protocol}/${s.port})`,
  })),
  { type: 'divider' as const },
  ...virtualServices.map((vs) => ({
    value: vs.id,
    label: `${vs.name} (TCP/${vs.port})`,
  })),
  { type: 'divider' as const },
  { value: '__custom__', label: 'Add custom port…' },
  { value: '__create_service__', label: '+ Create Service…' },
];
```

Update `handleSelectorChange` to handle named services and create:
```typescript
const handleSelectorChange = useCallback(
  (selectedValue: string) => {
    if (selectedValue === '__custom__') {
      setMode('custom');
      return;
    }
    if (selectedValue === '__create_service__') {
      setServiceDialogOpen(true);
      return;
    }
    if (selectedValue === 'all') {
      onChange([...value, { type: 'named', name: 'All Services' }]);
      return;
    }
    if (selectedValue.startsWith('svc__')) {
      const svc = services.find((s) => `svc__${s.id}` === selectedValue);
      if (svc) {
        onChange([...value, { type: 'named', name: svc.name }]);
      }
      return;
    }
    const vs = virtualServices.find((v) => v.id === selectedValue);
    if (vs) {
      onChange([...value, { type: 'named', name: vs.name }]);
    }
  },
  [value, onChange, virtualServices, services]
);
```

Add `ServiceDialog` render at the end of the component's return, as a sibling to the `VStack`:
```tsx
<ServiceDialog
  isOpen={serviceDialogOpen}
  onClose={() => setServiceDialogOpen(false)}
  onSaved={(newService) => {
    onChange([...value, { type: 'named', name: newService.name }]);
    fetchServices().then(setServices).catch(() => {});
  }}
/>
```

- [ ] **Step 2: Update `V2EntityEditor.tsx`**

Add imports:
```typescript
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu';

import type { ObjIpList, ObjLabelGroup } from '../../api/objects.js';
import { IpListDialog } from '../objects/IpListDialog.js';
import { LabelGroupDialog } from '../objects/LabelGroupDialog.js';
```

Add state for the inline-create dialogs:
```typescript
const [ipListDialogOpen, setIpListDialogOpen] = useState(false);
const [labelGroupDialogOpen, setLabelGroupDialogOpen] = useState(false);
```

Add `useState` import (it's not currently imported). The existing imports are `useMemo, useCallback`.

Update the return to wrap the `PowerSearch` in a `VStack` with the "+ Create" button and the dialogs:

```tsx
return (
  <VStack gap={1}>
    <HStack gap={1} vAlign="end">
      <div style={{ flex: 1 }}>
        <PowerSearch
          config={config}
          filters={psFilters}
          onChange={handleChange}
          placeholder="Add labels, K8s selectors, IP lists..."
          label="Entity"
          isDisabled={isDisabled}
          size="sm"
        />
      </div>
      <DropdownMenu
        button={{ label: '+ Create', variant: 'ghost', size: 'sm' }}
        items={[
          { label: 'Create IP List', onClick: () => setIpListDialogOpen(true) },
          { label: 'Create Label Group', onClick: () => setLabelGroupDialogOpen(true) },
        ]}
      />
    </HStack>
    <IpListDialog
      isOpen={ipListDialogOpen}
      onClose={() => setIpListDialogOpen(false)}
      onSaved={(newIpList: ObjIpList) => {
        onChange([...value, {
          field: 'ip_list',
          operator: 'is',
          value: { type: 'entity_list', value: [{ id: newIpList.id, label: newIpList.name }] },
        }]);
      }}
    />
    <LabelGroupDialog
      isOpen={labelGroupDialogOpen}
      onClose={() => setLabelGroupDialogOpen(false)}
      onSaved={(newLG: ObjLabelGroup) => {
        onChange([...value, {
          field: 'label_group',
          operator: 'is',
          value: { type: 'entity_list', value: [{ id: newLG.id, label: newLG.name }] },
        }]);
      }}
    />
  </VStack>
);
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit -p client/tsconfig.json
```

- [ ] **Step 4: Verify in browser**

Start the dev server, navigate to `/policy-v2`, open a policy, and verify:
- Service editor shows named services from `/api/objects/services` in the picker
- "+ Create Service…" option opens ServiceDialog
- Entity editor has "+ Create" dropdown with "Create IP List" and "Create Label Group"
- Inline-created objects appear as tokens in the editor

- [ ] **Step 5: Commit**

```bash
git add client/src/features/v2-rules/V2ServiceEditor.tsx client/src/features/v2-rules/V2EntityEditor.tsx
git commit -m "feat(objects): integrate named services and inline-create into V2 rule editors"
```

---

### Task 7: V1 Rule Editor Integration

**Files:**
- Modify: `client/src/features/rules/ServiceEditor.tsx`
- Modify: `client/src/features/rules/EndpointEditor.tsx`

**Interfaces:**
- Consumes: `Service` and `fetchServices` from `client/src/api/objects.ts`; `ServiceDialog` from `client/src/features/objects/ServiceDialog.js`; `IpListDialog` from `client/src/features/objects/IpListDialog.js`; `LabelGroupDialog` from `client/src/features/objects/LabelGroupDialog.js`; existing `ServiceEditorProps`, `EndpointEditorProps`; `RuleService` from `client/src/api/policies.ts`
- Produces: Updated `ServiceEditor` with saved_service enum field + inline ServiceDialog; updated `EndpointEditor` with "+ Create" dropdown and inline IP List/Label Group dialogs

- [ ] **Step 1: Update `ServiceEditor.tsx`**

Add imports:
```typescript
import { useState, useEffect } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';

import type { Service } from '../../api/objects.js';
import { fetchServices } from '../../api/objects.js';
import { ServiceDialog } from '../objects/ServiceDialog.js';
```

Inside the `ServiceEditor` component, add state:
```typescript
const [services, setServices] = useState<Service[]>([]);
const [serviceDialogOpen, setServiceDialogOpen] = useState(false);

useEffect(() => {
  fetchServices().then(setServices).catch(() => {});
}, []);
```

Convert `SERVICE_CONFIG` from a module-level constant to a `useMemo`-derived value inside the component that includes the saved_service field:
```typescript
const serviceConfig = useMemo<PowerSearchConfig>(() => ({
  name: 'ServiceSearch',
  fields: [
    {
      key: 'saved_service',
      label: 'Saved Service',
      group: 'Named',
      defaultOperator: 'is',
      operators: [
        {
          key: 'is',
          label: 'is',
          value: { type: 'enum' as const, values: services.map((s) => ({ value: s.name, label: s.name })) },
        },
      ],
    },
    {
      key: 'protocol',
      label: 'Protocol',
      defaultOperator: 'is',
      operators: [
        {
          key: 'is',
          label: 'is',
          value: { type: 'enum' as const, values: PROTOCOL_VALUES },
        },
      ],
    },
    {
      key: 'port',
      label: 'Port',
      defaultOperator: 'is',
      operators: [
        {
          key: 'is',
          label: 'is',
          value: { type: 'string' as const },
        },
      ],
    },
  ],
}), [services]);
```

Update `handleChange` to process `saved_service` filters by looking up the service and converting to `RuleService`:
```typescript
const handleChange = useCallback(
  (
    newFilters: ReadonlyArray<PowerSearchFilter>,
    _changeType: PowerSearchChangeType,
    _index: number
  ) => {
    const svcList: RuleService[] = [];
    let currentProtocol = 'TCP';

    for (const f of newFilters) {
      if (f.field === 'saved_service' && f.value.type === 'enum') {
        const svcName = (f.value as FilterValueEnum).value;
        const svc = services.find((s) => s.name === svcName);
        if (svc) {
          svcList.push({ protocol: svc.protocol, port: String(svc.port) });
        }
      } else if (f.field === 'protocol' && f.value.type === 'enum') {
        currentProtocol = (f.value as FilterValueEnum).value;
      } else if (f.field === 'port' && f.value.type === 'string') {
        svcList.push({
          protocol: currentProtocol,
          port: (f.value as FilterValueString).value,
        });
        currentProtocol = 'TCP';
      }
    }
    onChange(svcList);
  },
  [onChange, services]
);
```

Update the return to replace `SERVICE_CONFIG` with `serviceConfig` and wrap in an `HStack` with the "+ Create Service" button:
```tsx
return (
  <>
    <HStack gap={1} vAlign="end">
      <div style={{ flex: 1 }}>
        <PowerSearch
          config={serviceConfig}
          filters={filters}
          onChange={handleChange}
          placeholder="protocol:port…"
          label="Service"
          isDisabled={isDisabled}
          size="sm"
        />
      </div>
      <Button
        label="+ Create Service"
        variant="ghost"
        size="sm"
        onClick={() => setServiceDialogOpen(true)}
      />
    </HStack>
    <ServiceDialog
      isOpen={serviceDialogOpen}
      onClose={() => setServiceDialogOpen(false)}
      onSaved={(newService) => {
        setServices((prev) => [...prev, newService]);
      }}
    />
  </>
);
```

Remove the module-level `SERVICE_CONFIG` constant (it's now inside the component as `serviceConfig`).

- [ ] **Step 2: Update `EndpointEditor.tsx`**

Add imports:
```typescript
import { useState } from 'react';
import { HStack } from '@astryxdesign/core/HStack';
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu';

import type { ObjIpList, ObjLabelGroup } from '../../api/objects.js';
import { IpListDialog } from '../objects/IpListDialog.js';
import { LabelGroupDialog } from '../objects/LabelGroupDialog.js';
```

Note: `HStack` is already imported in EndpointEditor but needs to be verified. `VStack` is already imported.

Inside `EndpointEditor`, add state:
```typescript
const [ipListDialogOpen, setIpListDialogOpen] = useState(false);
const [labelGroupDialogOpen, setLabelGroupDialogOpen] = useState(false);
```

Update the return to add the "+ Create" dropdown and dialogs:
```tsx
return (
  <VStack gap={0.5}>
    <HStack gap={1} vAlign="end">
      <div style={{ flex: 1 }}>
        <PowerSearch
          config={config}
          filters={psFilters}
          onChange={handleChange}
          placeholder="Add labels, workloads, IP lists..."
          label="Endpoint"
          isDisabled={isDisabled}
          size="sm"
        />
      </div>
      <DropdownMenu
        button={{ label: '+ Create', variant: 'ghost', size: 'sm' }}
        items={[
          { label: 'Create IP List', onClick: () => setIpListDialogOpen(true) },
          { label: 'Create Label Group', onClick: () => setLabelGroupDialogOpen(true) },
        ]}
      />
    </HStack>
    {ghostLabels && ghostLabels.length > 0 && <GhostTokens labels={ghostLabels} />}
    <IpListDialog
      isOpen={ipListDialogOpen}
      onClose={() => setIpListDialogOpen(false)}
      onSaved={(newIpList: ObjIpList) => {
        onChange({
          filters: [...value.filters, {
            field: 'ip_list',
            operator: 'is',
            value: { type: 'entity_list', value: [{ id: newIpList.id, label: `${newIpList.name} (${newIpList.cidr})` }] },
          }],
        });
      }}
    />
    <LabelGroupDialog
      isOpen={labelGroupDialogOpen}
      onClose={() => setLabelGroupDialogOpen(false)}
      onSaved={(newLG: ObjLabelGroup) => {
        onChange({
          filters: [...value.filters, {
            field: 'label_group',
            operator: 'is',
            value: { type: 'entity_list', value: [{ id: newLG.id, label: newLG.name }] },
          }],
        });
      }}
    />
  </VStack>
);
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit -p client/tsconfig.json
```

- [ ] **Step 4: Verify in browser**

Start the dev server, navigate to `/policies`, open a policy, and verify:
- Service editor shows "Saved Service" as a new PowerSearch field
- "+ Create Service" button opens the ServiceDialog
- Endpoint editor has "+ Create" dropdown with IP List and Label Group options
- Inline-created objects appear as tokens

- [ ] **Step 5: Commit**

```bash
git add client/src/features/rules/ServiceEditor.tsx client/src/features/rules/EndpointEditor.tsx
git commit -m "feat(objects): integrate named services and inline-create into V1 rule editors"
```

---

## Self-Review

**Spec coverage:**
- Section 1 (Data Model): Task 1 — services table, timestamp columns, migration via schema.sql ✓
- Section 2 (Backend API): Task 2 — full CRUD + delete guards ✓
- Section 3 (Client API): Task 3 — 20 functions, 4 interfaces ✓
- Section 4 (Objects Page): Task 5 — four-tab layout, table columns, delete flow ✓
- Section 5 (Dialogs): Task 4 — all four dialog components ✓
- Section 6 (V2 Integration): Task 6 — V2ServiceEditor + V2EntityEditor ✓
- Section 7 (V1 Integration): Task 7 — ServiceEditor + EndpointEditor ✓
- Section 8 (Seed Data): Task 1 — 5 services + timestamp backfill ✓
- Section 9 (File Summary): All 16 files accounted for ✓
- Backward compatibility (section 2.7): Read-only endpoints untouched ✓

**Placeholder scan:** No TBD, TODO, or placeholder text found.

**Type consistency:** `Service`, `ObjIpList`, `ObjLabelGroup`, `ObjVirtualService` types are consistent across Tasks 3, 4, 5, 6, and 7. Function names match between the API layer and the consuming components.
