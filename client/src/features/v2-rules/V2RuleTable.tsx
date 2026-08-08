import { useState, useCallback, useMemo } from 'react';
import { Table } from '@astryxdesign/core/Table';
import { proportional, pixel } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Token } from '@astryxdesign/core/Token';
import { Text } from '@astryxdesign/core/Text';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Button } from '@astryxdesign/core/Button';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Selector } from '@astryxdesign/core/Selector';
import type { SelectorOptionData } from '@astryxdesign/core/Selector';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Banner } from '@astryxdesign/core/Banner';

import type { V2Rule, V2RuleService } from '../../api/v2-policies.js';
import { createV2Rule, updateV2Rule, deleteV2Rule } from '../../api/v2-policies.js';
import type { EndpointFilter } from '../../api/policies.js';
import { getFilterColor, getDisplayValue } from '../rules/endpointDisplay.js';
import { ActionToken } from '../rules/ActionToken.js';
import { V2EntityEditor } from './V2EntityEditor.js';
import { V2ServiceEditor } from './V2ServiceEditor.js';

interface V2RuleTableProps {
  policyId: string;
  direction: 'ingress' | 'egress';
  rules: V2Rule[];
  onRulesChanged: () => void;
}

interface EditDraft {
  entity: EndpointFilter[];
  services: V2RuleService[];
  action: 'allow' | 'deny' | 'override_deny';
}

type V2RuleRow = V2Rule & Record<string, unknown>;

const actionOptions: SelectorOptionData[] = [
  { value: 'allow', label: 'Allow' },
  { value: 'deny', label: 'Deny' },
  { value: 'override_deny', label: 'Override Deny' },
];

function renderEntityTokens(filters: EndpointFilter[]) {
  if (!filters || filters.length === 0) {
    return <Text type="supporting" color="secondary">All workloads</Text>;
  }
  return (
    <HStack gap={0.5} wrap="wrap">
      {filters.map((f, i) => (
        <Token key={i} label={getDisplayValue(f)} color={getFilterColor(f.field)} size="sm" />
      ))}
    </HStack>
  );
}

function renderServiceTokens(services: V2RuleService[]) {
  if (!services || services.length === 0) {
    return <Text type="supporting" color="secondary">All Services</Text>;
  }
  return (
    <HStack gap={0.5} wrap="wrap">
      {services.map((s, i) => {
        const label = s.type === 'named' ? s.name : `${s.protocol}/${s.port}`;
        return <Token key={i} label={label} color="default" size="sm" />;
      })}
    </HStack>
  );
}

