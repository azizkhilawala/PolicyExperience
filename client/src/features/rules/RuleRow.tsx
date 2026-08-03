import { useCallback, useState } from 'react';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Selector, SelectorOption } from '@astryxdesign/core/Selector';
import type { SelectorOptionData } from '@astryxdesign/core/Selector';
import { Icon } from '@astryxdesign/core/Icon';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Divider } from '@astryxdesign/core/Divider';

import type { Rule, PolicyLabel, RuleEndpoint, RuleService } from '../../api/policies.js';
import { EndpointEditor } from './EndpointEditor.js';
import { ServiceEditor } from './ServiceEditor.js';
import { AdvancedOptions } from './AdvancedOptions.js';

interface RuleRowProps {
  rule: Rule;
  position: number;
  scopeLabels: PolicyLabel[];
  onUpdate: (ruleId: string, data: Partial<Rule>) => Promise<void>;
  onDelete: (ruleId: string) => Promise<void>;
  onDuplicate: (ruleId: string) => Promise<void>;
  isLocked: boolean;
}

function getGhostLabels(
  scopeLabels: PolicyLabel[],
  scopeType: 'intra' | 'extra',
  field: 'source' | 'destination'
): PolicyLabel[] {
  if (scopeLabels.length === 0) return [];
  if (scopeType === 'intra') return scopeLabels;
  if (scopeType === 'extra' && field === 'destination') return scopeLabels;
  return [];
}

const SCOPE_TYPE_DESCRIPTIONS: Record<string, string> = {
  intra: 'Within scope',
  extra: 'From outside the scope (inbound)',
};

const scopeTypeOptions = [
  { value: 'intra', label: 'Intra scope' },
  { value: 'extra', label: 'Extra scope' },
];

function renderScopeTypeOption(option: SelectorOptionData) {
  return (
    <SelectorOption
      label={option.label}
      description={SCOPE_TYPE_DESCRIPTIONS[option.value] ?? ''}
    />
  );
}

const actionOptions = [
  { value: 'allow', label: 'Allow' },
  { value: 'deny', label: 'Deny' },
];

export function RuleRow({
  rule,
  position,
  scopeLabels,
  onUpdate,
  onDelete,
  onDuplicate,
  isLocked,
}: RuleRowProps) {
  const [notes, setNotes] = useState('');
  const [logging, setLogging] = useState(false);
  const [stateless, setStateless] = useState(false);

  const handleScopeTypeChange = useCallback(
    (value: string) => {
      onUpdate(rule.id, { scope_type: value as 'intra' | 'extra' });
    },
    [rule.id, onUpdate]
  );

  const handleSourceChange = useCallback(
    (source: RuleEndpoint) => {
      onUpdate(rule.id, { source });
    },
    [rule.id, onUpdate]
  );

  const handleDestinationChange = useCallback(
    (destination: RuleEndpoint) => {
      onUpdate(rule.id, { destination });
    },
    [rule.id, onUpdate]
  );

  const handleServicesChange = useCallback(
    (services: RuleService[]) => {
      onUpdate(rule.id, { services });
    },
    [rule.id, onUpdate]
  );

  const handleActionChange = useCallback(
    (value: string) => {
      onUpdate(rule.id, { action: value as 'allow' | 'deny' });
    },
    [rule.id, onUpdate]
  );

  const sourceGhosts = getGhostLabels(scopeLabels, rule.scope_type, 'source');
  const destGhosts = getGhostLabels(scopeLabels, rule.scope_type, 'destination');

  return (
    <VStack gap={1}>
      <HStack gap={2} vAlign="start" padding={2}>
        <Text type="supporting" weight="medium">{position}</Text>

        <Selector
          label="Scope type"
          isLabelHidden
          options={scopeTypeOptions}
          value={rule.scope_type}
          onChange={handleScopeTypeChange}
          size="sm"
          isDisabled={isLocked}
          renderOption={renderScopeTypeOption}
        />

        <StackItem size="fill">
          <EndpointEditor
            value={rule.source}
            onChange={handleSourceChange}
            ghostLabels={sourceGhosts}
            isDisabled={isLocked}
          />
        </StackItem>

        <Icon icon="chevronRight" size="sm" color="secondary" label="to" />

        <StackItem size="fill">
          <EndpointEditor
            value={rule.destination}
            onChange={handleDestinationChange}
            ghostLabels={destGhosts}
            isDisabled={isLocked}
          />
        </StackItem>

        <StackItem size="fill">
          <ServiceEditor
            value={rule.services}
            onChange={handleServicesChange}
            isDisabled={isLocked}
          />
        </StackItem>

        <Selector
          label="Action"
          isLabelHidden
          options={actionOptions}
          value={rule.action}
          onChange={handleActionChange}
          size="sm"
          isDisabled={isLocked}
        />

        <MoreMenu
          size="sm"
          items={[
            {
              label: 'Duplicate',
              onClick: () => onDuplicate(rule.id),
              isDisabled: isLocked,
            },
            { type: 'divider' as const },
            {
              label: 'Delete',
              onClick: () => onDelete(rule.id),
              isDisabled: isLocked,
            },
          ]}
        />
      </HStack>

      <AdvancedOptions
        notes={notes}
        onNotesChange={setNotes}
        logging={logging}
        onLoggingChange={setLogging}
        stateless={stateless}
        onStatelessChange={setStateless}
      />

      <Divider />
    </VStack>
  );
}
