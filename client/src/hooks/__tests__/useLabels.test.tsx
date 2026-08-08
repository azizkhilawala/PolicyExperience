import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/mocks/server.js';
import { LabelsProvider, useLabels } from '../useLabels.js';

const mockLabels = [
  { id: 'l1', key: 'app', value: 'web', type: 'illumio' as const },
  { id: 'l2', key: 'env', value: 'prod', type: 'illumio' as const },
];

function wrapper({ children }: { children: ReactNode }) {
  return <LabelsProvider>{children}</LabelsProvider>;
}

describe('useLabels', () => {
  it('returns empty array initially', () => {
    server.use(
      http.get('/api/labels', () => new Promise(() => {})),
    );

    const { result } = renderHook(() => useLabels(), { wrapper });
    expect(result.current).toEqual([]);
  });

  it('fetches and returns labels', async () => {
    server.use(
      http.get('/api/labels', () => HttpResponse.json(mockLabels)),
    );

    const { result } = renderHook(() => useLabels(), { wrapper });

    await waitFor(() => {
      expect(result.current).toEqual(mockLabels);
    });
  });

  it('returns empty array when API fails', async () => {
    server.use(
      http.get('/api/labels', () =>
        HttpResponse.json({ error: 'fail' }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useLabels(), { wrapper });

    // Wait a tick to ensure the catch has fired
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current).toEqual([]);
  });

  it('returns default empty array outside provider', () => {
    const { result } = renderHook(() => useLabels());
    expect(result.current).toEqual([]);
  });
});
