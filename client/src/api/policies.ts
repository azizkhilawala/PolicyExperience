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

export interface RuleEndpoint {
  type: 'labels' | 'ip_list' | 'k8s';
  labels?: PolicyLabel[];
  ipList?: { cidr: string; name: string };
  k8s?: { cluster: string; namespace: { type: string; value: string }; selector: string };
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

export function fetchNamespaces(clusterId?: string) {
  const query = clusterId ? `?cluster_id=${clusterId}` : '';
  return apiFetch<K8sNamespace[]>(`/api/k8s/namespaces${query}`);
}

export function fetchPolicies(params?: { type?: string; status?: string; enabled?: string }) {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return apiFetch<Policy[]>(`/api/policies${query ? `?${query}` : ''}`);
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
  }
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
  }>
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
