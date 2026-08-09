import { apiFetch } from './client.js';

export interface AuditEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  action: string;
  performed_by: string;
  performed_by_name: string | null;
  performed_at: string;
  details: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function fetchAuditLog(params?: {
  entity_type?: string;
  entity_id?: string;
  action?: string;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined)) as Record<
      string,
      string
    >,
  ).toString();
  return apiFetch<PaginatedResponse<AuditEntry>>(`/api/audit-log${query ? `?${query}` : ''}`);
}
