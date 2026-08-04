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

// Label groups
const LG_WEB_TIER = 'lg-web-tier-0001';
const LG_DB_TIER = 'lg-db-tier-0002';
const LG_PROD_APPS = 'lg-prod-apps-0003';

// IP lists
const IPL_CORPORATE = 'ipl-corporate-network-0001';
const IPL_VPN = 'ipl-vpn-gateway-0002';
const IPL_CDN = 'ipl-public-cdn-0003';
const IPL_PAYMENT = 'ipl-payment-processor-0004';
const IPL_MONITORING = 'ipl-monitoring-subnet-0005';

// User groups
const UG_ENGINEERING = 'ug-engineering-0001';
const UG_OPERATIONS = 'ug-operations-0002';
const UG_SECURITY = 'ug-security-team-0003';
const UG_DEVOPS = 'ug-devops-0004';

// Virtual services
const VS_PAYMENT_API = 'vs-payment-api-0001';
const VS_INTERNAL_DNS = 'vs-internal-dns-0002';
const VS_METRICS = 'vs-metrics-endpoint-0003';

// Cloud accounts
const CA_AWS_PROD = 'ca-aws-prod-0001';
const CA_AWS_STAGING = 'ca-aws-staging-0002';
const CA_AZURE_PROD = 'ca-azure-prod-0003';
const CA_AZURE_DEV = 'ca-azure-dev-0004';

// Cloud VPCs
const CV_AWS_PROD = 'cv-aws-prod-vpc-0001';
const CV_AWS_STAGING = 'cv-aws-staging-vpc-0002';
const CV_AZURE_PROD = 'cv-azure-prod-vnet-0003';
const CV_AZURE_DEV = 'cv-azure-dev-vnet-0004';

// Cloud subnets
const CS_AWS_PROD_1A = 'cs-aws-prod-private-1a-0001';
const CS_AWS_PROD_1B = 'cs-aws-prod-private-1b-0002';
const CS_AWS_STAGING = 'cs-aws-staging-public-0003';
const CS_AZURE_PROD_APP = 'cs-azure-prod-app-subnet-0004';
const CS_AZURE_PROD_DB = 'cs-azure-prod-db-subnet-0005';
const CS_AZURE_DEV = 'cs-azure-dev-default-0006';

