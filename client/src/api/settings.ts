import { apiFetch } from './client.js';

export type TenantSettings = Record<string, string>;

export function fetchSettings() {
  return apiFetch<TenantSettings>('/api/tenant-settings');
}

export function updateSetting(key: string, value: string) {
  return apiFetch<{ key: string; value: string }>(`/api/tenant-settings/${key}`, {
    method: 'PATCH',
    body: JSON.stringify({ value }),
  });
}
