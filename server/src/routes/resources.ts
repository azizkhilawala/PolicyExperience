import { Router } from 'express';
import { getDb } from '../db/connection.js';

const router = Router();

// GET /api/ip-lists
router.get('/ip-lists', (_req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT id, name, cidr, description FROM ip_lists ORDER BY name').all());
});

// GET /api/user-groups
router.get('/user-groups', (_req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT id, name, member_ids FROM user_groups ORDER BY name').all();
  res.json(rows.map((r: any) => ({ ...r, member_ids: JSON.parse(r.member_ids) })));
});

// GET /api/virtual-services
router.get('/virtual-services', (_req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT id, name, port, protocol FROM virtual_services ORDER BY name').all());
});

// GET /api/label-groups
router.get('/label-groups', (_req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT id, name, label_ids FROM label_groups ORDER BY name').all();
  res.json(rows.map((r: any) => ({ ...r, label_ids: JSON.parse(r.label_ids) })));
});

// GET /api/cloud/accounts?provider=aws|azure
router.get('/cloud/accounts', (req, res) => {
  const db = getDb();
  let sql = 'SELECT id, provider, name, account_id, region FROM cloud_accounts WHERE 1=1';
  const params: string[] = [];
  if (req.query.provider) {
    sql += ' AND provider = ?';
    params.push(req.query.provider as string);
  }
  sql += ' ORDER BY name';
  res.json(db.prepare(sql).all(...params));
});

// GET /api/cloud/vpcs?provider=aws|azure&account_id=X
router.get('/cloud/vpcs', (req, res) => {
  const db = getDb();
  let sql = 'SELECT id, provider, name, vpc_id, cloud_account_id, region, resource_group FROM cloud_vpcs WHERE 1=1';
  const params: string[] = [];
  if (req.query.provider) {
    sql += ' AND provider = ?';
    params.push(req.query.provider as string);
  }
  if (req.query.account_id) {
    sql += ' AND cloud_account_id = ?';
    params.push(req.query.account_id as string);
  }
  sql += ' ORDER BY name';
  res.json(db.prepare(sql).all(...params));
});

// GET /api/cloud/subnets?provider=aws|azure&vpc_id=X
router.get('/cloud/subnets', (req, res) => {
  const db = getDb();
  let sql = 'SELECT id, provider, name, subnet_id, cloud_vpc_id, region FROM cloud_subnets WHERE 1=1';
  const params: string[] = [];
  if (req.query.provider) {
    sql += ' AND provider = ?';
    params.push(req.query.provider as string);
  }
  if (req.query.vpc_id) {
    sql += ' AND cloud_vpc_id = ?';
    params.push(req.query.vpc_id as string);
  }
  sql += ' ORDER BY name';
  res.json(db.prepare(sql).all(...params));
});

export default router;
