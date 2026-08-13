import { useState, useEffect, useCallback } from 'react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { MultiSelector } from '@astryxdesign/core/MultiSelector';
import { Button } from '@astryxdesign/core/Button';
import { Token } from '@astryxdesign/core/Token';
import { Text } from '@astryxdesign/core/Text';
import { Icon } from '@astryxdesign/core/Icon';
import { Plus, XCircle } from 'lucide-react';

import { type GuidedCondition, fetchFieldValues } from '../../api/label-mapping.js';

const FIELD_OPTIONS = [
  { value: 'namespace', label: 'Namespace' },
  { value: 'cluster', label: 'Cluster' },
  { value: 'deployment', label: 'Deployment' },
  { value: 'pod', label: 'Pod' },
  { value: 'service', label: 'Service' },
  { value: 'node', label: 'Node' },
  { value: 'container_image', label: 'Container Image' },
  { value: 'workload_name', label: 'Workload Name' },
  { value: 'k8s.labels', label: 'K8s Label (key)' },
  { value: 'k8s.annotations', label: 'K8s Annotation (key)' },
];

const OPERATOR_OPTIONS = [
  { value: 'is', label: 'equals' },
  { value: 'is_not', label: 'not equals' },
  { value: 'contains', label: 'contains' },
  { value: 'does_not_contain', label: 'does not contain' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'matches_regex', label: 'matches regex' },
  { value: 'exists', label: 'exists' },
  { value: 'does_not_exist', label: 'does not exist' },
  { value: 'in', label: 'in' },
  { value: 'not_in', label: 'not in' },
];

const NO_VALUE_OPERATORS = new Set(['exists', 'does_not_exist']);
const SINGLE_SELECT_OPERATORS = new Set(['is', 'is_not']);
const MULTI_SELECT_OPERATORS = new Set(['in', 'not_in']);

interface GuidedConditionBuilderProps {
  conditions: GuidedCondition[];
  conditionLogic: 'AND' | 'OR';
  onChange: (conditions: GuidedCondition[]) => void;
  onLogicChange: (logic: 'AND' | 'OR') => void;
}

function ConditionValueInput({
  field,
  operator,
  value,
  onChange,
}: {
  field: string;
  operator: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [fieldValues, setFieldValues] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const resolvedField = field.startsWith('k8s.labels') || field.startsWith('k8s.annotations')
    ? field
    : field;

  const needsOptions = SINGLE_SELECT_OPERATORS.has(operator) || MULTI_SELECT_OPERATORS.has(operator);

  const loadValues = useCallback(async () => {
    if (!needsOptions) return;
    setLoading(true);
    try {
      const vals = await fetchFieldValues(resolvedField);
      setFieldValues(vals);
    } catch {
      setFieldValues([]);
    }
    setLoading(false);
  }, [resolvedField, needsOptions]);

  useEffect(() => { loadValues(); }, [loadValues]);

  if (NO_VALUE_OPERATORS.has(operator)) return null;

  if (SINGLE_SELECT_OPERATORS.has(operator) && fieldValues.length > 0) {
    const options = fieldValues.map((v) => ({ value: v, label: v }));
    return (
      <Selector
        label="Value"
        options={options}
        value={value}
        onChange={(v: string) => onChange(v)}
        size="sm"
        isLoading={loading}
        hasSearch={options.length > 10}
        placeholder="Select value…"
      />
    );
  }

  if (MULTI_SELECT_OPERATORS.has(operator) && fieldValues.length > 0) {
    const options = fieldValues.map((v) => ({ value: v, label: v }));
    const selectedValues = value ? value.split(',').map((v) => v.trim()).filter(Boolean) : [];
    return (
      <MultiSelector
        label="Values"
        options={options}
        value={selectedValues}
        onChange={(vals: string[]) => onChange(vals.join(', '))}
        size="sm"
        isLoading={loading}
        hasSearch={options.length > 10}
        triggerDisplay="badges"
        maxBadges={3}
        placeholder="Select values…"
      />
    );
  }

  return (
    <TextInput
      label="Value"
      value={value}
      onChange={(v: string) => onChange(v)}
      placeholder={
        MULTI_SELECT_OPERATORS.has(operator) ? 'val1, val2, …' :
        operator === 'matches_regex' || operator === 'does_not_match_regex' ? 'regex pattern…' :
        'Value…'
      }
      size="sm"
    />
  );
}

export function GuidedConditionBuilder({
  conditions,
  conditionLogic,
  onChange,
  onLogicChange,
}: GuidedConditionBuilderProps) {
  const updateCondition = (index: number, updates: Partial<GuidedCondition>) => {
    const next = conditions.map((c, i) => (i === index ? { ...c, ...updates } : c));
    onChange(next);
  };

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  const addCondition = () => {
    onChange([...conditions, { field: 'namespace', operator: 'is', value: '' }]);
  };

  return (
    <VStack gap={2}>
      <HStack gap={1} vAlign="center">
        <Text weight="medium">Conditions</Text>
        <Token
          label={conditionLogic}
          color={conditionLogic === 'AND' ? 'blue' : 'orange'}
          size="sm"
          onClick={() => onLogicChange(conditionLogic === 'AND' ? 'OR' : 'AND')}
          style={{ cursor: 'pointer' }}
        />
      </HStack>

      {conditions.map((cond, idx) => {
        const baseField = cond.field.startsWith('k8s.labels') ? 'k8s.labels'
          : cond.field.startsWith('k8s.annotations') ? 'k8s.annotations'
          : cond.field;
        const isLabelOrAnnotation = baseField === 'k8s.labels' || baseField === 'k8s.annotations';
        const subKey = isLabelOrAnnotation && cond.field.split('.').length > 2
          ? cond.field.split('.').slice(2).join('.')
          : '';

        return (
          <HStack key={idx} gap={1} vAlign="end" wrap="wrap">
            {idx > 0 && (
              <Token label={conditionLogic} color="gray" size="sm" />
            )}
            <Selector
              label="Field"
              options={FIELD_OPTIONS}
              value={baseField}
              onChange={(v: string) => updateCondition(idx, { field: v, value: '' })}
              size="sm"
            />

            {isLabelOrAnnotation && (
              <TextInput
                label="Key"
                placeholder="e.g. app"
                value={subKey}
                onChange={(v: string) => {
                  updateCondition(idx, { field: v ? `${baseField}.${v}` : baseField, value: '' });
                }}
                size="sm"
              />
            )}

            <Selector
              label="Operator"
              options={OPERATOR_OPTIONS}
              value={cond.operator}
              onChange={(v: string) => updateCondition(idx, { operator: v, value: '' })}
              size="sm"
            />

            <ConditionValueInput
              field={cond.field}
              operator={cond.operator}
              value={cond.value}
              onChange={(v) => updateCondition(idx, { value: v })}
            />

            <Button
              label="Remove"
              variant="ghost"
              size="sm"
              icon={<Icon icon={XCircle} />}
              isIconOnly
              onClick={() => removeCondition(idx)}
            />
          </HStack>
        );
      })}

      <Button
        label="Add Condition"
        variant="secondary"
        size="sm"
        icon={<Icon icon={Plus} />}
        onClick={addCondition}
      />
    </VStack>
  );
}
