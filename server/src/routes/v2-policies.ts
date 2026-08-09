import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

function parseV2Policy(row: any) {
  if (!row) return null;
  return {
    ...row,
    scope_cluster_ids: JSON.parse(row.scope_cluster_ids),
    scope_namespace_ids: JSON.parse(row.scope_namespace_ids),
    scope_labels: JSON.parse(row.scope_labels),
  };
}

function parseV2Rule(row: any) {
  if (!row) return null;
  return { ...row, entity: JSON.parse(row.entity), services: JSON.parse(row.services) };
}

// GET /policies — list all v2 policies
router.get('/policies', (_req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM v2_policies ORDER BY name').all();
  res.json(rows.map(parseV2Policy));
});

// GET /policies/:id — get single v2 policy with rules
router.get('/policies/:id', (req, res) => {
  const db = getDb();
  const policy = db.prepare('SELECT * FROM v2_policies WHERE id = ?').get(req.params.id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });
  const parsed = parseV2Policy(policy) as any;
  if (parsed.policy_type === 'guardrail' && parsed.template_id) {
    const template = db
      .prepare('SELECT name FROM v2_templates WHERE id = ?')
      .get(parsed.template_id) as { name: string } | undefined;
    parsed.template_name = template?.name ?? null;
    const templateRules = db
      .prepare('SELECT * FROM v2_template_rules WHERE template_id = ? ORDER BY direction, position')
      .all(parsed.template_id);
    parsed.rules = templateRules.map(parseV2Rule);
  } else {
    const rules = db
      .prepare('SELECT * FROM v2_rules WHERE policy_id = ? ORDER BY direction, position')
      .all(req.params.id);
    parsed.rules = rules.map(parseV2Rule);
  }
  res.json(parsed);
});

// POST /policies — create v2 policy
router.post('/policies', (req, res) => {
  const db = getDb();
  const {
    name,
    description,
    scope_type,
    scope_cluster_ids,
    scope_namespace_ids,
    scope_labels,
    policy_type,
    template_id,
  } = req.body;
  if (!name || !scope_type)
    return res.status(400).json({ error: 'name and scope_type are required' });
  const user = (req as AuthenticatedRequest).user;
  const now = new Date().toISOString();
  const id = uuidv4();
  db.prepare(
    `INSERT INTO v2_policies (id, name, description, scope_type, scope_cluster_ids, scope_namespace_ids, scope_labels, enabled, provision_status, policy_type, template_id, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'draft', ?, ?, ?, ?, ?)`,
  ).run(
    id,
    name,
    description ?? '',
    scope_type,
    JSON.stringify(scope_cluster_ids ?? []),
    JSON.stringify(scope_namespace_ids ?? []),
    JSON.stringify(scope_labels ?? []),
    policy_type ?? 'standard',
    template_id ?? null,
    user.id,
    now,
    now,
  );
  const created = db.prepare('SELECT * FROM v2_policies WHERE id = ?').get(id);
  res.status(201).json(parseV2Policy(created));
});

