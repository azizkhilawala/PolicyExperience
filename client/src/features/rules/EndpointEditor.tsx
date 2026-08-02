import { useState, useEffect, useMemo, useCallback } from 'react';
import { PowerSearch } from '@astryxdesign/core/PowerSearch';
import type {
  PowerSearchConfig,
  PowerSearchFilter,
  PowerSearchChangeType,
  FilterValueEnum,
} from '@astryxdesign/core/PowerSearch';
import { VStack } from '@astryxdesign/core/VStack';

import { fetchLabels, type Label } from '../../api/labels.js';
import type { RuleEndpoint, PolicyLabel } from '../../api/policies.js';
import { GhostTokens } from './GhostTokens.js';

interface EndpointEditorProps {
  value: RuleEndpoint;
  onChange: (value: RuleEndpoint) => void;
  ghostLabels?: PolicyLabel[];
  isDisabled?: boolean;
}

export function EndpointEditor({ value, onChange, ghostLabels, isDisabled }: EndpointEditorProps) {
  const [allLabels, setAllLabels] = useState<Label[]>([]);

  useEffect(() => {
    fetchLabels().then(setAllLabels).catch(() => {});
  }, []);

  const config: PowerSearchConfig = useMemo(() => {
    const labelsByKey: Record<string, { value: string; label: string }[]> = {};
    for (const l of allLabels) {
      if (!labelsByKey[l.key]) labelsByKey[l.key] = [];
      labelsByKey[l.key].push({ value: l.value, label: l.value });
    }

    const fieldKeys = ['role', 'app', 'env', 'loc'];
    return {
      name: 'EndpointSearch',
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

  const filters: ReadonlyArray<PowerSearchFilter> = useMemo(() => {
    if (value.type !== 'labels' || !value.labels) return [];
    return value.labels.map((l) => ({
      field: l.key,
      operator: 'is',
      value: { type: 'enum' as const, value: l.value },
    }));
  }, [value]);

  const handleChange = useCallback(
    (
      newFilters: ReadonlyArray<PowerSearchFilter>,
      _changeType: PowerSearchChangeType,
      _index: number
    ) => {
      const labels: PolicyLabel[] = newFilters
        .filter((f) => f.value.type === 'enum')
        .map((f) => ({
          key: f.field,
          value: (f.value as FilterValueEnum).value,
        }));
      onChange({ type: 'labels', labels });
    },
    [onChange]
  );

  return (
    <VStack gap={0.5}>
      {ghostLabels && ghostLabels.length > 0 && <GhostTokens labels={ghostLabels} />}
      <PowerSearch
        config={config}
        filters={filters}
        onChange={handleChange}
        placeholder="Add labels…"
        label="Endpoint"
        isDisabled={isDisabled}
        size="sm"
      />
    </VStack>
  );
}
