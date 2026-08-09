import { useMemo, useCallback } from 'react';
import { PowerSearch } from '@astryxdesign/core/PowerSearch';
import type {
  PowerSearchConfig,
  PowerSearchFilter,
  PowerSearchChangeType,
  FilterValueEnum,
} from '@astryxdesign/core/PowerSearch';

import type { Label } from '../api/labels.js';
import type { PolicyLabel } from '../api/policies.js';
import { useLabels } from '../hooks/useLabels.js';

interface ScopeSearchProps {
  labels: PolicyLabel[];
  onChange: (labels: PolicyLabel[]) => void;
  isDisabled?: boolean;
}

export function ScopeSearch({ labels, onChange, isDisabled }: ScopeSearchProps) {
  const allLabels: Label[] = useLabels();

  const config: PowerSearchConfig = useMemo(() => {
    const labelsByKey: Record<string, { value: string; label: string }[]> = {};
    for (const l of allLabels) {
      if (!labelsByKey[l.key]) labelsByKey[l.key] = [];
      labelsByKey[l.key].push({ value: l.value, label: l.value });
    }

    const fieldKeys = ['app', 'env', 'loc', 'role'];
    return {
      name: 'ScopeSearch',
      fields: fieldKeys
        .filter((k) => labelsByKey[k])
        .map((key) => ({
          key,
          label: key.charAt(0).toUpperCase() + key.slice(1),
          defaultOperator: 'is',
          operators: [
            {
              key: 'is',
              label: 'is',
              value: { type: 'enum' as const, values: labelsByKey[key] },
            },
          ],
        })),
    };
  }, [allLabels]);

  const filters: ReadonlyArray<PowerSearchFilter> = useMemo(
    () =>
      labels.map((l) => ({
        field: l.key,
        operator: 'is',
        value: { type: 'enum' as const, value: l.value },
      })),
    [labels],
  );

  const handleChange = useCallback(
    (
      newFilters: ReadonlyArray<PowerSearchFilter>,
      _changeType: PowerSearchChangeType,
      _index: number,
    ) => {
      const newLabels: PolicyLabel[] = newFilters
        .filter((f) => f.value.type === 'enum')
        .map((f) => ({
          key: f.field,
          value: (f.value as FilterValueEnum).value,
        }));
      onChange(newLabels);
    },
    [onChange],
  );

  return (
    <PowerSearch
      config={config}
      filters={filters}
      onChange={handleChange}
      placeholder="Add scope labels…"
      label="Scope labels"
      isDisabled={isDisabled}
      size="sm"
    />
  );
}
