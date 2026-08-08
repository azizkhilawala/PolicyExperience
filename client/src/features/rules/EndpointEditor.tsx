import { useState, useMemo, useCallback } from 'react';
import { PowerSearch } from '@astryxdesign/core/PowerSearch';
import type {
  PowerSearchFilter,
  PowerSearchChangeType,
  FilterValue,
} from '@astryxdesign/core/PowerSearch';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu';

import type { RuleEndpoint, EndpointFilter, PolicyLabel } from '../../api/policies.js';
import type { ObjIpList, ObjLabelGroup } from '../../api/objects.js';
import { GhostTokens } from './GhostTokens.js';
import { useEndpointResources, buildEndpointConfig } from './endpointConfig.js';
import { IpListDialog } from '../objects/IpListDialog.js';
import { LabelGroupDialog } from '../objects/LabelGroupDialog.js';

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
  const [ipListDialogOpen, setIpListDialogOpen] = useState(false);
  const [labelGroupDialogOpen, setLabelGroupDialogOpen] = useState(false);

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
      <HStack gap={1} vAlign="end">
        <div style={{ flex: 1 }}>
          <PowerSearch
            config={config}
            filters={psFilters}
            onChange={handleChange}
            placeholder="Add labels, workloads, IP lists..."
            label="Endpoint"
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
      {ghostLabels && ghostLabels.length > 0 && <GhostTokens labels={ghostLabels} />}
      <IpListDialog
        isOpen={ipListDialogOpen}
        onClose={() => setIpListDialogOpen(false)}
        onSaved={(newIpList: ObjIpList) => {
          onChange({
            filters: [...value.filters, {
              field: 'ip_list',
              operator: 'is',
              value: { type: 'entity_list', value: [{ id: newIpList.id, label: `${newIpList.name} (${newIpList.cidr})` }] },
            }],
          });
        }}
      />
      <LabelGroupDialog
        isOpen={labelGroupDialogOpen}
        onClose={() => setLabelGroupDialogOpen(false)}
        onSaved={(newLG: ObjLabelGroup) => {
          onChange({
            filters: [...value.filters, {
              field: 'label_group',
              operator: 'is',
              value: { type: 'entity_list', value: [{ id: newLG.id, label: newLG.name }] },
            }],
          });
        }}
      />
    </VStack>
  );
}
