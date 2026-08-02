import { Router } from 'express';
import { getDb } from '../db/connection.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  let sql = 'SELECT * FROM workloads WHERE 1=1';
  const params: string[] = [];
  if (req.query.type) { sql += ' AND type = ?'; params.push(req.query.type as string); }
  sql += ' ORDER BY name';
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map((r: any) => ({ ...r, labels: JSON.parse(r.labels) })));
});

export default router;
