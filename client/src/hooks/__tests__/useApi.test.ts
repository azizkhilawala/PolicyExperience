import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useApi } from '../useApi.js';

describe('useApi', () => {
  it('starts in loading state', () => {
    const fetcher = vi.fn(() => new Promise<string[]>(() => {}));
    const { result } = renderHook(() => useApi(fetcher));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('resolves data on success', async () => {
    const fetcher = vi.fn(() => Promise.resolve(['item-1', 'item-2']));
    const { result } = renderHook(() => useApi(fetcher));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(['item-1', 'item-2']);
    expect(result.current.error).toBeNull();
  });

  it('sets error on failure', async () => {
    const fetcher = vi.fn(() => Promise.reject(new Error('Network error')));
    const { result } = renderHook(() => useApi(fetcher));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Network error');
  });

  it('refetch reloads data', async () => {
    let callCount = 0;
    const fetcher = vi.fn(() => {
      callCount++;
      return Promise.resolve(`call-${callCount}`);
    });

    const { result } = renderHook(() => useApi(fetcher));

    await waitFor(() => {
      expect(result.current.data).toBe('call-1');
    });

    result.current.refetch();

    await waitFor(() => {
      expect(result.current.data).toBe('call-2');
    });
  });

  it('re-fetches when deps change', async () => {
    let dep = 'a';
    const fetcher = vi.fn(() => Promise.resolve(dep));

    const { result, rerender } = renderHook(() => useApi(fetcher, [dep]));

    await waitFor(() => {
      expect(result.current.data).toBe('a');
    });

    dep = 'b';
    rerender();

    await waitFor(() => {
      expect(result.current.data).toBe('b');
    });
  });
});
