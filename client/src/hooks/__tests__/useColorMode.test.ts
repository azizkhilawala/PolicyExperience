import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useColorMode } from '../useColorMode.js';

beforeEach(() => {
  localStorage.clear();
});

describe('useColorMode', () => {
  it('defaults to "system" when no stored value', () => {
    const { result } = renderHook(() => useColorMode());
    expect(result.current.mode).toBe('system');
  });

  it('reads stored value from localStorage', () => {
    localStorage.setItem('color-mode', 'dark');
    const { result } = renderHook(() => useColorMode());
    expect(result.current.mode).toBe('dark');
  });

  it('setMode updates state and localStorage', () => {
    const { result } = renderHook(() => useColorMode());

    act(() => {
      result.current.setMode('light');
    });

    expect(result.current.mode).toBe('light');
    expect(localStorage.getItem('color-mode')).toBe('light');
  });
});
