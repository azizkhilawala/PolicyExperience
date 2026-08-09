import { Router } from 'express';
import { getDb } from '../db/connection.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  let sql = 'SELECT * FROM labels WHERE 1=1';
  const params: string[] = [];
  if (req.query.key) {
    sql += ' AND key = ?';
    params.push(req.query.key as string);
  }
  if (req.query.type) {
    sql += ' AND type = ?';
    params.push(req.query.type as string);
  }
  sql += ' ORDER BY key, value';
  res.json(db.prepare(sql).all(...params));
});

router.get('/groups', (_req, res) => {
  const db = getDb();
  const groups = db.prepare('SELECT * FROM label_groups ORDER BY name').all();
  res.json(groups.map((g: any) => ({ ...g, label_ids: JSON.parse(g.label_ids) })));
});

export default router;
