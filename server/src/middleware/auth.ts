import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db/connection.js';

export interface AuthenticatedRequest extends Request {
  user: { id: string; name: string; email: string; role: string };
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const db = getDb();
  const userId = req.headers['x-user-id'] as string | undefined;

  let user;
  if (userId) {
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  }
  if (!user) {
    user = db.prepare('SELECT * FROM users ORDER BY role ASC LIMIT 1').get();
  }

  (req as AuthenticatedRequest).user = user as AuthenticatedRequest['user'];
  next();
}
