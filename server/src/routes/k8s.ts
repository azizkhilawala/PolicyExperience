import { Router } from 'express';
import { getDb } from '../db/connection.js';

const router = Router();

router.get('/clusters', (_req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM k8s_clusters ORDER BY name').all());
});

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

export default router;
