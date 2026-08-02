import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

router.get('/me', (req, res) => {
  res.json((req as AuthenticatedRequest).user);
});

router.post('/switch-user', (req, res) => {
  const { userId } = req.body;
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.get('/users', (_req, res) => {
  const db = getDb();
  const users = db.prepare('SELECT * FROM users').all();
  res.json(users);
});

export default router;
