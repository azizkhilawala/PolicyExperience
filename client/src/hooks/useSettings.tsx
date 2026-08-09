import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  TenantSettings,
  fetchSettings,
  updateSetting as apiUpdateSetting,
} from '../api/settings.js';

interface SettingsContextValue {
  settings: TenantSettings;
  updateSetting: (key: string, value: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<TenantSettings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings()
      .then(setSettings)
      .catch((e) => setError(e instanceof Error ? e.message : 'Settings failed'))
      .finally(() => setLoading(false));
  }, []);

  const updateSetting = async (key: string, value: string) => {
    await apiUpdateSetting(key, value);
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, loading, error }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
