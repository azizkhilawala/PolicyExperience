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
