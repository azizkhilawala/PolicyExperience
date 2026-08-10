import { Router } from 'express';
import { getDb } from '../db/connection.js';
import type { LabelPair } from '../lib/impact.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const conditions: string[] = ['1=1'];
  const params: (string | number)[] = [];

  if (req.query.type) {
    conditions.push('type = ?');
    params.push(req.query.type as string);
  }
  if (req.query.namespace_id) {
    conditions.push('namespace_id = ?');
    params.push(req.query.namespace_id as string);
  }
  if (req.query.managed !== undefined) {
    conditions.push('managed = ?');
    params.push(Number(req.query.managed));
  }
  if (req.query.online !== undefined) {
    conditions.push('online = ?');
    params.push(Number(req.query.online));
  }
  if (req.query.enforcement_mode) {
    conditions.push('enforcement_mode = ?');
    params.push(req.query.enforcement_mode as string);
  }
  if (req.query.search) {
    conditions.push("(name LIKE ? OR hostname LIKE ?)");
    const term = `%${req.query.search}%`;
    params.push(term, term);
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const offset = (page - 1) * limit;

  const where = conditions.join(' AND ');
  const totalRow = db
    .prepare(`SELECT count(*) as c FROM workloads WHERE ${where}`)
    .get(...params) as { c: number };

  const rows = db
    .prepare(`SELECT * FROM workloads WHERE ${where} ORDER BY name LIMIT ? OFFSET ?`)
    .all(...params, limit, offset) as any[];

  const data = rows.map((r) => ({ ...r, labels: JSON.parse(r.labels) }));

  // Post-filter by label if requested (labels are JSON, can't do in SQL easily)
  let filtered = data;
  if (req.query.label_key && req.query.label_value) {
    const lk = req.query.label_key as string;
    const lv = req.query.label_value as string;
    filtered = data.filter((w: any) =>
      w.labels.some((l: LabelPair) => l.key === lk && l.value === lv),
    );
  }

  res.json({ data: filtered, total: totalRow.c, page, limit });
});

router.get('/label-summary', (_req, res) => {
  const db = getDb();
  const rows = db
    .prepare('SELECT labels FROM workloads')
    .all() as Array<{ labels: string }>;

  const summary: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    const labels: LabelPair[] = JSON.parse(row.labels);
    for (const l of labels) {
      if (!summary[l.key]) summary[l.key] = {};
      summary[l.key][l.value] = (summary[l.key][l.value] ?? 0) + 1;
    }
  }
  res.json(summary);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM workloads WHERE id = ?')
    .get(req.params.id) as any;
  if (!row) {
    res.status(404).json({ error: 'Workload not found' });
    return;
  }
  res.json({ ...row, labels: JSON.parse(row.labels) });
});

router.patch('/:id/labels', (req, res) => {
  const db = getDb();
  const { labels } = req.body as { labels: LabelPair[] };
  if (!Array.isArray(labels)) {
    res.status(400).json({ error: 'labels must be an array of {key, value}' });
    return;
  }

  const seen = new Set<string>();
  for (const l of labels) {
    if (seen.has(l.key)) {
      res
        .status(400)
        .json({ error: `Duplicate label dimension: ${l.key}` });
      return;
    }
    seen.add(l.key);
  }

  const now = new Date().toISOString();
  const result = db
    .prepare('UPDATE workloads SET labels = ?, updated_at = ? WHERE id = ?')
    .run(JSON.stringify(labels), now, req.params.id);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Workload not found' });
    return;
  }

  const row = db
    .prepare('SELECT * FROM workloads WHERE id = ?')
    .get(req.params.id) as any;
  res.json({ ...row, labels: JSON.parse(row.labels) });
});

router.post('/bulk-labels', (req, res) => {
  const db = getDb();
  const { workload_ids, labels, mode } = req.body as {
    workload_ids: string[];
    labels: LabelPair[];
    mode: 'merge' | 'replace';
  };

  if (!Array.isArray(workload_ids) || !Array.isArray(labels)) {
    res.status(400).json({ error: 'workload_ids and labels are required arrays' });
    return;
  }

  const now = new Date().toISOString();
  let updated = 0;

  const updateStmt = db.prepare(
    'UPDATE workloads SET labels = ?, updated_at = ? WHERE id = ?',
  );
  const selectStmt = db.prepare('SELECT labels FROM workloads WHERE id = ?');

  const txn = db.transaction(() => {
    for (const id of workload_ids) {
      if (mode === 'replace') {
        const result = updateStmt.run(JSON.stringify(labels), now, id);
        updated += result.changes;
      } else {
        const row = selectStmt.get(id) as { labels: string } | undefined;
        if (!row) continue;
        const existing: LabelPair[] = JSON.parse(row.labels);
        const merged = [...existing];
        for (const newLabel of labels) {
          const idx = merged.findIndex((l) => l.key === newLabel.key);
          if (idx >= 0) {
            merged[idx] = newLabel;
          } else {
            merged.push(newLabel);
          }
        }
        const result = updateStmt.run(JSON.stringify(merged), now, id);
        updated += result.changes;
      }
    }
  });
  txn();

  res.json({ updated });
});

export default router;
