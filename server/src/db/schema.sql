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
  label_ids TEXT NOT NULL DEFAULT '[]',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT '2026-07-28T10:00:00Z',
  updated_at TEXT NOT NULL DEFAULT '2026-07-28T10:00:00Z'
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
  description TEXT DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT '2026-07-28T10:00:00Z',
  updated_at TEXT NOT NULL DEFAULT '2026-07-28T10:00:00Z'
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
  protocol TEXT NOT NULL DEFAULT 'TCP',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT '2026-07-28T10:00:00Z',
  updated_at TEXT NOT NULL DEFAULT '2026-07-28T10:00:00Z'
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  port INTEGER NOT NULL,
  to_port INTEGER,
  protocol TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
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
  namespace_id TEXT REFERENCES k8s_namespaces(id),
  managed INTEGER NOT NULL DEFAULT 1,
  online INTEGER NOT NULL DEFAULT 1,
  enforcement_mode TEXT NOT NULL DEFAULT 'visibility_only'
    CHECK (enforcement_mode IN ('idle', 'visibility_only', 'selective', 'full')),
  os_type TEXT DEFAULT NULL
    CHECK (os_type IS NULL OR os_type IN ('linux', 'windows')),
  os_detail TEXT DEFAULT '',
  ven_version TEXT DEFAULT NULL,
  ven_status TEXT DEFAULT 'active'
    CHECK (ven_status IN ('active', 'suspended', 'stopped', 'uninstalled')),
  last_heartbeat_at TEXT DEFAULT NULL,
  public_ip TEXT DEFAULT NULL,
  data_center TEXT DEFAULT '',
  service_provider TEXT DEFAULT ''
    CHECK (service_provider IN ('', 'aws', 'azure', 'gcp', 'on-prem')),
  description TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT '2026-07-28T10:00:00Z',
  updated_at TEXT NOT NULL DEFAULT '2026-07-28T10:00:00Z'
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

CREATE TABLE IF NOT EXISTS v2_policies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  scope_type TEXT NOT NULL CHECK (scope_type IN ('all_workloads', 'labels', 'k8s')),
  scope_cluster_ids TEXT NOT NULL DEFAULT '[]',
  scope_namespace_ids TEXT NOT NULL DEFAULT '[]',
  scope_labels TEXT NOT NULL DEFAULT '[]',
  enabled INTEGER NOT NULL DEFAULT 1,
  provision_status TEXT NOT NULL DEFAULT 'draft' CHECK (provision_status IN ('draft', 'provisioned')),
  policy_type TEXT NOT NULL DEFAULT 'standard' CHECK (policy_type IN ('standard', 'guardrail')),
  template_id TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS v2_rules (
  id TEXT PRIMARY KEY,
  policy_id TEXT NOT NULL REFERENCES v2_policies(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('ingress', 'egress')),
  entity TEXT NOT NULL DEFAULT '[]',
  services TEXT NOT NULL DEFAULT '[]',
  action TEXT NOT NULL DEFAULT 'allow' CHECK (action IN ('allow', 'deny', 'override_deny')),
  enabled INTEGER NOT NULL DEFAULT 1,
  provision_status TEXT NOT NULL DEFAULT 'draft' CHECK (provision_status IN ('draft', 'provisioned')),
  position INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS v2_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  source TEXT NOT NULL DEFAULT 'user_created' CHECK (source IN ('illumio_suggested', 'user_created')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS v2_template_rules (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES v2_templates(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('ingress', 'egress')),
  entity TEXT NOT NULL DEFAULT '[]',
  services TEXT NOT NULL DEFAULT '[]',
  action TEXT NOT NULL DEFAULT 'allow' CHECK (action IN ('allow', 'deny', 'override_deny')),
  enabled INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS k8s_label_mapping_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  enabled INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 0,
  match_mode TEXT NOT NULL CHECK(match_mode IN ('guided', 'expression')),
  conditions TEXT DEFAULT '[]',
  condition_logic TEXT DEFAULT 'AND' CHECK(condition_logic IN ('AND', 'OR')),
  expression TEXT DEFAULT '',
  target_dimension TEXT NOT NULL CHECK(target_dimension IN ('role', 'app', 'env', 'loc')),
  target_value_mode TEXT NOT NULL CHECK(target_value_mode IN ('static', 'copy', 'regex_capture', 'transform')),
  target_value TEXT DEFAULT '',
  target_source_field TEXT DEFAULT '',
  target_transform TEXT DEFAULT '',
  regex_pattern TEXT DEFAULT '',
  regex_capture_group INTEGER DEFAULT 1,
  conflict_behavior TEXT DEFAULT 'skip' CHECK(conflict_behavior IN ('skip', 'overwrite_mapped', 'flag', 'priority_wins')),
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workload_label_mappings (
  id TEXT PRIMARY KEY,
  workload_id TEXT NOT NULL REFERENCES workloads(id) ON DELETE CASCADE,
  rule_id TEXT NOT NULL REFERENCES k8s_label_mapping_rules(id) ON DELETE CASCADE,
  label_dimension TEXT NOT NULL CHECK(label_dimension IN ('role', 'app', 'env', 'loc')),
  label_value TEXT NOT NULL,
  provenance TEXT DEFAULT 'mapping-rule',
  conflict INTEGER DEFAULT 0,
  conflict_detail TEXT DEFAULT '',
  evaluated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  performed_at TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '{}'
);
