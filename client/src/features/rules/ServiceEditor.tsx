import { useMemo, useCallback } from 'react';
import { PowerSearch } from '@astryxdesign/core/PowerSearch';
import type {
  PowerSearchConfig,
  PowerSearchFilter,
  PowerSearchChangeType,
  FilterValueEnum,
  FilterValueString,
} from '@astryxdesign/core/PowerSearch';

import type { RuleService } from '../../api/policies.js';

const PROTOCOL_VALUES = [
  { value: 'TCP', label: 'TCP' },
  { value: 'UDP', label: 'UDP' },
  { value: 'ICMP', label: 'ICMP' },
];

const SERVICE_CONFIG: PowerSearchConfig = {
  name: 'ServiceSearch',
  fields: [
    {
      key: 'protocol',
      label: 'Protocol',
      defaultOperator: 'is',
      operators: [
        {
          key: 'is',
          label: 'is',
          value: { type: 'enum' as const, values: PROTOCOL_VALUES },
        },
      ],
    },
    {
      key: 'port',
      label: 'Port',
      defaultOperator: 'is',
      operators: [
        {
          key: 'is',
          label: 'is',
          value: { type: 'string' as const },
        },
      ],
    },
  ],
};

interface ServiceEditorProps {
  value: RuleService[];
  onChange: (services: RuleService[]) => void;
  isDisabled?: boolean;
}

export function ServiceEditor({ value, onChange, isDisabled }: ServiceEditorProps) {
  const filters: ReadonlyArray<PowerSearchFilter> = useMemo(
    () =>
      value.flatMap((s) => [
        { field: 'protocol', operator: 'is', value: { type: 'enum' as const, value: s.protocol } },
        { field: 'port', operator: 'is', value: { type: 'string' as const, value: s.port } },
      ]),
    [value]
  );

  const handleChange = useCallback(
    (
      newFilters: ReadonlyArray<PowerSearchFilter>,
      _changeType: PowerSearchChangeType,
      _index: number
    ) => {
      const services: RuleService[] = [];
      let currentProtocol = 'TCP';

      for (const f of newFilters) {
        if (f.field === 'protocol' && f.value.type === 'enum') {
          currentProtocol = (f.value as FilterValueEnum).value;
        } else if (f.field === 'port' && f.value.type === 'string') {
          services.push({
            protocol: currentProtocol,
            port: (f.value as FilterValueString).value,
          });
          currentProtocol = 'TCP';
        }
      }
      onChange(services);
    },
    [onChange]
  );

  return (
    <PowerSearch
      config={SERVICE_CONFIG}
      filters={filters}
      onChange={handleChange}
      placeholder="protocol:port…"
      label="Service"
      isDisabled={isDisabled}
      size="sm"
    />
  );
}
