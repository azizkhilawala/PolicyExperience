import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useColorMode, ColorModeProvider } from '../useColorMode.js';

beforeEach(() => {
  localStorage.clear();
});

function wrapper({ children }: { children: ReactNode }) {
  return ColorModeProvider({ children });
}

describe('useColorMode', () => {
  it('defaults to "system" when no stored value', () => {
    const { result } = renderHook(() => useColorMode(), { wrapper });
    expect(result.current.mode).toBe('system');
  });

  it('reads stored value from localStorage', () => {
    localStorage.setItem('color-mode', 'dark');
    const { result } = renderHook(() => useColorMode(), { wrapper });
    expect(result.current.mode).toBe('dark');
  });

  it('setMode updates state and localStorage', () => {
    const { result } = renderHook(() => useColorMode(), { wrapper });

    act(() => {
      result.current.setMode('light');
    });

    expect(result.current.mode).toBe('light');
    expect(localStorage.getItem('color-mode')).toBe('light');
  });
});
