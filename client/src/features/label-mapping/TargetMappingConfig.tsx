import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Text } from '@astryxdesign/core/Text';

import { DIMENSION_LABELS, VALUE_MODE_LABELS, CONFLICT_LABELS } from '../../api/label-mapping.js';

interface TargetConfig {
  target_dimension: string;
  target_value_mode: string;
  target_value: string;
  target_source_field: string;
  target_transform: string;
  regex_pattern: string;
  regex_capture_group: number;
  conflict_behavior: string;
}

interface TargetMappingConfigProps {
  config: TargetConfig;
  onChange: (updates: Partial<TargetConfig>) => void;
}

const TRANSFORM_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'lowercase', label: 'Lowercase' },
  { value: 'uppercase', label: 'Uppercase' },
  { value: 'title_case', label: 'Title Case' },
  { value: 'trim', label: 'Trim' },
];

const SOURCE_FIELD_OPTIONS = [
  { value: 'namespace', label: 'Namespace' },
  { value: 'cluster', label: 'Cluster' },
  { value: 'deployment', label: 'Deployment' },
  { value: 'pod', label: 'Pod' },
  { value: 'service', label: 'Service' },
  { value: 'node', label: 'Node' },
  { value: 'container_image', label: 'Container Image' },
  { value: 'workload_name', label: 'Workload Name' },
];

const dimensionOptions = Object.entries(DIMENSION_LABELS).map(([k, v]) => ({ value: k, label: v }));
const valueModeOptions = Object.entries(VALUE_MODE_LABELS).map(([k, v]) => ({ value: k, label: v }));
const conflictOptions = Object.entries(CONFLICT_LABELS).map(([k, v]) => ({ value: k, label: v }));

export function TargetMappingConfig({ config, onChange }: TargetMappingConfigProps) {
  return (
    <VStack gap={3}>
      <Text weight="medium">Target Mapping</Text>

      <HStack gap={2} wrap="wrap">
        <Selector
          label="Illumio Label Dimension"
          options={dimensionOptions}
          value={config.target_dimension}
          onChange={(v: string) => onChange({ target_dimension: v })}
          size="sm"
        />

        <Selector
          label="Value Mode"
          options={valueModeOptions}
          value={config.target_value_mode}
          onChange={(v: string) => onChange({ target_value_mode: v })}
          size="sm"
        />
      </HStack>

      {config.target_value_mode === 'static' && (
        <TextInput
          label="Static Value"
          value={config.target_value}
          onChange={(v: string) => onChange({ target_value: v })}
          placeholder="e.g. Production"
          size="sm"
        />
      )}

      {config.target_value_mode === 'copy' && (
        <HStack gap={2} wrap="wrap">
          <Selector
            label="Source Field"
            options={SOURCE_FIELD_OPTIONS}
            value={config.target_source_field}
            onChange={(v: string) => onChange({ target_source_field: v })}
            size="sm"
          />
          <Selector
            label="Transform"
            options={TRANSFORM_OPTIONS}
            value={config.target_transform}
            onChange={(v: string) => onChange({ target_transform: v })}
            size="sm"
          />
        </HStack>
      )}

      {config.target_value_mode === 'regex_capture' && (
        <VStack gap={2}>
          <HStack gap={2} wrap="wrap">
            <Selector
              label="Source Field"
              options={SOURCE_FIELD_OPTIONS}
              value={config.target_source_field}
              onChange={(v: string) => onChange({ target_source_field: v })}
              size="sm"
            />
            <NumberInput
              label="Capture Group"
              value={config.regex_capture_group}
              onChange={(v) => onChange({ regex_capture_group: v ?? 1 })}
              min={0}
              max={10}
              size="sm"
            />
          </HStack>
          <TextInput
            label="Regex Pattern"
            value={config.regex_pattern}
            onChange={(v: string) => onChange({ regex_pattern: v })}
            placeholder="e.g. ^(.+)-deployment$"
            size="sm"
          />
        </VStack>
      )}

      {config.target_value_mode === 'transform' && (
        <HStack gap={2} wrap="wrap">
          <Selector
            label="Source Field"
            options={SOURCE_FIELD_OPTIONS}
            value={config.target_source_field}
            onChange={(v: string) => onChange({ target_source_field: v })}
            size="sm"
          />
          <Selector
            label="Transform"
            options={TRANSFORM_OPTIONS.filter((o) => o.value)}
            value={config.target_transform}
            onChange={(v: string) => onChange({ target_transform: v })}
            size="sm"
          />
        </HStack>
      )}

      <Selector
        label="Conflict Behavior"
        options={conflictOptions}
        value={config.conflict_behavior}
        onChange={(v: string) => onChange({ conflict_behavior: v })}
        size="sm"
      />
    </VStack>
  );
}
