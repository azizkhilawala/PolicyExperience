import { useState, useMemo, useCallback } from 'react';
import { PowerSearch } from '@astryxdesign/core/PowerSearch';
import type {
  PowerSearchFilter,
  PowerSearchChangeType,
  FilterValue,
} from '@astryxdesign/core/PowerSearch';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu';

import type { EndpointFilter } from '../../api/policies.js';
import { useV2EntityResources, buildV2EntityConfig } from './v2EndpointConfig.js';
import type { ObjIpList, ObjLabelGroup } from '../../api/objects.js';
import { IpListDialog } from '../objects/IpListDialog.js';
import { LabelGroupDialog } from '../objects/LabelGroupDialog.js';

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
  const [ipListDialogOpen, setIpListDialogOpen] = useState(false);
  const [labelGroupDialogOpen, setLabelGroupDialogOpen] = useState(false);

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
    <VStack gap={1}>
      <HStack gap={1} vAlign="end">
        <div style={{ flex: 1 }}>
          <PowerSearch
            config={config}
            filters={psFilters}
            onChange={handleChange}
            placeholder="Add labels, K8s selectors, IP lists..."
            label="Entity"
            isDisabled={isDisabled}
            size="sm"
          />
        </div>
        <DropdownMenu
          button={{ label: '+ Create', variant: 'ghost', size: 'sm' }}
          items={[
            { label: 'Create IP List', onClick: () => setIpListDialogOpen(true) },
            { label: 'Create Label Group', onClick: () => setLabelGroupDialogOpen(true) },
          ]}
        />
      </HStack>
      <IpListDialog
        isOpen={ipListDialogOpen}
        onClose={() => setIpListDialogOpen(false)}
        onSaved={(newIpList: ObjIpList) => {
          onChange([...value, {
            field: 'ip_list',
            operator: 'is',
            value: { type: 'entity_list', value: [{ id: newIpList.id, label: newIpList.name }] },
          }]);
        }}
      />
      <LabelGroupDialog
        isOpen={labelGroupDialogOpen}
        onClose={() => setLabelGroupDialogOpen(false)}
        onSaved={(newLG: ObjLabelGroup) => {
          onChange([...value, {
            field: 'label_group',
            operator: 'is',
            value: { type: 'entity_list', value: [{ id: newLG.id, label: newLG.name }] },
          }]);
        }}
      />
    </VStack>
  );
}
