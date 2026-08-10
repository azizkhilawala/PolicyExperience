import { HStack } from '@astryxdesign/core/HStack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';

export interface WorkloadFilterValues {
  search: string;
  type: string;
  managed: string;
  online: string;
  enforcement_mode: string;
}

interface WorkloadFiltersProps {
  values: WorkloadFilterValues;
  onChange: (values: WorkloadFilterValues) => void;
}

export function WorkloadFilters({ values, onChange }: WorkloadFiltersProps) {
  function set(key: keyof WorkloadFilterValues, value: string) {
    onChange({ ...values, [key]: value });
  }

  return (
    <HStack gap={2} wrap="wrap" vAlign="end">
      <TextInput
        label="Search"
        value={values.search}
        onChange={(v) => set('search', v)}
        placeholder="Name or hostname..."
      />
      <Selector
        label="Type"
        options={[
          { value: 'all', label: 'All Types' },
          { value: 'vm', label: 'VM' },
          { value: 'k8s_pod', label: 'K8s Pod' },
        ]}
        value={values.type}
        onChange={(v) => set('type', v)}
      />
      <Selector
        label="Managed"
        options={[
          { value: 'all', label: 'All' },
          { value: '1', label: 'Managed' },
          { value: '0', label: 'Unmanaged' },
        ]}
        value={values.managed}
        onChange={(v) => set('managed', v)}
      />
      <Selector
        label="Status"
        options={[
          { value: 'all', label: 'All' },
          { value: '1', label: 'Online' },
          { value: '0', label: 'Offline' },
        ]}
        value={values.online}
        onChange={(v) => set('online', v)}
      />
      <Selector
        label="Enforcement"
        options={[
          { value: 'all', label: 'All Modes' },
          { value: 'idle', label: 'Idle' },
          { value: 'visibility_only', label: 'Visibility Only' },
          { value: 'selective', label: 'Selective' },
          { value: 'full', label: 'Full' },
        ]}
        value={values.enforcement_mode}
        onChange={(v) => set('enforcement_mode', v)}
      />
    </HStack>
  );
}
