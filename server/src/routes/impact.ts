import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { computeImpact, type LabelPair } from '../lib/impact.js';

const router = Router();

router.post('/compute', (req, res) => {
  const db = getDb();
  const { scope_labels } = req.body as { scope_labels: LabelPair[] };

  if (!Array.isArray(scope_labels)) {
    res.status(400).json({ error: 'scope_labels must be an array of {key, value}' });
    return;
  }

  const result = computeImpact(db, scope_labels);
  res.json(result);
});

export default router;
