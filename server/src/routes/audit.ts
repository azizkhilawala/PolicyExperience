import { Router } from 'express';
import { getDb } from '../db/connection.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  let where = 'WHERE 1=1';
  const params: (string | number)[] = [];

  if (req.query.entity_type) {
    where += ' AND a.entity_type = ?';
    params.push(req.query.entity_type as string);
  }
  if (req.query.entity_id) {
    where += ' AND a.entity_id = ?';
    params.push(req.query.entity_id as string);
  }
  if (req.query.action) {
    where += ' AND a.action = ?';
    params.push(req.query.action as string);
  }

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));

  const countRow = db
    .prepare(`SELECT COUNT(*) as total FROM audit_log a ${where}`)
    .get(...params) as { total: number };

  const sql = `
    SELECT a.*, u.name as performed_by_name
    FROM audit_log a
    LEFT JOIN users u ON u.id = a.performed_by
    ${where}
    ORDER BY a.performed_at DESC
    LIMIT ? OFFSET ?
  `;
  const rows = db.prepare(sql).all(...params, limit, (page - 1) * limit) as any[];

  res.json({
    data: rows.map((r) => ({ ...r, details: JSON.parse(r.details) })),
    total: countRow.total,
    page,
    limit,
    totalPages: Math.ceil(countRow.total / limit),
  });
});

export default router;
