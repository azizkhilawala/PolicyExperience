import { apiFetch } from './client.js';
import type { EndpointFilter } from './policies.js';
import type { V2RuleService } from './v2-policies.js';

export interface V2TemplateRule {
  id: string;
  template_id: string;
  direction: 'ingress' | 'egress';
  entity: EndpointFilter[];
  services: V2RuleService[];
  action: 'allow' | 'deny' | 'override_deny';
  enabled: number;
  position: number;
  notes: string;
}

export interface V2Template {
  id: string;
  name: string;
  description: string;
  source: 'illumio_suggested' | 'user_created';
  created_by: string;
  created_at: string;
  updated_at: string;
  rule_count?: number;
  linked_policy_count?: number;
  rules?: V2TemplateRule[];
  linked_policies?: Array<{ id: string; name: string }>;
}

export function fetchV2Templates() {
  return apiFetch<V2Template[]>('/api/v2/templates');
}

export function fetchV2Template(id: string) {
  return apiFetch<V2Template>(`/api/v2/templates/${id}`);
}

export function createV2Template(data: {
  name: string;
  description?: string;
  source?: 'illumio_suggested' | 'user_created';
}) {
  return apiFetch<V2Template>('/api/v2/templates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateV2Template(id: string, data: Partial<{ name: string; description: string }>) {
  return apiFetch<V2Template>(`/api/v2/templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteV2Template(id: string) {
  return apiFetch<void>(`/api/v2/templates/${id}`, { method: 'DELETE' });
}

export function fetchV2TemplateRules(templateId: string, direction?: 'ingress' | 'egress') {
  const q = direction ? `?direction=${direction}` : '';
  return apiFetch<V2TemplateRule[]>(`/api/v2/templates/${templateId}/rules${q}`);
}

export function createV2TemplateRule(templateId: string, data: {
  direction: 'ingress' | 'egress';
  entity?: EndpointFilter[];
  services?: V2RuleService[];
  action?: 'allow' | 'deny' | 'override_deny';
}) {
  return apiFetch<V2TemplateRule>(`/api/v2/templates/${templateId}/rules`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateV2TemplateRule(ruleId: string, data: Partial<{
  entity: EndpointFilter[];
  services: V2RuleService[];
  action: 'allow' | 'deny' | 'override_deny';
  enabled: boolean;
  notes: string;
}>) {
  return apiFetch<V2TemplateRule>(`/api/v2/template-rules/${ruleId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteV2TemplateRule(ruleId: string) {
  return apiFetch<void>(`/api/v2/template-rules/${ruleId}`, { method: 'DELETE' });
}
