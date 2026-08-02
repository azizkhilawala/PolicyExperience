import { useState } from 'react';

type ColorMode = 'light' | 'dark' | 'system';

export function useColorMode() {
  const [mode, setModeState] = useState<ColorMode>(() => {
    return (localStorage.getItem('color-mode') as ColorMode) || 'system';
  });

  const setMode = (newMode: ColorMode) => {
    setModeState(newMode);
    localStorage.setItem('color-mode', newMode);
  };

  return { mode, setMode };
}
