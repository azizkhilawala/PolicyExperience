CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('author', 'global_admin'))
);

CREATE TABLE IF NOT EXISTS labels (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'illumio' CHECK (type IN ('illumio', 'k8s')),
  UNIQUE(key, value)
);

CREATE TABLE IF NOT EXISTS label_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  label_ids TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS k8s_clusters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS k8s_namespaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cluster_id TEXT NOT NULL REFERENCES k8s_clusters(id),
  labels TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS ip_lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cidr TEXT NOT NULL,
  description TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS user_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  member_ids TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS virtual_services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  port INTEGER NOT NULL,
  protocol TEXT NOT NULL DEFAULT 'TCP'
);

CREATE TABLE IF NOT EXISTS cloud_accounts (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('aws', 'azure')),
  name TEXT NOT NULL,
  account_id TEXT NOT NULL,
  region TEXT
);

CREATE TABLE IF NOT EXISTS cloud_vpcs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('aws', 'azure')),
  name TEXT NOT NULL,
  vpc_id TEXT NOT NULL,
  cloud_account_id TEXT NOT NULL REFERENCES cloud_accounts(id),
  region TEXT,
  resource_group TEXT
);

CREATE TABLE IF NOT EXISTS cloud_subnets (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('aws', 'azure')),
  name TEXT NOT NULL,
  subnet_id TEXT NOT NULL,
  cloud_vpc_id TEXT NOT NULL REFERENCES cloud_vpcs(id),
  region TEXT
);

CREATE TABLE IF NOT EXISTS workloads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  hostname TEXT NOT NULL,
  ip TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('vm', 'k8s_pod')),
  labels TEXT NOT NULL DEFAULT '[]',
  cluster_id TEXT REFERENCES k8s_clusters(id),
  namespace_id TEXT REFERENCES k8s_namespaces(id)
);

CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('organizational', 'application')),
  scope TEXT NOT NULL DEFAULT '[]',
  enabled INTEGER NOT NULL DEFAULT 1,
  provision_status TEXT NOT NULL DEFAULT 'draft' CHECK (provision_status IN ('draft', 'provisioned', 'pending')),
  is_locked INTEGER NOT NULL DEFAULT 0,
  locked_by TEXT REFERENCES users(id),
  locked_at TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rules (
  id TEXT PRIMARY KEY,
  policy_id TEXT NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT '{}',
  destination TEXT NOT NULL DEFAULT '{}',
  services TEXT NOT NULL DEFAULT '[]',
  action TEXT NOT NULL DEFAULT 'allow' CHECK (action IN ('allow', 'deny')),
  scope_type TEXT NOT NULL DEFAULT 'intra' CHECK (scope_type IN ('intra', 'extra')),
  enabled INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  logging INTEGER DEFAULT 0,
  stateless INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS provisioned_rules (
  id TEXT PRIMARY KEY,
  policy_id TEXT NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  rule_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT '{}',
  destination TEXT NOT NULL DEFAULT '{}',
  services TEXT NOT NULL DEFAULT '[]',
  action TEXT NOT NULL DEFAULT 'allow',
  scope_type TEXT NOT NULL DEFAULT 'intra',
  enabled INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  logging INTEGER DEFAULT 0,
  stateless INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tenant_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS provision_history (
  id TEXT PRIMARY KEY,
  policy_id TEXT NOT NULL REFERENCES policies(id),
  provisioned_by TEXT NOT NULL REFERENCES users(id),
  provisioned_at TEXT NOT NULL,
  diff TEXT NOT NULL DEFAULT '[]'
);
