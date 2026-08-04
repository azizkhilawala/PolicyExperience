import { useMemo, useCallback } from 'react';
import { PowerSearch } from '@astryxdesign/core/PowerSearch';
import type {
  PowerSearchFilter,
  PowerSearchChangeType,
  FilterValue,
} from '@astryxdesign/core/PowerSearch';

import type { EndpointFilter } from '../../api/policies.js';
import { useV2EntityResources, buildV2EntityConfig } from './v2EndpointConfig.js';

interface V2EntityEditorProps {
  value: EndpointFilter[];
  onChange: (filters: EndpointFilter[]) => void;
  direction: 'ingress' | 'egress';
  isDisabled?: boolean;
}

function toPSFilter(f: EndpointFilter): PowerSearchFilter {
  return { field: f.field, operator: f.operator, value: f.value as FilterValue };
}

function toEndpointFilter(f: PowerSearchFilter): EndpointFilter {
  return { field: f.field, operator: f.operator, value: f.value };
}

export function V2EntityEditor({ value, onChange, direction, isDisabled }: V2EntityEditorProps) {
  const resources = useV2EntityResources();
  const config = useMemo(() => buildV2EntityConfig(resources, direction), [resources, direction]);

  const psFilters: ReadonlyArray<PowerSearchFilter> = useMemo(
    () => value.map(toPSFilter),
    [value]
  );

  const handleChange = useCallback(
    (newFilters: ReadonlyArray<PowerSearchFilter>, _changeType: PowerSearchChangeType, _index: number) => {
      onChange(newFilters.map(toEndpointFilter));
    },
    [onChange]
  );

  return (
    <PowerSearch
      config={config}
      filters={psFilters}
      onChange={handleChange}
      placeholder="Add labels, K8s selectors, IP lists..."
      label="Entity"
      isDisabled={isDisabled}
      size="sm"
    />
  );
}
