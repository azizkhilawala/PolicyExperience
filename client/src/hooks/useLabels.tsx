import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { fetchLabels, type Label } from '../api/labels.js';

const LabelsContext = createContext<Label[]>([]);

export function LabelsProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState<Label[]>([]);

  useEffect(() => {
    fetchLabels()
      .then(setLabels)
      .catch(() => {});
  }, []);

  return <LabelsContext value={labels}>{children}</LabelsContext>;
}

export function useLabels(): Label[] {
  return useContext(LabelsContext);
}
