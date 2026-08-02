import { useCallback, useState } from 'react';
import { Heading } from '@astryxdesign/core/Heading';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Spinner } from '@astryxdesign/core/Spinner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Banner } from '@astryxdesign/core/Banner';

import {
  fetchRules,
  createRule,
  updateRule,
  deleteRule,
  duplicateRule,
  type PolicyLabel,
  type Rule,
} from '../../api/policies.js';
import { useApi } from '../../hooks/useApi.js';
import { RuleRow } from './RuleRow.js';

interface RuleEditorProps {
  policyId: string;
  scopeLabels: PolicyLabel[];
  isLocked: boolean;
}

export function RuleEditor({ policyId, scopeLabels, isLocked }: RuleEditorProps) {
  const { data: rules, loading, error, refetch } = useApi(
    () => fetchRules(policyId),
    [policyId]
  );
  const [mutationError, setMutationError] = useState<string | null>(null);

  const handleAddRule = useCallback(async () => {
    try {
      setMutationError(null);
      await createRule(policyId, {
        source: { type: 'labels', labels: [] },
        destination: { type: 'labels', labels: [] },
        services: [{ protocol: 'TCP', port: '443' }],
        action: 'allow',
        scope_type: 'intra',
      });
      refetch();
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : 'Failed to add rule');
    }
  }, [policyId, refetch]);

  const handleUpdate = useCallback(
    async (ruleId: string, data: Partial<Rule>) => {
      // updateRule accepts enabled as boolean; Rule stores it as number (0/1).
      // Cast the subset of fields updateRule understands.
      const { source, destination, services, action, scope_type, enabled } = data;
      try {
        setMutationError(null);
        await updateRule(ruleId, {
          ...(source !== undefined && { source }),
          ...(destination !== undefined && { destination }),
          ...(services !== undefined && { services }),
          ...(action !== undefined && { action }),
          ...(scope_type !== undefined && { scope_type }),
          ...(enabled !== undefined && { enabled: Boolean(enabled) }),
        });
        refetch();
      } catch (e) {
        setMutationError(e instanceof Error ? e.message : 'Failed to update rule');
      }
    },
    [refetch]
  );

  const handleDelete = useCallback(
    async (ruleId: string) => {
      try {
        setMutationError(null);
        await deleteRule(ruleId);
        refetch();
      } catch (e) {
        setMutationError(e instanceof Error ? e.message : 'Failed to delete rule');
      }
    },
    [refetch]
  );

  const handleDuplicate = useCallback(
    async (ruleId: string) => {
      try {
        setMutationError(null);
        await duplicateRule(ruleId);
        refetch();
      } catch (e) {
        setMutationError(e instanceof Error ? e.message : 'Failed to duplicate rule');
      }
    },
    [refetch]
  );

  if (loading) {
    return (
      <HStack hAlign="center" padding={4}>
        <Spinner label="Loading rules…" size="md" />
      </HStack>
    );
  }

  if (error) {
    return <Banner status="error" title={error} />;
  }

  const ruleList = rules ?? [];

  return (
    <VStack gap={3}>
      {!!mutationError && (
        <Banner
          status="error"
          title={mutationError}
          isDismissable
          onDismiss={() => setMutationError(null)}
        />
      )}
      <HStack hAlign="between" vAlign="center">
        <Heading level={2}>Rules</Heading>
        <Button
          label="+ Add Rule"
          variant="secondary"
          onClick={handleAddRule}
          isDisabled={isLocked}
          tooltip={isLocked ? 'Unlock policy to add rules' : undefined}
        />
      </HStack>

      {ruleList.length === 0 ? (
        <EmptyState
          title="No rules yet"
          description="Add rules to define what traffic this policy allows or denies."
          headingLevel={3}
        />
      ) : (
        <VStack gap={0}>
          {ruleList.map((rule, index) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              position={index + 1}
              scopeLabels={scopeLabels}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              isLocked={isLocked}
            />
          ))}
        </VStack>
      )}
    </VStack>
  );
}
