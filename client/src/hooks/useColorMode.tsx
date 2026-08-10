import { createContext, useContext, useState, type ReactNode } from 'react';

type ColorMode = 'light' | 'dark' | 'system';

interface ColorModeContextValue {
  mode: ColorMode;
  setMode: (newMode: ColorMode) => void;
}

const ColorModeContext = createContext<ColorModeContextValue | null>(null);

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ColorMode>(() => {
    return (localStorage.getItem('color-mode') as ColorMode) || 'system';
  });

  const setMode = (newMode: ColorMode) => {
    setModeState(newMode);
    localStorage.setItem('color-mode', newMode);
  };

  return (
    <ColorModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ColorModeContext.Provider>
  );
}

export function useColorMode() {
  const ctx = useContext(ColorModeContext);
  if (!ctx) throw new Error('useColorMode must be used within ColorModeProvider');
  return ctx;
}
