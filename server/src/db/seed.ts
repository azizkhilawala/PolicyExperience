import { v4 as uuid } from 'uuid';
import { getDb } from './connection.js';

// ─── Fixed UUIDs ─────────────────────────────────────────────────────────────

// Users
const USER_ALEX = 'user-alex-chen-0001';
const USER_MORGAN = 'user-morgan-davis-0002';

// Labels — app
const LBL_APP_HRM = 'lbl-app-hrm-0001';
const LBL_APP_ERP = 'lbl-app-erp-0002';
const LBL_APP_CRM = 'lbl-app-crm-0003';
const LBL_APP_PAYMENT = 'lbl-app-payment-0004';
const LBL_APP_ANALYTICS = 'lbl-app-analytics-0005';

// Labels — env
const LBL_ENV_PROD = 'lbl-env-prod-0006';
const LBL_ENV_DEV = 'lbl-env-dev-0007';
const LBL_ENV_STAGING = 'lbl-env-staging-0008';

// Labels — loc
const LBL_LOC_USEAST = 'lbl-loc-useast-0009';
const LBL_LOC_USWEST = 'lbl-loc-uswest-0010';
const LBL_LOC_EUWEST = 'lbl-loc-euwest-0011';

// Labels — role
const LBL_ROLE_WEB = 'lbl-role-web-0012';
const LBL_ROLE_DB = 'lbl-role-db-0013';
const LBL_ROLE_API = 'lbl-role-api-0014';
const LBL_ROLE_CACHE = 'lbl-role-cache-0015';
const LBL_ROLE_WORKER = 'lbl-role-worker-0016';
const LBL_ROLE_LB = 'lbl-role-lb-0017';

// K8s clusters
const CLUSTER_USEAST = 'cluster-useast-prod-0001';
const CLUSTER_EUWEST = 'cluster-euwest-stg-0002';

// K8s namespaces — us-east
const NS_PAYMENTS = 'ns-payments-0001';
const NS_WEB_FRONTEND = 'ns-web-frontend-0002';
const NS_MONITORING = 'ns-monitoring-0003';
const NS_BACKEND = 'ns-backend-services-0004';

// K8s namespaces — eu-west
const NS_PAYMENTS_STG = 'ns-payments-stg-0005';
const NS_WEB_STG = 'ns-web-stg-0006';
const NS_MONITORING_STG = 'ns-monitoring-stg-0007';
const NS_BACKEND_STG = 'ns-backend-stg-0008';

// Policies
const POLICY_HRM = 'policy-hrm-prod-access-0001';
const POLICY_ERP = 'policy-erp-db-access-0002';
const POLICY_K8S = 'policy-k8s-frontend-0003';
const POLICY_DENY = 'policy-global-deny-0004';
const POLICY_PAYMENT = 'policy-payment-gw-0005';

// ─── Main seed function ───────────────────────────────────────────────────────

const db = getDb();

