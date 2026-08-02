import { apiFetch } from './client.js';

export interface Label {
  id: string;
  key: string;
  value: string;
  type: 'illumio' | 'k8s';
}

export function fetchLabels(params?: { key?: string; type?: string }) {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return apiFetch<Label[]>(`/api/labels${query ? `?${query}` : ''}`);
}
