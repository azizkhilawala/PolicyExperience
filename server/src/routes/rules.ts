import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';

const router = Router();

function parseRule(row: any) {
  if (!row) return null;
  return {
    ...row,
    source: JSON.parse(row.source),
    destination: JSON.parse(row.destination),
    services: JSON.parse(row.services),
  };
}

// Mark parent policy as 'pending' if it was 'provisioned'
function markPolicyPendingIfProvisioned(db: any, policyId: string) {
  const policy = db.prepare('SELECT provision_status FROM policies WHERE id = ?').get(policyId) as any;
  if (policy && policy.provision_status === 'provisioned') {
    const now = new Date().toISOString();
    db.prepare("UPDATE policies SET provision_status = 'pending', updated_at = ? WHERE id = ?").run(now, policyId);
  }
}

// GET /policies/:policyId/rules
router.get('/policies/:policyId/rules', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM rules WHERE policy_id = ? ORDER BY position').all(req.params.policyId);
  res.json(rows.map(parseRule));
});

// POST /policies/:policyId/rules
router.post('/policies/:policyId/rules', (req, res) => {
  const db = getDb();
  const { source, destination, services, action, scope_type } = req.body;
  const { policyId } = req.params;

  const maxRow = db.prepare('SELECT MAX(position) as maxPos FROM rules WHERE policy_id = ?').get(policyId) as any;
  const position = (maxRow?.maxPos ?? -1) + 1;

  const id = uuidv4();
  db.prepare(
    `INSERT INTO rules (id, policy_id, source, destination, services, action, scope_type, enabled, position)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`
  ).run(
    id,
    policyId,
    JSON.stringify(source ?? {}),
    JSON.stringify(destination ?? {}),
    JSON.stringify(services ?? []),
    action ?? 'allow',
    scope_type ?? 'intra',
    position
  );

  markPolicyPendingIfProvisioned(db, policyId);

  const created = db.prepare('SELECT * FROM rules WHERE id = ?').get(id);
  res.status(201).json(parseRule(created));
});

// PATCH /:id — update rule
router.patch('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM rules WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Rule not found' });

  const { source, destination, services, action, scope_type, enabled, position } = req.body;

  db.prepare(
    `UPDATE rules SET
      source = COALESCE(?, source),
      destination = COALESCE(?, destination),
      services = COALESCE(?, services),
      action = COALESCE(?, action),
      scope_type = COALESCE(?, scope_type),
      enabled = COALESCE(?, enabled),
      position = COALESCE(?, position)
     WHERE id = ?`
  ).run(
    source !== undefined ? JSON.stringify(source) : null,
    destination !== undefined ? JSON.stringify(destination) : null,
    services !== undefined ? JSON.stringify(services) : null,
    action ?? null,
    scope_type ?? null,
    enabled !== undefined ? (enabled ? 1 : 0) : null,
    position ?? null,
    req.params.id
  );

  markPolicyPendingIfProvisioned(db, existing.policy_id);

  const updated = db.prepare('SELECT * FROM rules WHERE id = ?').get(req.params.id);
  res.json(parseRule(updated));
});

// DELETE /:id — delete rule
router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM rules WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Rule not found' });

  db.prepare('DELETE FROM rules WHERE id = ?').run(req.params.id);
  markPolicyPendingIfProvisioned(db, existing.policy_id);
  res.status(204).send();
});

// POST /:id/duplicate
router.post('/:id/duplicate', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM rules WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Rule not found' });

  const maxRow = db.prepare('SELECT MAX(position) as maxPos FROM rules WHERE policy_id = ?').get(existing.policy_id) as any;
  const position = (maxRow?.maxPos ?? -1) + 1;
  const newId = uuidv4();

  db.prepare(
    `INSERT INTO rules (id, policy_id, source, destination, services, action, scope_type, enabled, position)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    newId,
    existing.policy_id,
    existing.source,
    existing.destination,
    existing.services,
    existing.action,
    existing.scope_type,
    existing.enabled,
    position
  );

  const created = db.prepare('SELECT * FROM rules WHERE id = ?').get(newId);
  res.status(201).json(parseRule(created));
});

export default router;
