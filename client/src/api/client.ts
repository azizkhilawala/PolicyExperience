let currentUserId: string | null = null;

export function setCurrentUserId(id: string) {
  currentUserId = id;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (currentUserId) {
    headers['x-user-id'] = currentUserId;
  }
  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
