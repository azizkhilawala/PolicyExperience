import { Router } from 'express';
import { getDb } from '../db/connection.js';

const router = Router();

router.get('/', (_req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM tenant_settings').all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const row of rows) settings[row.key] = row.value;
  res.json(settings);
});

router.patch('/:key', (req, res) => {
  const db = getDb();
  const { value } = req.body;
  db.prepare('INSERT OR REPLACE INTO tenant_settings (key, value) VALUES (?, ?)').run(req.params.key, value);
  res.json({ key: req.params.key, value });
});

export default router;
