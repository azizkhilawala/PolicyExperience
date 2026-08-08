import { apiFetch } from './client.js';

export interface Service {
  id: string;
  name: string;
  description: string;
  port: number;
  to_port: number | null;
  protocol: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ObjIpList {
  id: string;
  name: string;
  cidr: string;
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ObjLabelGroup {
  id: string;
  name: string;
  label_ids: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ObjVirtualService {
  id: string;
  name: string;
  port: number;
  protocol: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Services ───────────────────────────────────────────────────────────────

export function fetchServices() {
  return apiFetch<Service[]>('/api/objects/services');
}

export function fetchServiceById(id: string) {
  return apiFetch<Service>(`/api/objects/services/${id}`);
}

export function createService(data: {
  name: string;
  port: number;
  protocol: string;
  to_port?: number | null;
  description?: string;
}) {
  return apiFetch<Service>('/api/objects/services', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateService(id: string, data: Partial<{
  name: string;
  port: number;
  protocol: string;
  to_port: number | null;
  description: string;
}>) {
  return apiFetch<Service>(`/api/objects/services/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteService(id: string) {
  return apiFetch<void>(`/api/objects/services/${id}`, { method: 'DELETE' });
}

// ─── IP Lists ───────────────────────────────────────────────────────────────

export function fetchObjIpLists() {
  return apiFetch<ObjIpList[]>('/api/objects/ip-lists');
}

export function fetchObjIpListById(id: string) {
  return apiFetch<ObjIpList>(`/api/objects/ip-lists/${id}`);
}

export function createIpList(data: {
  name: string;
  cidr: string;
  description?: string;
}) {
  return apiFetch<ObjIpList>('/api/objects/ip-lists', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateIpList(id: string, data: Partial<{
  name: string;
  cidr: string;
  description: string;
}>) {
  return apiFetch<ObjIpList>(`/api/objects/ip-lists/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteIpList(id: string) {
  return apiFetch<void>(`/api/objects/ip-lists/${id}`, { method: 'DELETE' });
}

// ─── Label Groups ───────────────────────────────────────────────────────────

export function fetchObjLabelGroups() {
  return apiFetch<ObjLabelGroup[]>('/api/objects/label-groups');
}

export function fetchObjLabelGroupById(id: string) {
  return apiFetch<ObjLabelGroup>(`/api/objects/label-groups/${id}`);
}

export function createLabelGroup(data: {
  name: string;
  label_ids: string[];
}) {
  return apiFetch<ObjLabelGroup>('/api/objects/label-groups', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateLabelGroup(id: string, data: Partial<{
  name: string;
  label_ids: string[];
}>) {
  return apiFetch<ObjLabelGroup>(`/api/objects/label-groups/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteLabelGroup(id: string) {
  return apiFetch<void>(`/api/objects/label-groups/${id}`, { method: 'DELETE' });
}

// ─── Virtual Services ───────────────────────────────────────────────────────

export function fetchObjVirtualServices() {
  return apiFetch<ObjVirtualService[]>('/api/objects/virtual-services');
}

export function fetchObjVirtualServiceById(id: string) {
  return apiFetch<ObjVirtualService>(`/api/objects/virtual-services/${id}`);
}

export function createVirtualService(data: {
  name: string;
  port: number;
  protocol: string;
}) {
  return apiFetch<ObjVirtualService>('/api/objects/virtual-services', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateVirtualService(id: string, data: Partial<{
  name: string;
  port: number;
  protocol: string;
}>) {
  return apiFetch<ObjVirtualService>(`/api/objects/virtual-services/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteVirtualService(id: string) {
  return apiFetch<void>(`/api/objects/virtual-services/${id}`, { method: 'DELETE' });
}
