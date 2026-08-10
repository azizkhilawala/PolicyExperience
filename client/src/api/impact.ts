import { apiFetch } from './client.js';
import type { Workload } from './workloads.js';

export interface ImpactResult {
  total: number;
  workloads: Pick<
    Workload,
    'id' | 'name' | 'hostname' | 'ip' | 'type' | 'labels' | 'enforcement_mode' | 'managed' | 'online'
  >[];
  by_label: { [key: string]: { [value: string]: number } };
}

export function computeImpact(
  scopeLabels: Array<{ key: string; value: string }>,
): Promise<ImpactResult> {
  return apiFetch('/api/impact/compute', {
    method: 'POST',
    body: JSON.stringify({ scope_labels: scopeLabels }),
  });
}
