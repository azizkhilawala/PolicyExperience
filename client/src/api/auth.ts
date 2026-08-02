import { apiFetch } from './client.js';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'author' | 'global_admin';
}

export function fetchCurrentUser() {
  return apiFetch<User>('/api/auth/me');
}

export function fetchUsers() {
  return apiFetch<User[]>('/api/auth/users');
}

export function switchUser(userId: string) {
  return apiFetch<User>('/api/auth/switch-user', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}
