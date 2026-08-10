import { apiFetch } from './client.js';

export interface PolicyLabel {
  key: string;
  value: string;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  type: 'organizational' | 'application';
  scope: PolicyLabel[];
  enabled: number;
  provision_status: 'draft' | 'provisioned' | 'pending';
  is_locked: number;
  locked_by: string | null;
  locked_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  rules?: Rule[];
}

export interface EndpointFilter {
  field: string;
  operator: string;
  value: any;
}

export interface RuleEndpoint {
  filters: EndpointFilter[];
}

export interface RuleService {
  protocol: string;
  port: string;
}

export interface Rule {
  id: string;
  policy_id: string;
  source: RuleEndpoint;
  destination: RuleEndpoint;
  services: RuleService[];
  action: 'allow' | 'deny';
  scope_type: 'intra' | 'extra';
  enabled: number;
  position: number;
  notes: string;
  logging: number;
  stateless: number;
}

export interface K8sCluster {
  id: string;
  name: string;
  region: string;
}

export interface K8sNamespace {
  id: string;
  name: string;
  cluster_id: string;
  labels: { key: string; value: string }[];
}

export function fetchClusters() {
  return apiFetch<K8sCluster[]>('/api/k8s/clusters');
}

export function fetchNamespaces(clusterIdOrIds?: string | string[]) {
  let query = '';
  if (Array.isArray(clusterIdOrIds)) {
    query = clusterIdOrIds.length > 0 ? `?cluster_ids=${clusterIdOrIds.join(',')}` : '';
  } else if (clusterIdOrIds) {
    query = `?cluster_id=${clusterIdOrIds}`;
  }
  return apiFetch<K8sNamespace[]>(`/api/k8s/namespaces${query}`);
}

export interface IpList {
  id: string;
  name: string;
  cidr: string;
  description: string;
}
export interface UserGroup {
  id: string;
  name: string;
  member_ids: string[];
}
export interface VirtualService {
  id: string;
  name: string;
  port: number;
  protocol: string;
}
export interface LabelGroup {
  id: string;
  name: string;
  label_ids: string[];
}
export interface CloudAccount {
  id: string;
  provider: string;
  name: string;
  account_id: string;
  region?: string;
}
export interface CloudVpc {
  id: string;
  provider: string;
  name: string;
  vpc_id: string;
  cloud_account_id: string;
  region?: string;
  resource_group?: string;
}
export interface CloudSubnet {
  id: string;
  provider: string;
  name: string;
  subnet_id: string;
  cloud_vpc_id: string;
  region?: string;
}

export interface Workload {
  id: string;
  name: string;
  hostname: string;
}

export function fetchWorkloads() {
  return apiFetch<{ data: Workload[] }>('/api/workloads').then((r) => r.data);
}
export function fetchIpLists() {
  return apiFetch<IpList[]>('/api/ip-lists');
}
export function fetchUserGroups() {
  return apiFetch<UserGroup[]>('/api/user-groups');
}
export function fetchVirtualServices() {
  return apiFetch<VirtualService[]>('/api/virtual-services');
}
export function fetchLabelGroups() {
  return apiFetch<LabelGroup[]>('/api/label-groups');
}
export function fetchCloudAccounts(provider?: string) {
  const q = provider ? `?provider=${provider}` : '';
  return apiFetch<CloudAccount[]>(`/api/cloud/accounts${q}`);
}
export function fetchCloudVpcs(provider?: string, accountId?: string) {
  const params = new URLSearchParams();
  if (provider) params.set('provider', provider);
  if (accountId) params.set('account_id', accountId);
  const q = params.toString();
  return apiFetch<CloudVpc[]>(`/api/cloud/vpcs${q ? `?${q}` : ''}`);
}
export function fetchCloudSubnets(provider?: string, vpcId?: string) {
  const params = new URLSearchParams();
  if (provider) params.set('provider', provider);
  if (vpcId) params.set('vpc_id', vpcId);
  const q = params.toString();
  return apiFetch<CloudSubnet[]>(`/api/cloud/subnets${q ? `?${q}` : ''}`);
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function fetchPolicies(params?: {
  type?: string;
  status?: string;
  enabled?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined)) as Record<
      string,
      string
    >,
  ).toString();
  return apiFetch<PaginatedResponse<Policy>>(`/api/policies${query ? `?${query}` : ''}`);
}

export function fetchPolicy(id: string) {
  return apiFetch<Policy>(`/api/policies/${id}`);
}

export function deletePolicy(id: string) {
  return apiFetch<void>(`/api/policies/${id}`, { method: 'DELETE' });
}

export function lockPolicy(id: string) {
  return apiFetch<Policy>(`/api/policies/${id}/lock`, { method: 'POST' });
}

export function unlockPolicy(id: string) {
  return apiFetch<Policy>(`/api/policies/${id}/unlock`, { method: 'POST' });
}

export function createPolicy(data: {
  name: string;
  description?: string;
  scope: PolicyLabel[];
  type: 'organizational' | 'application';
}) {
  return apiFetch<Policy>('/api/policies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function fetchRules(policyId: string) {
  return apiFetch<Rule[]>(`/api/policies/${policyId}/rules`);
}

export function createRule(
  policyId: string,
  data: {
    source?: RuleEndpoint;
    destination?: RuleEndpoint;
    services?: RuleService[];
    action?: 'allow' | 'deny';
    scope_type?: 'intra' | 'extra';
  },
) {
  return apiFetch<Rule>(`/api/policies/${policyId}/rules`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateRule(
  ruleId: string,
  data: Partial<{
    source: RuleEndpoint;
    destination: RuleEndpoint;
    services: RuleService[];
    action: 'allow' | 'deny';
    scope_type: 'intra' | 'extra';
    enabled: boolean;
    notes: string;
    logging: boolean;
    stateless: boolean;
  }>,
) {
  return apiFetch<Rule>(`/api/rules/${ruleId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteRule(ruleId: string) {
  return apiFetch<void>(`/api/rules/${ruleId}`, { method: 'DELETE' });
}

export function duplicateRule(ruleId: string) {
  return apiFetch<Rule>(`/api/rules/${ruleId}/duplicate`, { method: 'POST' });
}

export interface ProvisionDiffRule {
  id: string;
  source: RuleEndpoint;
  destination: RuleEndpoint;
  services: RuleService[];
  action: 'allow' | 'deny';
  scope_type: 'intra' | 'extra';
  enabled: number;
  position: number;
}

export interface ProvisionDiff {
  added: ProvisionDiffRule[];
  modified: { before: ProvisionDiffRule; after: ProvisionDiffRule }[];
  removed: ProvisionDiffRule[];
}

export function provisionPreview(id: string) {
  return apiFetch<ProvisionDiff>(`/api/policies/${id}/provision/preview`, { method: 'POST' });
}

export function provisionCommit(id: string) {
  return apiFetch<Policy>(`/api/policies/${id}/provision/commit`, { method: 'POST' });
}
