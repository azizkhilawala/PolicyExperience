import { apiFetch } from './client.js';

export interface Workload {
  id: string;
  name: string;
  hostname: string;
  ip: string;
  type: 'vm' | 'k8s_pod';
  labels: Array<{ key: string; value: string }>;
  cluster_id: string | null;
  namespace_id: string | null;
  managed: number;
  online: number;
  enforcement_mode: 'idle' | 'visibility_only' | 'selective' | 'full';
  os_type: 'linux' | 'windows' | null;
  os_detail: string;
  ven_version: string | null;
  ven_status: 'active' | 'suspended' | 'stopped' | 'uninstalled';
  last_heartbeat_at: string | null;
  public_ip: string | null;
  data_center: string;
  service_provider: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface WorkloadListResponse {
  data: Workload[];
  total: number;
  page: number;
  limit: number;
}

export interface LabelSummary {
  [key: string]: { [value: string]: number };
}

export function fetchWorkloads(params?: {
  search?: string;
  type?: string;
  managed?: string;
  online?: string;
  enforcement_mode?: string;
  label_key?: string;
  label_value?: string;
  page?: number;
  limit?: number;
}): Promise<WorkloadListResponse> {
  const qs = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '' && v !== 'all') qs.set(k, String(v));
    }
  }
  const query = qs.toString();
  return apiFetch(`/api/workloads${query ? `?${query}` : ''}`);
}

export function fetchWorkload(id: string): Promise<Workload> {
  return apiFetch(`/api/workloads/${id}`);
}

export function updateWorkloadLabels(
  id: string,
  labels: Array<{ key: string; value: string }>,
): Promise<Workload> {
  return apiFetch(`/api/workloads/${id}/labels`, {
    method: 'PATCH',
    body: JSON.stringify({ labels }),
  });
}

export function bulkUpdateLabels(
  workloadIds: string[],
  labels: Array<{ key: string; value: string }>,
  mode: 'merge' | 'replace',
): Promise<{ updated: number }> {
  return apiFetch('/api/workloads/bulk-labels', {
    method: 'POST',
    body: JSON.stringify({ workload_ids: workloadIds, labels, mode }),
  });
}

export function fetchLabelSummary(): Promise<LabelSummary> {
  return apiFetch('/api/workloads/label-summary');
}
