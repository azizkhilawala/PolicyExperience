import { http, HttpResponse } from 'msw';

export const mockUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'global_admin' as const,
};

export const mockUsers = [
  mockUser,
  { id: 'user-2', name: 'Author User', email: 'author@example.com', role: 'author' as const },
];

export const mockPolicy = {
  id: 'pol-1',
  name: 'Production Policy',
  description: 'Protects production workloads',
  type: 'organizational' as const,
  scope: [{ key: 'env', value: 'production' }],
  enabled: 1,
  provision_status: 'draft' as const,
  is_locked: 0,
  locked_by: null,
  locked_at: null,
  created_by: 'user-1',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

export const mockV2Policy = {
  id: 'v2pol-1',
  name: 'V2 Segmentation Policy',
  description: 'Scope-centric v2 policy',
  scope_type: 'labels' as const,
  scope_cluster_ids: [],
  scope_namespace_ids: [],
  scope_labels: [{ key: 'env', value: 'staging' }],
  enabled: 1,
  provision_status: 'draft' as const,
  policy_type: 'standard' as const,
  template_id: null,
  template_name: null,
  created_by: 'user-1',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

export const mockV2Template = {
  id: 'tmpl-1',
  name: 'Web Server Template',
  description: 'Standard web server rules',
  source: 'user_created' as const,
  created_by: 'user-1',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  rule_count: 3,
  linked_policy_count: 1,
};

export const mockSettings = {
  v2_enabled: 'true',
};

export const mockLabels = [
  { id: 'l1', key: 'app', value: 'web', type: 'illumio' as const },
  { id: 'l2', key: 'env', value: 'production', type: 'illumio' as const },
  { id: 'l3', key: 'role', value: 'api', type: 'illumio' as const },
  { id: 'l4', key: 'loc', value: 'us-east', type: 'illumio' as const },
];

export const handlers = [
  http.get('/api/auth/me', () => HttpResponse.json(mockUser)),
  http.get('/api/auth/users', () => HttpResponse.json(mockUsers)),

  http.get('/api/policies', () => HttpResponse.json([mockPolicy])),
  http.get('/api/v2/policies', () => HttpResponse.json([mockV2Policy])),
  http.get('/api/v2/templates', () => HttpResponse.json([mockV2Template])),
  http.get('/api/tenant-settings', () => HttpResponse.json(mockSettings)),
  http.get('/api/labels', () => HttpResponse.json(mockLabels)),
];