// PATCH /policies/:id — update v2 policy
router.patch('/policies/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM v2_policies WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Policy not found' });
  const { name, description, enabled } = req.body;
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE v2_policies SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      enabled = COALESCE(?, enabled),
      updated_at = ?
     WHERE id = ?`,
  ).run(
    name ?? null,
    description ?? null,
    enabled !== undefined ? (enabled ? 1 : 0) : null,
    now,
    req.params.id,
  );
  const updated = db.prepare('SELECT * FROM v2_policies WHERE id = ?').get(req.params.id);
  res.json(parseV2Policy(updated));
});

// DELETE /policies/:id
router.delete('/policies/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM v2_policies WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Policy not found' });
  db.prepare('DELETE FROM v2_policies WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// POST /policies/:id/provision — set policy + all draft rules to provisioned
router.post('/policies/:id/provision', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM v2_policies WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Policy not found' });
  const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare(
      "UPDATE v2_policies SET provision_status = 'provisioned', updated_at = ? WHERE id = ?",
    ).run(now, req.params.id);
    db.prepare(
      "UPDATE v2_rules SET provision_status = 'provisioned' WHERE policy_id = ? AND provision_status = 'draft'",
    ).run(req.params.id);
  })();
  const updated = db.prepare('SELECT * FROM v2_policies WHERE id = ?').get(req.params.id);
  res.json(parseV2Policy(updated));
});

// POST /policies/:id/convert-to-template
router.post('/policies/:id/convert-to-template', (req, res) => {
  const db = getDb();
  const policy = db.prepare('SELECT * FROM v2_policies WHERE id = ?').get(req.params.id) as any;
  if (!policy) return res.status(404).json({ error: 'Policy not found' });
  if (policy.policy_type !== 'standard')
    return res.status(400).json({ error: 'Only standard policies can be converted' });
  const { template_name, template_description, convert_policy } = req.body;
  if (!template_name) return res.status(400).json({ error: 'template_name is required' });
  const user = (req as unknown as AuthenticatedRequest).user;
  const now = new Date().toISOString();
  const templateId = uuidv4();
  db.transaction(() => {
    db.prepare(
      `INSERT INTO v2_templates (id, name, description, source, created_by, created_at, updated_at)
       VALUES (?, ?, ?, 'user_created', ?, ?, ?)`,
    ).run(templateId, template_name, template_description ?? '', user.id, now, now);
    const rules = db.prepare('SELECT * FROM v2_rules WHERE policy_id = ?').all(req.params.id);
    const insertTplRule = db.prepare(
      `INSERT INTO v2_template_rules (id, template_id, direction, entity, services, action, enabled, position, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const r of rules as any[]) {
      insertTplRule.run(
        uuidv4(),
        templateId,
        r.direction,
        r.entity,
        r.services,
        r.action,
        r.enabled,
        r.position,
        r.notes,
      );
    }
    if (convert_policy) {
      db.prepare(
        "UPDATE v2_policies SET policy_type = 'guardrail', template_id = ?, updated_at = ? WHERE id = ?",
      ).run(templateId, now, req.params.id);
      db.prepare('DELETE FROM v2_rules WHERE policy_id = ?').run(req.params.id);
    }
  })();
  const template = db.prepare('SELECT * FROM v2_templates WHERE id = ?').get(templateId);
  res.status(201).json(template);
});

// GET /policies/:id/rules — list rules for a v2 policy
router.get('/policies/:id/rules', (req, res) => {
  const db = getDb();
  let sql = 'SELECT * FROM v2_rules WHERE policy_id = ?';
  const params: string[] = [req.params.id];
  if (req.query.direction) {
    sql += ' AND direction = ?';
    params.push(req.query.direction as string);
  }
  sql += ' ORDER BY direction, position';
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(parseV2Rule));
});

// POST /policies/:id/rules — create rule
router.post('/policies/:id/rules', (req, res) => {
  const db = getDb();
  const { direction, entity, services, action } = req.body;
  const policyId = req.params.id;
  const policy = db.prepare('SELECT id FROM v2_policies WHERE id = ?').get(policyId);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });
  if (!direction || !['ingress', 'egress'].includes(direction))
    return res.status(400).json({ error: 'direction must be ingress or egress' });
  const maxRow = db
    .prepare('SELECT MAX(position) as maxPos FROM v2_rules WHERE policy_id = ? AND direction = ?')
    .get(policyId, direction) as any;
  const position = (maxRow?.maxPos ?? -1) + 1;
  const id = uuidv4();
  db.prepare(
    `INSERT INTO v2_rules (id, policy_id, direction, entity, services, action, enabled, provision_status, position, notes)
     VALUES (?, ?, ?, ?, ?, ?, 1, 'draft', ?, '')`,
  ).run(
    id,
    policyId,
    direction,
    JSON.stringify(entity ?? []),
    JSON.stringify(services ?? []),
    action ?? 'allow',
    position,
  );
  const created = db.prepare('SELECT * FROM v2_rules WHERE id = ?').get(id);
  res.status(201).json(parseV2Rule(created));
});

// PATCH /rules/:id — update v2 rule
router.patch('/rules/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM v2_rules WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Rule not found' });
  const { entity, services, action, enabled, notes } = req.body;
  db.prepare(
    `UPDATE v2_rules SET
      entity = COALESCE(?, entity),
      services = COALESCE(?, services),
      action = COALESCE(?, action),
      enabled = COALESCE(?, enabled),
      notes = COALESCE(?, notes)
     WHERE id = ?`,
  ).run(
    entity !== undefined ? JSON.stringify(entity) : null,
    services !== undefined ? JSON.stringify(services) : null,
    action ?? null,
    enabled !== undefined ? (enabled ? 1 : 0) : null,
    notes ?? null,
    req.params.id,
  );
  const updated = db.prepare('SELECT * FROM v2_rules WHERE id = ?').get(req.params.id);
  res.json(parseV2Rule(updated));
});

// DELETE /rules/:id
router.delete('/rules/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM v2_rules WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Rule not found' });
  db.prepare('DELETE FROM v2_rules WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
