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
