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