const seed = db.transaction(() => {
  // Clear all tables in reverse FK order
  db.exec(`
    DELETE FROM provision_history;
    DELETE FROM rules;
    DELETE FROM policies;
    DELETE FROM workloads;
    DELETE FROM k8s_namespaces;
    DELETE FROM k8s_clusters;
    DELETE FROM label_groups;
    DELETE FROM labels;
    DELETE FROM tenant_settings;
    DELETE FROM users;
  `);

  // ── Users ──────────────────────────────────────────────────────────────────
  const insertUser = db.prepare(
    'INSERT INTO users (id, name, email, role) VALUES (?, ?, ?, ?)'
  );
  insertUser.run(USER_ALEX, 'Alex Chen', 'alex.chen@illumio.com', 'author');
  insertUser.run(USER_MORGAN, 'Morgan Davis', 'morgan.davis@illumio.com', 'global_admin');

  // ── Labels ─────────────────────────────────────────────────────────────────
  const insertLabel = db.prepare(
    'INSERT INTO labels (id, key, value, type) VALUES (?, ?, ?, ?)'
  );
  // app labels
  insertLabel.run(LBL_APP_HRM, 'app', 'HRM', 'illumio');
  insertLabel.run(LBL_APP_ERP, 'app', 'ERP', 'illumio');
  insertLabel.run(LBL_APP_CRM, 'app', 'CRM', 'illumio');
  insertLabel.run(LBL_APP_PAYMENT, 'app', 'PaymentGateway', 'illumio');
  insertLabel.run(LBL_APP_ANALYTICS, 'app', 'Analytics', 'illumio');
  // env labels
  insertLabel.run(LBL_ENV_PROD, 'env', 'prod', 'illumio');
  insertLabel.run(LBL_ENV_DEV, 'env', 'dev', 'illumio');
  insertLabel.run(LBL_ENV_STAGING, 'env', 'staging', 'illumio');
  // loc labels
  insertLabel.run(LBL_LOC_USEAST, 'loc', 'us-east', 'illumio');
  insertLabel.run(LBL_LOC_USWEST, 'loc', 'us-west', 'illumio');
  insertLabel.run(LBL_LOC_EUWEST, 'loc', 'eu-west', 'illumio');
  // role labels
  insertLabel.run(LBL_ROLE_WEB, 'role', 'web', 'illumio');
  insertLabel.run(LBL_ROLE_DB, 'role', 'db', 'illumio');
  insertLabel.run(LBL_ROLE_API, 'role', 'api', 'illumio');
  insertLabel.run(LBL_ROLE_CACHE, 'role', 'cache', 'illumio');
  insertLabel.run(LBL_ROLE_WORKER, 'role', 'worker', 'illumio');
  insertLabel.run(LBL_ROLE_LB, 'role', 'load-balancer', 'illumio');

  // ── K8s Clusters ───────────────────────────────────────────────────────────
  const insertCluster = db.prepare(
    'INSERT INTO k8s_clusters (id, name, region) VALUES (?, ?, ?)'
  );
  insertCluster.run(CLUSTER_USEAST, 'us-east-prod', 'us-east-1');
  insertCluster.run(CLUSTER_EUWEST, 'eu-west-staging', 'eu-west-1');

  // ── K8s Namespaces ─────────────────────────────────────────────────────────
  const insertNs = db.prepare(
    'INSERT INTO k8s_namespaces (id, name, cluster_id, labels) VALUES (?, ?, ?, ?)'
  );
  // us-east-prod namespaces
  insertNs.run(NS_PAYMENTS, 'payments', CLUSTER_USEAST, JSON.stringify([{ key: 'team', value: 'payments' }]));
  insertNs.run(NS_WEB_FRONTEND, 'web-frontend', CLUSTER_USEAST, JSON.stringify([{ key: 'team', value: 'frontend' }]));
  insertNs.run(NS_MONITORING, 'monitoring', CLUSTER_USEAST, JSON.stringify([{ key: 'team', value: 'ops' }]));
  insertNs.run(NS_BACKEND, 'backend-services', CLUSTER_USEAST, JSON.stringify([{ key: 'team', value: 'backend' }]));
  // eu-west-staging namespaces
  insertNs.run(NS_PAYMENTS_STG, 'payments-stg', CLUSTER_EUWEST, JSON.stringify([{ key: 'team', value: 'payments' }]));
  insertNs.run(NS_WEB_STG, 'web-stg', CLUSTER_EUWEST, JSON.stringify([{ key: 'team', value: 'frontend' }]));
  insertNs.run(NS_MONITORING_STG, 'monitoring-stg', CLUSTER_EUWEST, JSON.stringify([{ key: 'team', value: 'ops' }]));
  insertNs.run(NS_BACKEND_STG, 'backend-stg', CLUSTER_EUWEST, JSON.stringify([{ key: 'team', value: 'backend' }]));

  // ── Workloads ──────────────────────────────────────────────────────────────
  const insertWorkload = db.prepare(
    'INSERT INTO workloads (id, name, hostname, ip, type, labels, cluster_id, namespace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );

  // VMs (~30): HRM (10), ERP (10), CRM (10)
  // HRM prod VMs
  const hrmVms = [
    { name: 'hrm-web-01', role: 'web', env: 'prod', loc: 'us-east', ip: '10.1.1.1' },
    { name: 'hrm-web-02', role: 'web', env: 'prod', loc: 'us-east', ip: '10.1.1.2' },
    { name: 'hrm-api-01', role: 'api', env: 'prod', loc: 'us-east', ip: '10.1.2.1' },
    { name: 'hrm-api-02', role: 'api', env: 'prod', loc: 'us-east', ip: '10.1.2.2' },
    { name: 'hrm-db-01', role: 'db', env: 'prod', loc: 'us-east', ip: '10.1.3.1' },
    { name: 'hrm-db-02', role: 'db', env: 'prod', loc: 'us-east', ip: '10.1.3.2' },
    { name: 'hrm-cache-01', role: 'cache', env: 'prod', loc: 'us-east', ip: '10.1.4.1' },
    { name: 'hrm-worker-01', role: 'worker', env: 'prod', loc: 'us-east', ip: '10.1.5.1' },
    { name: 'hrm-lb-01', role: 'load-balancer', env: 'prod', loc: 'us-east', ip: '10.1.6.1' },
    { name: 'hrm-api-dev-01', role: 'api', env: 'dev', loc: 'us-west', ip: '10.2.1.1' },
  ];

  for (const vm of hrmVms) {
    insertWorkload.run(
      uuid(), vm.name, `${vm.name}.illumio.internal`, vm.ip, 'vm',
      JSON.stringify([
        { key: 'app', value: 'HRM' },
        { key: 'role', value: vm.role },
        { key: 'env', value: vm.env },
        { key: 'loc', value: vm.loc },
      ]),
      null, null
    );
  }

  // ERP VMs
  const erpVms = [
    { name: 'erp-web-01', role: 'web', env: 'prod', loc: 'us-east', ip: '10.3.1.1' },
    { name: 'erp-web-02', role: 'web', env: 'prod', loc: 'us-west', ip: '10.3.1.2' },
    { name: 'erp-api-01', role: 'api', env: 'prod', loc: 'us-east', ip: '10.3.2.1' },
    { name: 'erp-api-02', role: 'api', env: 'prod', loc: 'us-east', ip: '10.3.2.2' },
    { name: 'erp-db-01', role: 'db', env: 'prod', loc: 'us-east', ip: '10.3.3.1' },
    { name: 'erp-db-02', role: 'db', env: 'prod', loc: 'us-east', ip: '10.3.3.2' },
    { name: 'erp-cache-01', role: 'cache', env: 'prod', loc: 'us-east', ip: '10.3.4.1' },
    { name: 'erp-worker-01', role: 'worker', env: 'prod', loc: 'us-east', ip: '10.3.5.1' },
    { name: 'erp-lb-01', role: 'load-balancer', env: 'prod', loc: 'us-east', ip: '10.3.6.1' },
    { name: 'erp-api-staging-01', role: 'api', env: 'staging', loc: 'eu-west', ip: '10.4.1.1' },
  ];

  for (const vm of erpVms) {
    insertWorkload.run(
      uuid(), vm.name, `${vm.name}.illumio.internal`, vm.ip, 'vm',
      JSON.stringify([
        { key: 'app', value: 'ERP' },
        { key: 'role', value: vm.role },
        { key: 'env', value: vm.env },
        { key: 'loc', value: vm.loc },
      ]),
      null, null
    );
  }

  // CRM VMs
  const crmVms = [
    { name: 'crm-web-01', role: 'web', env: 'prod', loc: 'us-east', ip: '10.5.1.1' },
    { name: 'crm-web-02', role: 'web', env: 'prod', loc: 'us-west', ip: '10.5.1.2' },
    { name: 'crm-api-01', role: 'api', env: 'prod', loc: 'us-east', ip: '10.5.2.1' },
    { name: 'crm-api-02', role: 'api', env: 'prod', loc: 'us-east', ip: '10.5.2.2' },
    { name: 'crm-db-01', role: 'db', env: 'prod', loc: 'us-east', ip: '10.5.3.1' },
    { name: 'crm-db-02', role: 'db', env: 'prod', loc: 'us-east', ip: '10.5.3.2' },
    { name: 'crm-cache-01', role: 'cache', env: 'prod', loc: 'us-east', ip: '10.5.4.1' },
    { name: 'crm-worker-01', role: 'worker', env: 'prod', loc: 'us-east', ip: '10.5.5.1' },
    { name: 'crm-lb-01', role: 'load-balancer', env: 'prod', loc: 'us-east', ip: '10.5.6.1' },
    { name: 'crm-api-dev-01', role: 'api', env: 'dev', loc: 'us-west', ip: '10.6.1.1' },
  ];

  for (const vm of crmVms) {
    insertWorkload.run(
      uuid(), vm.name, `${vm.name}.illumio.internal`, vm.ip, 'vm',
      JSON.stringify([
        { key: 'app', value: 'CRM' },
        { key: 'role', value: vm.role },
        { key: 'env', value: vm.env },
        { key: 'loc', value: vm.loc },
      ]),
      null, null
    );
  }

  // K8s pods (~20) — 10 in us-east-prod, 10 in eu-west-staging
  const usEastPods = [
    { name: 'payment-processor-abc12', ns: NS_PAYMENTS, app: 'payment-processor', tier: 'backend', version: 'v2.1', ip: '172.16.1.1' },
    { name: 'payment-processor-def34', ns: NS_PAYMENTS, app: 'payment-processor', tier: 'backend', version: 'v2.1', ip: '172.16.1.2' },
    { name: 'checkout-ghi56', ns: NS_PAYMENTS, app: 'checkout', tier: 'frontend', version: 'v1.5', ip: '172.16.1.3' },
    { name: 'web-frontend-jkl78', ns: NS_WEB_FRONTEND, app: 'web', tier: 'frontend', version: 'v3.0', ip: '172.16.2.1' },
    { name: 'web-frontend-mno90', ns: NS_WEB_FRONTEND, app: 'web', tier: 'frontend', version: 'v3.0', ip: '172.16.2.2' },
    { name: 'prometheus-pqr12', ns: NS_MONITORING, app: 'prometheus', tier: 'monitoring', version: 'v2.45', ip: '172.16.3.1' },
    { name: 'grafana-stu34', ns: NS_MONITORING, app: 'grafana', tier: 'monitoring', version: 'v9.4', ip: '172.16.3.2' },
    { name: 'backend-api-vwx56', ns: NS_BACKEND, app: 'backend-api', tier: 'backend', version: 'v1.8', ip: '172.16.4.1' },
    { name: 'backend-api-yza78', ns: NS_BACKEND, app: 'backend-api', tier: 'backend', version: 'v1.8', ip: '172.16.4.2' },
    { name: 'worker-bcd90', ns: NS_BACKEND, app: 'worker', tier: 'worker', version: 'v1.2', ip: '172.16.4.3' },
  ];

  for (const pod of usEastPods) {
    insertWorkload.run(
      uuid(), pod.name, `${pod.name}.${pod.ns}`, pod.ip, 'k8s_pod',
      JSON.stringify([
        { key: 'app', value: pod.app },
        { key: 'tier', value: pod.tier },
        { key: 'version', value: pod.version },
      ]),
      CLUSTER_USEAST, pod.ns
    );
  }

  const euWestPods = [
    { name: 'payment-stg-abc12', ns: NS_PAYMENTS_STG, app: 'payment-processor', tier: 'backend', version: 'v2.0', ip: '172.17.1.1' },
    { name: 'payment-stg-def34', ns: NS_PAYMENTS_STG, app: 'payment-processor', tier: 'backend', version: 'v2.0', ip: '172.17.1.2' },
    { name: 'checkout-stg-ghi56', ns: NS_PAYMENTS_STG, app: 'checkout', tier: 'frontend', version: 'v1.4', ip: '172.17.1.3' },
    { name: 'web-stg-jkl78', ns: NS_WEB_STG, app: 'web', tier: 'frontend', version: 'v2.9', ip: '172.17.2.1' },
    { name: 'web-stg-mno90', ns: NS_WEB_STG, app: 'web', tier: 'frontend', version: 'v2.9', ip: '172.17.2.2' },
    { name: 'prometheus-stg-pqr12', ns: NS_MONITORING_STG, app: 'prometheus', tier: 'monitoring', version: 'v2.44', ip: '172.17.3.1' },
    { name: 'grafana-stg-stu34', ns: NS_MONITORING_STG, app: 'grafana', tier: 'monitoring', version: 'v9.3', ip: '172.17.3.2' },
    { name: 'backend-stg-vwx56', ns: NS_BACKEND_STG, app: 'backend-api', tier: 'backend', version: 'v1.7', ip: '172.17.4.1' },
    { name: 'backend-stg-yza78', ns: NS_BACKEND_STG, app: 'backend-api', tier: 'backend', version: 'v1.7', ip: '172.17.4.2' },
    { name: 'worker-stg-bcd90', ns: NS_BACKEND_STG, app: 'worker', tier: 'worker', version: 'v1.1', ip: '172.17.4.3' },
  ];

  for (const pod of euWestPods) {
    insertWorkload.run(
      uuid(), pod.name, `${pod.name}.${pod.ns}`, pod.ip, 'k8s_pod',
      JSON.stringify([
        { key: 'app', value: pod.app },
        { key: 'tier', value: pod.tier },
        { key: 'version', value: pod.version },
      ]),
      CLUSTER_EUWEST, pod.ns
    );
  }

  // ── Policies ───────────────────────────────────────────────────────────────
  const insertPolicy = db.prepare(`
    INSERT INTO policies
      (id, name, description, type, scope, enabled, provision_status, is_locked, locked_by, locked_at, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = '2026-07-28T10:00:00Z';

  // Policy 1: HRM Production Access
  insertPolicy.run(
    POLICY_HRM,
    'HRM Production Access',
    'Controls traffic within the HRM production environment',
    'application',
    JSON.stringify([{ key: 'app', value: 'HRM' }, { key: 'env', value: 'prod' }]),
    1, 'provisioned', 0, null, null,
    USER_ALEX, now, now
  );

  // Policy 2: ERP Database Access
  insertPolicy.run(
    POLICY_ERP,
    'ERP Database Access',
    'Manages database access rules for ERP application',
    'application',
    JSON.stringify([{ key: 'app', value: 'ERP' }]),
    1, 'draft', 0, null, null,
    USER_ALEX, now, now
  );

  // Policy 3: K8s Frontend Services
  insertPolicy.run(
    POLICY_K8S,
    'K8s Frontend Services',
    'Kubernetes frontend services traffic policy for Analytics',
    'application',
    JSON.stringify([{ key: 'app', value: 'Analytics' }]),
    1, 'pending', 0, null, null,
    USER_ALEX, now, now
  );

  // Policy 4: Global Deny Logging
  insertPolicy.run(
    POLICY_DENY,
    'Global Deny Logging',
    'Organizational policy for logging denied traffic globally',
    'organizational',
    JSON.stringify([]),
    0, 'provisioned', 0, null, null,
    USER_MORGAN, now, now
  );

  // Policy 5: Payment Gateway (locked by Morgan)
  insertPolicy.run(
    POLICY_PAYMENT,
    'Payment Gateway',
    'Strict access control for payment gateway services',
    'application',
    JSON.stringify([{ key: 'app', value: 'PaymentGateway' }, { key: 'env', value: 'prod' }]),
    1, 'draft', 1, USER_MORGAN, '2026-07-28T10:00:00Z',
    USER_ALEX, now, now
  );

  // ── Rules ──────────────────────────────────────────────────────────────────
  const insertRule = db.prepare(`
    INSERT INTO rules
      (id, policy_id, source, destination, services, action, scope_type, enabled, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Policy 1 rules (HRM Production Access) — 4 intra allow
  insertRule.run(
    uuid(), POLICY_HRM,
    JSON.stringify({ type: 'labels', labels: [{ key: 'role', value: 'web' }] }),
    JSON.stringify({ type: 'labels', labels: [{ key: 'role', value: 'api' }] }),
    JSON.stringify([{ protocol: 'TCP', port: '443' }]),
    'allow', 'intra', 1, 0
  );
  insertRule.run(
    uuid(), POLICY_HRM,
    JSON.stringify({ type: 'labels', labels: [{ key: 'role', value: 'api' }] }),
    JSON.stringify({ type: 'labels', labels: [{ key: 'role', value: 'db' }] }),
    JSON.stringify([{ protocol: 'TCP', port: '5432' }]),
    'allow', 'intra', 1, 1
  );
  insertRule.run(
    uuid(), POLICY_HRM,
    JSON.stringify({ type: 'labels', labels: [{ key: 'role', value: 'web' }] }),
    JSON.stringify({ type: 'labels', labels: [{ key: 'role', value: 'cache' }] }),
    JSON.stringify([{ protocol: 'TCP', port: '6379' }]),
    'allow', 'intra', 1, 2
  );
  insertRule.run(
    uuid(), POLICY_HRM,
    JSON.stringify({ type: 'labels', labels: [{ key: 'role', value: 'load-balancer' }] }),
    JSON.stringify({ type: 'labels', labels: [{ key: 'role', value: 'web' }] }),
    JSON.stringify([{ protocol: 'TCP', port: '443' }, { protocol: 'TCP', port: '80' }]),
    'allow', 'intra', 1, 3
  );

  // Policy 2 rules (ERP Database Access) — 3 rules (mix intra/extra)
  insertRule.run(
    uuid(), POLICY_ERP,
    JSON.stringify({ type: 'labels', labels: [{ key: 'role', value: 'api' }] }),
    JSON.stringify({ type: 'labels', labels: [{ key: 'role', value: 'db' }] }),
    JSON.stringify([{ protocol: 'TCP', port: '3306' }]),
    'allow', 'intra', 1, 0
  );
  insertRule.run(
    uuid(), POLICY_ERP,
    JSON.stringify({ type: 'ip_list', ipList: { cidr: '10.0.0.0/8', name: 'Corporate Network' } }),
    JSON.stringify({ type: 'labels', labels: [{ key: 'role', value: 'api' }] }),
    JSON.stringify([{ protocol: 'TCP', port: '443' }]),
    'allow', 'extra', 1, 1
  );
  insertRule.run(
    uuid(), POLICY_ERP,
    JSON.stringify({ type: 'labels', labels: [{ key: 'role', value: 'web' }] }),
    JSON.stringify({ type: 'labels', labels: [{ key: 'role', value: 'api' }] }),
    JSON.stringify([{ protocol: 'TCP', port: '8080' }]),
    'allow', 'intra', 1, 2
  );

  // Policy 3 rules (K8s Frontend Services) — 2 rules
  insertRule.run(
    uuid(), POLICY_K8S,
    JSON.stringify({
      type: 'k8s',
      k8s: { cluster: 'us-east-prod', namespace: { type: 'name', value: 'web-frontend' }, selector: 'app=web,tier=frontend' }
    }),
    JSON.stringify({ type: 'labels', labels: [{ key: 'role', value: 'api' }] }),
    JSON.stringify([{ protocol: 'TCP', port: '443' }]),
    'allow', 'intra', 1, 0
  );
  insertRule.run(
    uuid(), POLICY_K8S,
    JSON.stringify({
      type: 'k8s',
      k8s: { cluster: 'us-east-prod', namespace: { type: 'name', value: 'payments' }, selector: 'app=payment-processor' }
    }),
    JSON.stringify({ type: 'labels', labels: [{ key: 'role', value: 'db' }] }),
    JSON.stringify([{ protocol: 'TCP', port: '5432' }]),
    'allow', 'intra', 1, 1
  );

  // Policy 4 rules (Global Deny Logging) — 1 rule
  insertRule.run(
    uuid(), POLICY_DENY,
    JSON.stringify({ type: 'labels', labels: [] }),
    JSON.stringify({ type: 'labels', labels: [] }),
    JSON.stringify([{ protocol: 'TCP', port: '514' }]),
    'deny', 'intra', 1, 0
  );

  // Policy 5 rules (Payment Gateway) — 3 rules
  insertRule.run(
    uuid(), POLICY_PAYMENT,
    JSON.stringify({ type: 'labels', labels: [{ key: 'role', value: 'web' }] }),
    JSON.stringify({ type: 'labels', labels: [{ key: 'role', value: 'api' }] }),
    JSON.stringify([{ protocol: 'TCP', port: '443' }]),
    'allow', 'intra', 1, 0
  );
  insertRule.run(
    uuid(), POLICY_PAYMENT,
    JSON.stringify({
      type: 'k8s',
      k8s: { cluster: 'us-east-prod', namespace: { type: 'name', value: 'payments' }, selector: 'app=checkout' }
    }),
    JSON.stringify({ type: 'labels', labels: [{ key: 'role', value: 'api' }] }),
    JSON.stringify([{ protocol: 'TCP', port: '443' }]),
    'allow', 'extra', 1, 1
  );
  insertRule.run(
    uuid(), POLICY_PAYMENT,
    JSON.stringify({ type: 'labels', labels: [{ key: 'role', value: 'api' }] }),
    JSON.stringify({ type: 'ip_list', ipList: { cidr: '192.168.1.0/24', name: 'Payment Processor Network' } }),
    JSON.stringify([{ protocol: 'TCP', port: '8443' }]),
    'allow', 'intra', 1, 2
  );

  // ── Tenant Settings ────────────────────────────────────────────────────────
  db.prepare('INSERT INTO tenant_settings (key, value) VALUES (?, ?)').run(
    'display_scopes_in_policies', 'true'
  );
});

// Run the transaction
seed();

// Log counts
const db2 = getDb();
console.log('Seed complete. Table counts:');
console.log('  users:', (db2.prepare('SELECT count(*) as c FROM users').get() as { c: number }).c);
console.log('  labels:', (db2.prepare('SELECT count(*) as c FROM labels').get() as { c: number }).c);
console.log('  k8s_clusters:', (db2.prepare('SELECT count(*) as c FROM k8s_clusters').get() as { c: number }).c);
console.log('  k8s_namespaces:', (db2.prepare('SELECT count(*) as c FROM k8s_namespaces').get() as { c: number }).c);
console.log('  workloads:', (db2.prepare('SELECT count(*) as c FROM workloads').get() as { c: number }).c);
console.log('  policies:', (db2.prepare('SELECT count(*) as c FROM policies').get() as { c: number }).c);
console.log('  rules:', (db2.prepare('SELECT count(*) as c FROM rules').get() as { c: number }).c);
console.log('  tenant_settings:', (db2.prepare('SELECT count(*) as c FROM tenant_settings').get() as { c: number }).c);
