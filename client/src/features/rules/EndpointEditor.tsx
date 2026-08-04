import { useMemo, useCallback } from 'react';
import { PowerSearch } from '@astryxdesign/core/PowerSearch';
import type {
  PowerSearchFilter,
  PowerSearchChangeType,
  FilterValue,
} from '@astryxdesign/core/PowerSearch';
import { VStack } from '@astryxdesign/core/VStack';

import type { RuleEndpoint, EndpointFilter, PolicyLabel } from '../../api/policies.js';
import { GhostTokens } from './GhostTokens.js';
import { useEndpointResources, buildEndpointConfig } from './endpointConfig.js';

interface EndpointEditorProps {
  value: RuleEndpoint;
  onChange: (value: RuleEndpoint) => void;
  ghostLabels?: PolicyLabel[];
  isDisabled?: boolean;
  side: 'source' | 'destination';
}

/** Convert an EndpointFilter (our storage format) to a PowerSearchFilter. */
function toPSFilter(f: EndpointFilter): PowerSearchFilter {
  return {
    field: f.field,
    operator: f.operator,
    value: f.value as FilterValue,
  };
}

/** Convert a PowerSearchFilter back to an EndpointFilter (our storage format). */
function toEndpointFilter(f: PowerSearchFilter): EndpointFilter {
  return {
    field: f.field,
    operator: f.operator,
    value: f.value,
  };
}

export function EndpointEditor({ value, onChange, ghostLabels, isDisabled, side }: EndpointEditorProps) {
  const resources = useEndpointResources();
  const config = useMemo(() => buildEndpointConfig(resources, side), [resources, side]);

  const psFilters: ReadonlyArray<PowerSearchFilter> = useMemo(
    () => value.filters.map(toPSFilter),
    [value.filters]
  );

  const handleChange = useCallback(
    (
      newFilters: ReadonlyArray<PowerSearchFilter>,
      _changeType: PowerSearchChangeType,
      _index: number
    ) => {
      onChange({ filters: newFilters.map(toEndpointFilter) });
    },
    [onChange]
  );

  return (
    <VStack gap={0.5}>
      <PowerSearch
        config={config}
        filters={psFilters}
        onChange={handleChange}
        placeholder="Add labels, workloads, IP lists..."
        label="Endpoint"
        isDisabled={isDisabled}
        size="sm"
      />
      {ghostLabels && ghostLabels.length > 0 && <GhostTokens labels={ghostLabels} />}
    </VStack>
  );
}
