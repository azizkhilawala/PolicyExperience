import { useState, useEffect, useMemo, useCallback } from 'react';
import { PowerSearch } from '@astryxdesign/core/PowerSearch';
import type {
  PowerSearchConfig,
  PowerSearchFilter,
  PowerSearchChangeType,
  FilterValueEnum,
  FilterValueString,
} from '@astryxdesign/core/PowerSearch';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';

import type { RuleService } from '../../api/policies.js';
import type { Service } from '../../api/objects.js';
import { fetchServices } from '../../api/objects.js';
import { ServiceDialog } from '../objects/ServiceDialog.js';

const PROTOCOL_VALUES = [
  { value: 'TCP', label: 'TCP' },
  { value: 'UDP', label: 'UDP' },
  { value: 'ICMP', label: 'ICMP' },
];

interface ServiceEditorProps {
  value: RuleService[];
  onChange: (services: RuleService[]) => void;
  isDisabled?: boolean;
}

export function ServiceEditor({ value, onChange, isDisabled }: ServiceEditorProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);

  useEffect(() => {
    fetchServices().then(setServices).catch(() => {});
  }, []);

  const serviceConfig = useMemo<PowerSearchConfig>(() => ({
    name: 'ServiceSearch',
    fields: [
      {
        key: 'saved_service',
        label: 'Saved Service',
        group: 'Named',
        defaultOperator: 'is',
        operators: [
          {
            key: 'is',
            label: 'is',
            value: { type: 'enum' as const, values: services.map((s) => ({ value: s.name, label: s.name })) },
          },
        ],
      },
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
  }), [services]);

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
      const svcList: RuleService[] = [];
      let currentProtocol = 'TCP';

      for (const f of newFilters) {
        if (f.field === 'saved_service' && f.value.type === 'enum') {
          const svcName = (f.value as FilterValueEnum).value;
          const svc = services.find((s) => s.name === svcName);
          if (svc) {
            svcList.push({ protocol: svc.protocol, port: String(svc.port) });
          }
        } else if (f.field === 'protocol' && f.value.type === 'enum') {
          currentProtocol = (f.value as FilterValueEnum).value;
        } else if (f.field === 'port' && f.value.type === 'string') {
          svcList.push({
            protocol: currentProtocol,
            port: (f.value as FilterValueString).value,
          });
          currentProtocol = 'TCP';
        }
      }
      onChange(svcList);
    },
    [onChange, services]
  );

  return (
    <>
      <HStack gap={1} vAlign="end">
        <div style={{ flex: 1 }}>
          <PowerSearch
            config={serviceConfig}
            filters={filters}
            onChange={handleChange}
            placeholder="protocol:port…"
            label="Service"
            isDisabled={isDisabled}
            size="sm"
          />
        </div>
        <Button
          label="+ Create Service"
          variant="ghost"
          size="sm"
          onClick={() => setServiceDialogOpen(true)}
        />
      </HStack>
      <ServiceDialog
        isOpen={serviceDialogOpen}
        onClose={() => setServiceDialogOpen(false)}
        onSaved={(newService) => {
          setServices((prev) => [...prev, newService]);
        }}
      />
    </>
  );
}
