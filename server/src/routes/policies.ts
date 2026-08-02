import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

function parsePolicy(row: any) {
  if (!row) return null;
  return { ...row, scope: JSON.parse(row.scope) };
}

function parsePolicyWithRules(row: any, rules: any[]) {
  if (!row) return null;
  return {
    ...row,
    scope: JSON.parse(row.scope),
    rules: rules.map((r: any) => ({
      ...r,
      source: JSON.parse(r.source),
      destination: JSON.parse(r.destination),
      services: JSON.parse(r.services),
    })),
  };
}

// GET / — list policies
router.get('/', (req, res) => {
  const db = getDb();
  let sql = 'SELECT * FROM policies WHERE 1=1';
  const params: string[] = [];
  if (req.query.type) { sql += ' AND type = ?'; params.push(req.query.type as string); }
  if (req.query.status) { sql += ' AND provision_status = ?'; params.push(req.query.status as string); }
  if (req.query.enabled !== undefined) { sql += ' AND enabled = ?'; params.push(req.query.enabled as string); }
  sql += ' ORDER BY name';
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(parsePolicy));
});

// POST / — create policy
router.post('/', (req, res) => {
  const db = getDb();
  const { name, description, scope, type } = req.body;
  const user = (req as AuthenticatedRequest).user;
  const now = new Date().toISOString();
  const id = uuidv4();
  db.prepare(
    `INSERT INTO policies (id, name, description, scope, type, provision_status, enabled, is_locked, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'draft', 1, 0, ?, ?, ?)`
  ).run(id, name, description ?? '', JSON.stringify(scope ?? []), type, user.id, now, now);
  const created = db.prepare('SELECT * FROM policies WHERE id = ?').get(id);
  res.status(201).json(parsePolicy(created));
});

// GET /:id — get single policy with rules
router.get('/:id', (req, res) => {
  const db = getDb();
  const policy = db.prepare('SELECT * FROM policies WHERE id = ?').get(req.params.id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });
  const rules = db.prepare('SELECT * FROM rules WHERE policy_id = ? ORDER BY position').all(req.params.id);
  res.json(parsePolicyWithRules(policy, rules));
});

// PATCH /:id — update policy metadata
router.patch('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM policies WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Policy not found' });

  const { name, description, scope, type, enabled } = req.body;
  const now = new Date().toISOString();
  const newStatus = existing.provision_status === 'provisioned' ? 'pending' : existing.provision_status;

  db.prepare(
    `UPDATE policies SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      scope = COALESCE(?, scope),
      type = COALESCE(?, type),
      enabled = COALESCE(?, enabled),
      provision_status = ?,
      updated_at = ?
     WHERE id = ?`
  ).run(
    name ?? null,
    description ?? null,
    scope !== undefined ? JSON.stringify(scope) : null,
    type ?? null,
    enabled !== undefined ? (enabled ? 1 : 0) : null,
    newStatus,
    now,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM policies WHERE id = ?').get(req.params.id);
  res.json(parsePolicy(updated));
});

// DELETE /:id — delete policy
router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM policies WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Policy not found' });
  db.prepare('DELETE FROM policies WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// POST /:id/lock
router.post('/:id/lock', (req, res) => {
  const db = getDb();
  const user = (req as AuthenticatedRequest).user;
  const existing = db.prepare('SELECT * FROM policies WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Policy not found' });
  const now = new Date().toISOString();
  db.prepare('UPDATE policies SET is_locked = 1, locked_by = ?, locked_at = ? WHERE id = ?').run(user.id, now, req.params.id);
  const updated = db.prepare('SELECT * FROM policies WHERE id = ?').get(req.params.id);
  res.json(parsePolicy(updated));
});

// POST /:id/unlock
router.post('/:id/unlock', (req, res) => {
  const db = getDb();
  const user = (req as AuthenticatedRequest).user;
  if (user.role !== 'global_admin') {
    return res.status(403).json({ error: 'Only global_admin can unlock policies' });
  }
  const existing = db.prepare('SELECT * FROM policies WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Policy not found' });
  db.prepare('UPDATE policies SET is_locked = 0, locked_by = NULL, locked_at = NULL WHERE id = ?').run(req.params.id);
  const updated = db.prepare('SELECT * FROM policies WHERE id = ?').get(req.params.id);
  res.json(parsePolicy(updated));
});

// POST /:id/provision/preview — stub
router.post('/:id/provision/preview', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM policies WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Policy not found' });
  res.json({ added: [], modified: [], removed: [] });
});

// POST /:id/provision/commit
router.post('/:id/provision/commit', (req, res) => {
  const db = getDb();
  const user = (req as AuthenticatedRequest).user;
  const existing = db.prepare('SELECT * FROM policies WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Policy not found' });
  if (existing.is_locked) return res.status(409).json({ error: 'Policy is locked' });

  const now = new Date().toISOString();
  const historyId = uuidv4();
  db.transaction(() => {
    db.prepare("UPDATE policies SET provision_status = 'provisioned', updated_at = ? WHERE id = ?").run(now, req.params.id);
    db.prepare(
      'INSERT INTO provision_history (id, policy_id, provisioned_by, provisioned_at, diff) VALUES (?, ?, ?, ?, ?)'
    ).run(historyId, req.params.id, user.id, now, JSON.stringify([]));
  })();

  const updated = db.prepare('SELECT * FROM policies WHERE id = ?').get(req.params.id);
  res.json(parsePolicy(updated));
});

export default router;
