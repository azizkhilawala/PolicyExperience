import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading } from '@astryxdesign/core/Heading';
import { TextInput } from '@astryxdesign/core/TextInput';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { Card } from '@astryxdesign/core/Card';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Icon } from '@astryxdesign/core/Icon';

import {
  createMappingRule,
  updateMappingRule,
  fetchMappingRule,
  formatConditionsAsExpression,
  parseExpressionToConditions,
  type GuidedCondition,
  type MappingRule,
} from '../api/label-mapping.js';
import { GuidedConditionBuilder } from '../features/label-mapping/GuidedConditionBuilder.js';
import { ExpressionEditor } from '../features/label-mapping/ExpressionEditor.js';
import { TargetMappingConfig } from '../features/label-mapping/TargetMappingConfig.js';

export default function LabelMappingCreatePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [priority, setPriority] = useState(0);
  const [matchMode, setMatchMode] = useState<'guided' | 'expression'>('guided');
  const [conditions, setConditions] = useState<GuidedCondition[]>([
    { field: 'namespace', operator: 'is', value: '' },
  ]);
  const [conditionLogic, setConditionLogic] = useState<'AND' | 'OR'>('AND');
  const [expression, setExpression] = useState('');
  const [targetDimension, setTargetDimension] = useState<MappingRule['target_dimension']>('app');
  const [targetValueMode, setTargetValueMode] = useState<MappingRule['target_value_mode']>('static');
  const [targetValue, setTargetValue] = useState('');
  const [targetSourceField, setTargetSourceField] = useState('');
  const [targetTransform, setTargetTransform] = useState('');
  const [regexPattern, setRegexPattern] = useState('');
  const [regexCaptureGroup, setRegexCaptureGroup] = useState(1);
  const [conflictBehavior, setConflictBehavior] = useState<MappingRule['conflict_behavior']>('skip');
  const [saving, setSaving] = useState(false);
  const [loadingRule, setLoadingRule] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRule = useCallback(async () => {
    if (!id) return;
    setLoadingRule(true);
    try {
      const rule = await fetchMappingRule(id);
      setName(rule.name);
      setDescription(rule.description);
      setEnabled(!!rule.enabled);
      setPriority(rule.priority);
      setMatchMode(rule.match_mode);
      const conds = Array.isArray(rule.conditions) ? rule.conditions : [];
      setConditions(conds.length > 0 ? conds : [{ field: 'namespace', operator: 'is', value: '' }]);
      setConditionLogic(rule.condition_logic);
      setExpression(rule.expression);
      setTargetDimension(rule.target_dimension);
      setTargetValueMode(rule.target_value_mode);
      setTargetValue(rule.target_value);
      setTargetSourceField(rule.target_source_field);
      setTargetTransform(rule.target_transform);
      setRegexPattern(rule.regex_pattern);
      setRegexCaptureGroup(rule.regex_capture_group);
      setConflictBehavior(rule.conflict_behavior);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load rule');
    }
    setLoadingRule(false);
  }, [id]);

  useEffect(() => { loadRule(); }, [loadRule]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Rule name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        description,
        enabled: enabled ? 1 : 0,
        priority,
        match_mode: matchMode,
        conditions: matchMode === 'guided' ? conditions : [],
        condition_logic: conditionLogic,
        expression: matchMode === 'expression' ? expression : '',
        target_dimension: targetDimension,
        target_value_mode: targetValueMode,
        target_value: targetValue,
        target_source_field: targetSourceField,
        target_transform: targetTransform,
        regex_pattern: regexPattern,
        regex_capture_group: regexCaptureGroup,
        conflict_behavior: conflictBehavior,
      };

      if (isEdit) {
        await updateMappingRule(id, payload);
        navigate(`/label-mapping/${id}`);
      } else {
        const created = await createMappingRule(payload);
        navigate(`/label-mapping/${created.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
    setSaving(false);
  };

  if (loadingRule) {
    return (
      <HStack hAlign="center" padding={8}>
        <Spinner label="Loading rule…" size="lg" />
      </HStack>
    );
  }

  return (
    <VStack gap={4} padding={4}>
      <HStack hAlign="between" vAlign="center">
        <HStack gap={2} vAlign="center">
          <Button
            label="Back"
            variant="ghost"
            size="sm"
            icon={<Icon icon="chevronLeft" />}
            onClick={() => navigate('/label-mapping')}
          />
          <Heading level={1}>{isEdit ? 'Edit Rule' : 'Create Mapping Rule'}</Heading>
        </HStack>
        <HStack gap={2}>
          <Button label="Cancel" variant="secondary" onClick={() => navigate('/label-mapping')} />
          <Button
            label={saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Rule'}
            variant="primary"
            onClick={handleSave}
            isDisabled={saving}
          />
        </HStack>
      </HStack>

      {error && (
        <Banner
          status="error"
          title={error}
          isDismissable
          onDismiss={() => setError(null)}
        />
      )}

      <Card padding={4}>
        <VStack gap={3}>
          <Heading level={3}>General</Heading>
          <HStack gap={2} wrap="wrap">
            <TextInput
              label="Rule Name"
              value={name}
              onChange={setName}
              placeholder="e.g. Copy App Label"
              isRequired
            />
            <NumberInput
              label="Priority"
              value={priority}
              onChange={(v) => setPriority(v ?? 0)}
              min={0}
              max={999}
              size="sm"
            />
          </HStack>
          <TextInput
            label="Description"
            value={description}
            onChange={setDescription}
            placeholder="What this rule does…"
          />
          <CheckboxInput
            label="Enabled"
            value={enabled}
            onChange={setEnabled}
          />
        </VStack>
      </Card>

      <Card padding={4}>
        <VStack gap={3}>
          <Heading level={3}>Match Conditions</Heading>
          <SegmentedControl
            label="Match mode"
            value={matchMode}
            onChange={(v) => {
              const next = v as 'guided' | 'expression';
              if (next === 'expression' && matchMode === 'guided') {
                const generated = formatConditionsAsExpression(conditions, conditionLogic);
                if (generated) setExpression(generated);
              } else if (next === 'guided' && matchMode === 'expression') {
                const parsed = parseExpressionToConditions(expression);
                if (parsed) {
                  setConditions(parsed.conditions);
                  setConditionLogic(parsed.logic);
                }
              }
              setMatchMode(next);
            }}
          >
            <SegmentedControlItem value="guided" label="Guided Builder" />
            <SegmentedControlItem value="expression" label="Expression Editor" />
          </SegmentedControl>

          {matchMode === 'guided' ? (
            <GuidedConditionBuilder
              conditions={conditions}
              conditionLogic={conditionLogic}
              onChange={setConditions}
              onLogicChange={setConditionLogic}
            />
          ) : (
            <ExpressionEditor value={expression} onChange={setExpression} />
          )}
        </VStack>
      </Card>

      <Card padding={4}>
        <TargetMappingConfig
          config={{
            target_dimension: targetDimension,
            target_value_mode: targetValueMode,
            target_value: targetValue,
            target_source_field: targetSourceField,
            target_transform: targetTransform,
            regex_pattern: regexPattern,
            regex_capture_group: regexCaptureGroup,
            conflict_behavior: conflictBehavior,
          }}
          onChange={(updates) => {
            if (updates.target_dimension !== undefined) setTargetDimension(updates.target_dimension as MappingRule['target_dimension']);
            if (updates.target_value_mode !== undefined) setTargetValueMode(updates.target_value_mode as MappingRule['target_value_mode']);
            if (updates.target_value !== undefined) setTargetValue(updates.target_value);
            if (updates.target_source_field !== undefined) setTargetSourceField(updates.target_source_field);
            if (updates.target_transform !== undefined) setTargetTransform(updates.target_transform);
            if (updates.regex_pattern !== undefined) setRegexPattern(updates.regex_pattern);
            if (updates.regex_capture_group !== undefined) setRegexCaptureGroup(updates.regex_capture_group);
            if (updates.conflict_behavior !== undefined) setConflictBehavior(updates.conflict_behavior as MappingRule['conflict_behavior']);
          }}
        />
      </Card>
    </VStack>
  );
}