// V2 Policies
const V2_POLICY_PAYMENTS = 'v2-policy-payments-frontend-0001';
const V2_POLICY_MONITORING = 'v2-policy-monitoring-stack-0002';
const V2_POLICY_BACKEND = 'v2-policy-backend-deny-0003';

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
    DELETE FROM provisioned_rules;
    DELETE FROM rules;
    DELETE FROM policies;
    DELETE FROM v2_rules;
    DELETE FROM v2_policies;
    DELETE FROM workloads;
    DELETE FROM k8s_namespaces;
    DELETE FROM k8s_clusters;
    DELETE FROM cloud_subnets;
    DELETE FROM cloud_vpcs;
    DELETE FROM cloud_accounts;
    DELETE FROM virtual_services;
    DELETE FROM user_groups;
    DELETE FROM ip_lists;
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

  // ── Label Groups ───────────────────────────────────────────────────────────
  const insertLabelGroup = db.prepare(
    'INSERT INTO label_groups (id, name, label_ids) VALUES (?, ?, ?)'
  );
  insertLabelGroup.run(LG_WEB_TIER, 'Web Tier', JSON.stringify([LBL_ROLE_WEB, LBL_ROLE_LB]));
  insertLabelGroup.run(LG_DB_TIER, 'Database Tier', JSON.stringify([LBL_ROLE_DB, LBL_ROLE_CACHE]));
  insertLabelGroup.run(LG_PROD_APPS, 'Production Apps', JSON.stringify([LBL_APP_HRM, LBL_APP_ERP, LBL_APP_PAYMENT]));

  // ── IP Lists ───────────────────────────────────────────────────────────────
  const insertIpList = db.prepare(
    'INSERT INTO ip_lists (id, name, cidr, description) VALUES (?, ?, ?, ?)'
  );
  insertIpList.run(IPL_CORPORATE, 'Corporate Network', '10.0.0.0/8', '');
  insertIpList.run(IPL_VPN, 'VPN Gateway', '172.16.0.0/12', '');
  insertIpList.run(IPL_CDN, 'Public CDN', '203.0.113.0/24', '');
  insertIpList.run(IPL_PAYMENT, 'Payment Processor Network', '192.168.1.0/24', '');
  insertIpList.run(IPL_MONITORING, 'Monitoring Subnet', '10.100.0.0/16', '');

  // ── User Groups ────────────────────────────────────────────────────────────
  const insertUserGroup = db.prepare(
    'INSERT INTO user_groups (id, name, member_ids) VALUES (?, ?, ?)'
  );
  insertUserGroup.run(UG_ENGINEERING, 'Engineering', JSON.stringify([USER_ALEX]));
  insertUserGroup.run(UG_OPERATIONS, 'Operations', JSON.stringify([USER_MORGAN]));
  insertUserGroup.run(UG_SECURITY, 'Security Team', JSON.stringify([]));
  insertUserGroup.run(UG_DEVOPS, 'DevOps', JSON.stringify([]));

  // ── Virtual Services ───────────────────────────────────────────────────────
  const insertVirtualService = db.prepare(
    'INSERT INTO virtual_services (id, name, port, protocol) VALUES (?, ?, ?, ?)'
  );
  insertVirtualService.run(VS_PAYMENT_API, 'Payment API', 443, 'TCP');
  insertVirtualService.run(VS_INTERNAL_DNS, 'Internal DNS', 53, 'UDP');
  insertVirtualService.run(VS_METRICS, 'Metrics Endpoint', 9090, 'TCP');

  // ── Cloud Accounts ─────────────────────────────────────────────────────────
  const insertCloudAccount = db.prepare(
    'INSERT INTO cloud_accounts (id, provider, name, account_id, region) VALUES (?, ?, ?, ?, ?)'
  );
  insertCloudAccount.run(CA_AWS_PROD, 'aws', 'Production', '123456789012', 'us-east-1');
  insertCloudAccount.run(CA_AWS_STAGING, 'aws', 'Staging', '987654321098', 'us-west-2');
  insertCloudAccount.run(CA_AZURE_PROD, 'azure', 'Enterprise Prod', 'aaaa-bbbb-cccc-dddd', null);
  insertCloudAccount.run(CA_AZURE_DEV, 'azure', 'Enterprise Dev', 'eeee-ffff-1111-2222', null);

  // ── Cloud VPCs ─────────────────────────────────────────────────────────────
  const insertCloudVpc = db.prepare(
    'INSERT INTO cloud_vpcs (id, provider, name, vpc_id, cloud_account_id, region, resource_group) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  insertCloudVpc.run(CV_AWS_PROD, 'aws', 'prod-vpc', 'vpc-0a1b2c3d', CA_AWS_PROD, 'us-east-1', null);
  insertCloudVpc.run(CV_AWS_STAGING, 'aws', 'staging-vpc', 'vpc-9z8y7x6w', CA_AWS_STAGING, 'us-west-2', null);
  insertCloudVpc.run(CV_AZURE_PROD, 'azure', 'prod-vnet', 'prod-vnet', CA_AZURE_PROD, null, 'prod-rg');
  insertCloudVpc.run(CV_AZURE_DEV, 'azure', 'dev-vnet', 'dev-vnet', CA_AZURE_DEV, null, 'dev-rg');

  // ── Cloud Subnets ──────────────────────────────────────────────────────────
  const insertCloudSubnet = db.prepare(
    'INSERT INTO cloud_subnets (id, provider, name, subnet_id, cloud_vpc_id, region) VALUES (?, ?, ?, ?, ?, ?)'
  );
  insertCloudSubnet.run(CS_AWS_PROD_1A, 'aws', 'prod-private-1a', 'subnet-aaa', CV_AWS_PROD, 'us-east-1');
  insertCloudSubnet.run(CS_AWS_PROD_1B, 'aws', 'prod-private-1b', 'subnet-bbb', CV_AWS_PROD, 'us-east-1');
  insertCloudSubnet.run(CS_AWS_STAGING, 'aws', 'staging-public', 'subnet-ccc', CV_AWS_STAGING, 'us-west-2');
  insertCloudSubnet.run(CS_AZURE_PROD_APP, 'azure', 'prod-app-subnet', 'prod-app-subnet', CV_AZURE_PROD, null);
  insertCloudSubnet.run(CS_AZURE_PROD_DB, 'azure', 'prod-db-subnet', 'prod-db-subnet', CV_AZURE_PROD, null);
  insertCloudSubnet.run(CS_AZURE_DEV, 'azure', 'dev-default', 'dev-default', CV_AZURE_DEV, null);

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
      (id, policy_id, source, destination, services, action, scope_type, enabled, position, notes, logging, stateless)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Policy 1 rules (HRM Production Access) — 4 intra allow
  insertRule.run(
    uuid(), POLICY_HRM,
    JSON.stringify({ filters: [{ field: 'label_role', operator: 'is', value: { type: 'enum', value: 'web' } }] }),
    JSON.stringify({ filters: [{ field: 'label_role', operator: 'is', value: { type: 'enum', value: 'api' } }] }),
    JSON.stringify([{ protocol: 'TCP', port: '443' }]),
    'allow', 'intra', 1, 0,
    '', 0, 0
  );
  insertRule.run(
    uuid(), POLICY_HRM,
    JSON.stringify({ filters: [{ field: 'label_role', operator: 'is', value: { type: 'enum', value: 'api' } }] }),
    JSON.stringify({ filters: [{ field: 'label_role', operator: 'is', value: { type: 'enum', value: 'db' } }] }),
    JSON.stringify([{ protocol: 'TCP', port: '5432' }]),
    'allow', 'intra', 1, 1,
    'Database access for API tier', 1, 0
  );
  insertRule.run(
    uuid(), POLICY_HRM,
    JSON.stringify({ filters: [{ field: 'label_role', operator: 'is', value: { type: 'enum', value: 'web' } }] }),
    JSON.stringify({ filters: [{ field: 'label_role', operator: 'is', value: { type: 'enum', value: 'cache' } }] }),
    JSON.stringify([{ protocol: 'TCP', port: '6379' }]),
    'allow', 'intra', 1, 2,
    '', 0, 0
  );
  insertRule.run(
    uuid(), POLICY_HRM,
    JSON.stringify({ filters: [{ field: 'label_role', operator: 'is', value: { type: 'enum', value: 'load-balancer' } }] }),
    JSON.stringify({ filters: [{ field: 'label_role', operator: 'is', value: { type: 'enum', value: 'web' } }] }),
    JSON.stringify([{ protocol: 'TCP', port: '443' }, { protocol: 'TCP', port: '80' }]),
    'allow', 'intra', 1, 3,
    '', 0, 0
  );

  // Policy 2 rules (ERP Database Access) — 3 rules (mix intra/extra)
  insertRule.run(
    uuid(), POLICY_ERP,
    JSON.stringify({ filters: [{ field: 'label_role', operator: 'is', value: { type: 'enum', value: 'api' } }] }),
    JSON.stringify({ filters: [{ field: 'label_role', operator: 'is', value: { type: 'enum', value: 'db' } }] }),
    JSON.stringify([{ protocol: 'TCP', port: '3306' }]),
    'allow', 'intra', 1, 0,
    '', 0, 1
  );
  insertRule.run(
    uuid(), POLICY_ERP,
    JSON.stringify({ filters: [{ field: 'ip_list', operator: 'is', value: { type: 'entity_list', value: [{ id: IPL_CORPORATE, label: 'Corporate Network (10.0.0.0/8)' }] } }] }),
    JSON.stringify({ filters: [{ field: 'label_role', operator: 'is', value: { type: 'enum', value: 'api' } }] }),
    JSON.stringify([{ protocol: 'TCP', port: '443' }]),
    'allow', 'extra', 1, 1,
    '', 0, 0
  );
  insertRule.run(
    uuid(), POLICY_ERP,
    JSON.stringify({ filters: [{ field: 'label_role', operator: 'is', value: { type: 'enum', value: 'web' } }] }),
    JSON.stringify({ filters: [{ field: 'label_role', operator: 'is', value: { type: 'enum', value: 'api' } }] }),
    JSON.stringify([{ protocol: 'TCP', port: '8080' }]),
    'allow', 'intra', 1, 2,
    '', 0, 0
  );

  // Policy 3 rules (K8s Frontend Services) — 2 rules
  insertRule.run(
    uuid(), POLICY_K8S,
    JSON.stringify({ filters: [
      { field: 'k8s_cluster', operator: 'is', value: { type: 'enum', value: 'us-east-prod' } },
      { field: 'k8s_namespace', operator: 'is', value: { type: 'enum', value: 'web-frontend' } },
      { field: 'k8s_pod_app', operator: 'is', value: { type: 'enum', value: 'web' } },
      { field: 'k8s_pod_tier', operator: 'is', value: { type: 'enum', value: 'frontend' } }
    ] }),
    JSON.stringify({ filters: [{ field: 'label_role', operator: 'is', value: { type: 'enum', value: 'api' } }] }),
    JSON.stringify([{ protocol: 'TCP', port: '443' }]),
    'allow', 'intra', 1, 0,
    '', 0, 0
  );
  insertRule.run(
    uuid(), POLICY_K8S,
    JSON.stringify({ filters: [
      { field: 'k8s_cluster', operator: 'is', value: { type: 'enum', value: 'us-east-prod' } },
      { field: 'k8s_namespace', operator: 'is', value: { type: 'enum', value: 'payments' } },
      { field: 'k8s_pod_app', operator: 'is', value: { type: 'enum', value: 'payment-processor' } }
    ] }),
    JSON.stringify({ filters: [{ field: 'label_role', operator: 'is', value: { type: 'enum', value: 'db' } }] }),
    JSON.stringify([{ protocol: 'TCP', port: '5432' }]),
    'allow', 'intra', 1, 1,
    '', 0, 0
  );

  // Policy 4 rules (Global Deny Logging) — 1 rule
  insertRule.run(
    uuid(), POLICY_DENY,
    JSON.stringify({ filters: [] }),
    JSON.stringify({ filters: [] }),
    JSON.stringify([{ protocol: 'TCP', port: '514' }]),
    'deny', 'intra', 1, 0,
    '', 0, 0
  );

  // Policy 5 rules (Payment Gateway) — 3 rules
  insertRule.run(
    uuid(), POLICY_PAYMENT,
    JSON.stringify({ filters: [{ field: 'label_role', operator: 'is', value: { type: 'enum', value: 'web' } }] }),
    JSON.stringify({ filters: [{ field: 'label_role', operator: 'is', value: { type: 'enum', value: 'api' } }] }),
    JSON.stringify([{ protocol: 'TCP', port: '443' }]),
    'allow', 'intra', 1, 0,
    '', 0, 0
  );
  insertRule.run(
    uuid(), POLICY_PAYMENT,
    JSON.stringify({ filters: [
      { field: 'k8s_cluster', operator: 'is', value: { type: 'enum', value: 'us-east-prod' } },
      { field: 'k8s_namespace', operator: 'is', value: { type: 'enum', value: 'payments' } },
      { field: 'k8s_pod_app', operator: 'is', value: { type: 'enum', value: 'checkout' } }
    ] }),
    JSON.stringify({ filters: [{ field: 'label_role', operator: 'is', value: { type: 'enum', value: 'api' } }] }),
    JSON.stringify([{ protocol: 'TCP', port: '443' }]),
    'allow', 'extra', 1, 1,
    '', 0, 0
  );
  insertRule.run(
    uuid(), POLICY_PAYMENT,
    JSON.stringify({ filters: [{ field: 'label_role', operator: 'is', value: { type: 'enum', value: 'api' } }] }),
    JSON.stringify({ filters: [{ field: 'ip_list', operator: 'is', value: { type: 'entity_list', value: [{ id: IPL_PAYMENT, label: 'Payment Processor Network (192.168.1.0/24)' }] } }] }),
    JSON.stringify([{ protocol: 'TCP', port: '8443' }]),
    'allow', 'intra', 1, 2,
    '', 0, 0
  );

  // ── Provisioned Rules snapshot for HRM (provisioned policy) ───────────────
  const hrmRules = db.prepare('SELECT * FROM rules WHERE policy_id = ?').all(POLICY_HRM);
  const insertProvisionedRule = db.prepare(`
    INSERT INTO provisioned_rules (id, policy_id, rule_id, source, destination, services, action, scope_type, enabled, position, notes, logging, stateless)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const r of hrmRules as any[]) {
    insertProvisionedRule.run(uuid(), r.policy_id, r.id, r.source, r.destination, r.services, r.action, r.scope_type, r.enabled, r.position, r.notes, r.logging, r.stateless);
  }

  // ── Tenant Settings ────────────────────────────────────────────────────────
  db.prepare('INSERT INTO tenant_settings (key, value) VALUES (?, ?)').run(
    'display_scopes_in_policies', 'true'
  );

  // ── V2 Policies (scope-centric) ──────────────────────────────────────────
  const insertV2Policy = db.prepare(`
    INSERT INTO v2_policies
      (id, name, description, scope_type, scope_cluster_id, scope_namespace_id, scope_labels, enabled, provision_status, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertV2Policy.run(
    V2_POLICY_PAYMENTS,
    'Payments Frontend Access',
    'Controls ingress/egress for the payments frontend scope',
    'k8s', CLUSTER_USEAST, NS_PAYMENTS,
    JSON.stringify([{ key: 'app', value: 'frontend' }]),
    1, 'draft', USER_ALEX, now, now
  );

  insertV2Policy.run(
    V2_POLICY_MONITORING,
    'Monitoring Stack',
    'Monitoring scope for API role workloads',
    'k8s', CLUSTER_USEAST, NS_MONITORING,
    JSON.stringify([{ key: 'role', value: 'api' }]),
    1, 'draft', USER_ALEX, now, now
  );

  insertV2Policy.run(
    V2_POLICY_BACKEND,
    'Backend Services Deny',
    'Deny non-production access to backend services',
    'k8s', CLUSTER_USEAST, NS_BACKEND,
    JSON.stringify([{ key: 'tier', value: 'web' }, { key: 'env', value: 'production' }]),
    1, 'provisioned', USER_MORGAN, now, now
  );

  // ── V2 Rules ─────────────────────────────────────────────────────────────
  const insertV2Rule = db.prepare(`
    INSERT INTO v2_rules
      (id, policy_id, direction, entity, services, action, enabled, provision_status, position, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Policy 1: Payments Frontend Access — 2 ingress, 2 egress
  insertV2Rule.run(
    uuid(), V2_POLICY_PAYMENTS, 'ingress',
    JSON.stringify([
      { field: 'k8s_pod_app', operator: 'is', value: { type: 'enum', value: 'api' } },
      { field: 'k8s_pod_tier', operator: 'is', value: { type: 'enum', value: 'web' } },
    ]),
    JSON.stringify([{ type: 'port', protocol: 'TCP', port: '443' }]),
    'allow', 1, 'provisioned', 0, ''
  );
  insertV2Rule.run(
    uuid(), V2_POLICY_PAYMENTS, 'ingress',
    JSON.stringify([
      { field: 'ip_list', operator: 'is', value: { type: 'entity_list', value: [{ id: IPL_VPN, label: 'VPN Gateway (172.16.0.0/12)' }] } },
    ]),
    JSON.stringify([{ type: 'port', protocol: 'TCP', port: '8080' }]),
    'allow', 1, 'draft', 1, ''
  );
  insertV2Rule.run(
    uuid(), V2_POLICY_PAYMENTS, 'egress',
    JSON.stringify([
      { field: 'k8s_pod_app', operator: 'is', value: { type: 'enum', value: 'backend' } },
      { field: 'k8s_pod_role', operator: 'is', value: { type: 'enum', value: 'api' } },
    ]),
    JSON.stringify([{ type: 'port', protocol: 'TCP', port: '3000' }]),
    'allow', 1, 'provisioned', 0, ''
  );
  insertV2Rule.run(
    uuid(), V2_POLICY_PAYMENTS, 'egress',
    JSON.stringify([
      { field: 'fqdn', operator: 'matches', value: { type: 'enum', value: '*.amazonaws.com' } },
    ]),
    JSON.stringify([{ type: 'port', protocol: 'TCP', port: '443' }]),
    'allow', 1, 'draft', 1, ''
  );

  // Policy 2: Monitoring Stack — 1 ingress, 2 egress
  insertV2Rule.run(
    uuid(), V2_POLICY_MONITORING, 'ingress',
    JSON.stringify([
      { field: 'label_role', operator: 'is_any_of', value: { type: 'enum_list', value: ['web', 'api', 'worker'] } },
    ]),
    JSON.stringify([{ type: 'port', protocol: 'TCP', port: '9090' }]),
    'allow', 1, 'provisioned', 0, ''
  );
  insertV2Rule.run(
    uuid(), V2_POLICY_MONITORING, 'egress',
    JSON.stringify([
      { field: 'k8s_pod_app', operator: 'is_any_of', value: { type: 'enum_list', value: ['frontend', 'backend'] } },
    ]),
    JSON.stringify([{ type: 'named', name: 'All Services' }]),
    'allow', 1, 'draft', 0, ''
  );
  insertV2Rule.run(
    uuid(), V2_POLICY_MONITORING, 'egress',
    JSON.stringify([
      { field: 'fqdn', operator: 'matches', value: { type: 'enum', value: 'api.github.com' } },
    ]),
    JSON.stringify([{ type: 'port', protocol: 'TCP', port: '443' }]),
    'allow', 1, 'draft', 1, ''
  );

  // Policy 3: Backend Services Deny — 1 ingress, 1 egress
  insertV2Rule.run(
    uuid(), V2_POLICY_BACKEND, 'ingress',
    JSON.stringify([
      { field: 'k8s_pod_env', operator: 'is_none_of', value: { type: 'enum_list', value: ['production'] } },
    ]),
    JSON.stringify([{ type: 'port', protocol: 'TCP', port: '5432' }]),
    'deny', 1, 'provisioned', 0, ''
  );
  insertV2Rule.run(
    uuid(), V2_POLICY_BACKEND, 'egress',
    JSON.stringify([
      { field: 'fqdn', operator: 'matches', value: { type: 'enum', value: 'api.stripe.com' } },
    ]),
    JSON.stringify([{ type: 'port', protocol: 'TCP', port: '443' }]),
    'allow', 1, 'provisioned', 0, ''
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
console.log('  provisioned_rules:', (db2.prepare('SELECT count(*) as c FROM provisioned_rules').get() as { c: number }).c);
console.log('  tenant_settings:', (db2.prepare('SELECT count(*) as c FROM tenant_settings').get() as { c: number }).c);
console.log('  label_groups:', (db2.prepare('SELECT count(*) as c FROM label_groups').get() as { c: number }).c);
console.log('  ip_lists:', (db2.prepare('SELECT count(*) as c FROM ip_lists').get() as { c: number }).c);
console.log('  user_groups:', (db2.prepare('SELECT count(*) as c FROM user_groups').get() as { c: number }).c);
console.log('  virtual_services:', (db2.prepare('SELECT count(*) as c FROM virtual_services').get() as { c: number }).c);
console.log('  cloud_accounts:', (db2.prepare('SELECT count(*) as c FROM cloud_accounts').get() as { c: number }).c);
console.log('  cloud_vpcs:', (db2.prepare('SELECT count(*) as c FROM cloud_vpcs').get() as { c: number }).c);
console.log('  cloud_subnets:', (db2.prepare('SELECT count(*) as c FROM cloud_subnets').get() as { c: number }).c);
console.log('  v2_policies:', (db2.prepare('SELECT count(*) as c FROM v2_policies').get() as { c: number }).c);
console.log('  v2_rules:', (db2.prepare('SELECT count(*) as c FROM v2_rules').get() as { c: number }).c);