export function V2RuleTable({ policyId, direction, rules, onRulesChanged }: V2RuleTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [newRuleMode, setNewRuleMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const handleAddRule = useCallback(async () => {
    try {
      const newRule = await createV2Rule(policyId, {
        direction,
        entity: [],
        services: [],
        action: 'allow',
      });
      onRulesChanged();
      setEditingId(newRule.id);
      setEditDraft({ entity: [], services: [], action: 'allow' });
      setNewRuleMode(true);
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : 'Failed to add rule');
    }
  }, [policyId, direction, onRulesChanged]);

  const handleStartEdit = useCallback((rule: V2Rule) => {
    setEditingId(rule.id);
    setEditDraft({
      entity: rule.entity,
      services: rule.services,
      action: rule.action,
    });
    setNewRuleMode(false);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingId || !editDraft) return;
    setIsSaving(true);
    try {
      await updateV2Rule(editingId, {
        entity: editDraft.entity,
        services: editDraft.services,
        action: editDraft.action,
      });
      onRulesChanged();
      setEditingId(null);
      setEditDraft(null);
      setNewRuleMode(false);
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : 'Failed to save rule');
    } finally {
      setIsSaving(false);
    }
  }, [editingId, editDraft, onRulesChanged]);

  const handleCancelEdit = useCallback(async () => {
    if (newRuleMode && editingId) {
      const rule = rules.find((r) => r.id === editingId);
      const isEmpty =
        rule &&
        (!rule.entity || rule.entity.length === 0) &&
        (!rule.services || rule.services.length === 0);
      if (isEmpty) {
        await deleteV2Rule(editingId).catch(() => {});
        onRulesChanged();
      }
    }
    setEditingId(null);
    setEditDraft(null);
    setNewRuleMode(false);
  }, [newRuleMode, editingId, rules, onRulesChanged]);

  const handleDelete = useCallback(
    async (ruleId: string) => {
      try {
        await deleteV2Rule(ruleId);
        onRulesChanged();
      } catch (e) {
        setMutationError(e instanceof Error ? e.message : 'Failed to delete rule');
      }
    },
    [onRulesChanged]
  );

  const handleToggleEnabled = useCallback(
    async (ruleId: string, currentEnabled: number) => {
      try {
        await updateV2Rule(ruleId, { enabled: !currentEnabled });
        onRulesChanged();
      } catch (e) {
        setMutationError(e instanceof Error ? e.message : 'Failed to update rule');
      }
    },
    [onRulesChanged]
  );

  const columns: TableColumn<V2RuleRow>[] = useMemo(
    () => [
      {
        key: 'position',
        header: '#',
        width: pixel(50),
        renderCell: (row: V2RuleRow) => (
          <Text type="supporting" weight="medium">{(row.position as number) + 1}</Text>
        ),
      },
      {
        key: 'entity',
        header: 'Entity',
        width: proportional(3),
        renderCell: (row: V2RuleRow) => {
          const isEditing = editingId === row.id;
          if (isEditing && editDraft) {
            return (
              <V2EntityEditor
                value={editDraft.entity}
                onChange={(v) => setEditDraft((prev) => prev ? { ...prev, entity: v } : prev)}
                direction={direction}
              />
            );
          }
          return renderEntityTokens(row.entity as EndpointFilter[]);
        },
      },
      {
        key: 'services',
        header: 'Service',
        width: proportional(1.5),
        renderCell: (row: V2RuleRow) => {
          const isEditing = editingId === row.id;
          if (isEditing && editDraft) {
            return (
              <V2ServiceEditor
                value={editDraft.services}
                onChange={(v) => setEditDraft((prev) => prev ? { ...prev, services: v } : prev)}
              />
            );
          }
          return renderServiceTokens(row.services as V2RuleService[]);
        },
      },
      {
        key: 'action',
        header: 'Rule Type',
        width: pixel(100),
        renderCell: (row: V2RuleRow) => {
          const isEditing = editingId === row.id;
          if (isEditing && editDraft) {
            return (
              <Selector
                label="Action"
                isLabelHidden
                options={actionOptions}
                value={editDraft.action}
                onChange={(v: string) => setEditDraft((prev) =>
                  prev ? { ...prev, action: v as 'allow' | 'deny' | 'override_deny' } : prev
                )}
              />
            );
          }
          return <ActionToken action={row.action as 'allow' | 'deny' | 'override_deny'} />;
        },
      },
      {
        key: 'status',
        header: 'Status',
        width: pixel(100),
        renderCell: (row: V2RuleRow) => (
          <StatusDot
            variant={(row.enabled as number) ? 'success' : 'neutral'}
            label={(row.enabled as number) ? 'Enabled' : 'Disabled'}
            tooltip={(row.enabled as number) ? 'Enabled' : 'Disabled'}
          />
        ),
      },
      {
        key: 'provision_status',
        header: 'Provision',
        width: pixel(110),
        renderCell: (row: V2RuleRow) => {
          const status = row.provision_status as string;
          return (
            <Token
              label={status === 'provisioned' ? 'Provisioned' : 'Draft'}
              color={status === 'provisioned' ? 'green' : 'gray'}
              size="sm"
            />
          );
        },
      },
      {
        key: 'actions',
        header: '',
        width: pixel(80),
        renderCell: (row: V2RuleRow) => {
          const isEditing = editingId === row.id;
          if (isEditing) {
            return (
              <HStack gap={1}>
                <Button
                  label="Save"
                  variant="primary"
                  size="sm"
                  onClick={handleSaveEdit}
                  isDisabled={isSaving}
                />
                <Button
                  label="Cancel"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                />
              </HStack>
            );
          }
          return (
            <MoreMenu
              size="sm"
              items={[
                {
                  label: 'Edit',
                  onClick: () => handleStartEdit(row as unknown as V2Rule),
                },
                {
                  label: (row.enabled as number) ? 'Disable' : 'Enable',
                  onClick: () =>
                    handleToggleEnabled(row.id as string, row.enabled as number),
                },
                { type: 'divider' as const },
                {
                  label: 'Delete',
                  onClick: () => handleDelete(row.id as string),
                },
              ]}
            />
          );
        },
      },
    ],
    [
      editingId,
      editDraft,
      direction,
      isSaving,
      handleStartEdit,
      handleSaveEdit,
      handleCancelEdit,
      handleDelete,
      handleToggleEnabled,
    ]
  );

  const tableData: V2RuleRow[] = useMemo(
    () => rules.map((r) => r as V2RuleRow),
    [rules]
  );

  return (
    <VStack gap={2}>
      {mutationError ? (
        <Banner
          status="error"
          title={mutationError}
          isDismissable
          onDismiss={() => setMutationError(null)}
        />
      ) : null}

      <HStack hAlign="end">
        <Button label="Add Rule" variant="primary" size="sm" onClick={handleAddRule} />
      </HStack>

      {rules.length === 0 ? (
        <EmptyState
          title={`No ${direction} rules`}
          description="Add a rule to define which entities and services are allowed or denied."
          actions={
            <Button label="Add Rule" variant="primary" size="sm" onClick={handleAddRule} />
          }
        />
      ) : (
        <Table
          data={tableData}
          columns={columns}
          idKey="id"
          density="compact"
          hasHover
          verticalAlign="top"
        />
      )}
    </VStack>
  );
}
