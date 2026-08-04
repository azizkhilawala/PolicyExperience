import { apiFetch } from './client.js';
import type { EndpointFilter } from './policies.js';

export type V2RuleService =
  | { type: 'named'; name: string }
  | { type: 'port'; protocol: string; port: string };

export interface V2Rule {
  id: string;
  policy_id: string;
  direction: 'ingress' | 'egress';
  entity: EndpointFilter[];
  services: V2RuleService[];
  action: 'allow' | 'deny';
  enabled: number;
  provision_status: 'draft' | 'provisioned';
  position: number;
  notes: string;
}

export interface V2Policy {
  id: string;
  name: string;
  description: string;
  scope_type: 'all_workloads' | 'labels' | 'k8s';
  scope_cluster_id: string | null;
  scope_namespace_id: string | null;
  scope_labels: Array<{ key: string; value: string }>;
  enabled: number;
  provision_status: 'draft' | 'provisioned';
  created_by: string;
  created_at: string;
  updated_at: string;
  rules?: V2Rule[];
}

export function fetchV2Policies() {
  return apiFetch<V2Policy[]>('/api/v2/policies');
}

export function fetchV2Policy(id: string) {
  return apiFetch<V2Policy>(`/api/v2/policies/${id}`);
}

export function createV2Policy(data: {
  name: string;
  description?: string;
  scope_type: V2Policy['scope_type'];
  scope_cluster_id?: string;
  scope_namespace_id?: string;
  scope_labels?: Array<{ key: string; value: string }>;
}) {
  return apiFetch<V2Policy>('/api/v2/policies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateV2Policy(id: string, data: Partial<{ name: string; description: string; enabled: boolean }>) {
  return apiFetch<V2Policy>(`/api/v2/policies/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteV2Policy(id: string) {
  return apiFetch<void>(`/api/v2/policies/${id}`, { method: 'DELETE' });
}

export function provisionV2Policy(id: string) {
  return apiFetch<V2Policy>(`/api/v2/policies/${id}/provision`, { method: 'POST' });
}

export function fetchV2Rules(policyId: string, direction?: 'ingress' | 'egress') {
  const q = direction ? `?direction=${direction}` : '';
  return apiFetch<V2Rule[]>(`/api/v2/policies/${policyId}/rules${q}`);
}

export function createV2Rule(policyId: string, data: {
  direction: 'ingress' | 'egress';
  entity?: EndpointFilter[];
  services?: V2RuleService[];
  action?: 'allow' | 'deny';
}) {
  return apiFetch<V2Rule>(`/api/v2/policies/${policyId}/rules`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateV2Rule(ruleId: string, data: Partial<{
  entity: EndpointFilter[];
  services: V2RuleService[];
  action: 'allow' | 'deny';
  enabled: boolean;
  notes: string;
}>) {
  return apiFetch<V2Rule>(`/api/v2/rules/${ruleId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteV2Rule(ruleId: string) {
  return apiFetch<void>(`/api/v2/rules/${ruleId}`, { method: 'DELETE' });
}
