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
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Banner } from '@astryxdesign/core/Banner';

import type { V2Rule, V2RuleService } from '../../api/v2-policies.js';
import { createV2Rule, updateV2Rule, deleteV2Rule } from '../../api/v2-policies.js';
import type { EndpointFilter } from '../../api/policies.js';
import { ProductIcon, ProductIllustration } from '../../components/ProductVisuals.js';
import { getFilterColor, getDisplayValue, isNegatedOperator } from '../rules/endpointDisplay.js';
import { ActionToken } from '../rules/ActionToken.js';
import { V2EntityEditor } from './V2EntityEditor.js';
import { V2ServiceEditor } from './V2ServiceEditor.js';

export interface DraftRule {
  tempId: string;
  direction: 'ingress' | 'egress';
  entity: EndpointFilter[];
  services: V2RuleService[];
  action: 'allow' | 'deny' | 'override_deny';
  enabled: number;
}

interface V2RuleTableProps {
  policyId: string;
  direction: 'ingress' | 'egress';
  rules: V2Rule[];
  onRulesChanged: () => void;
  draftMode?: boolean;
  draftRules?: DraftRule[];
  onDraftRulesChange?: (rules: DraftRule[]) => void;
  readOnly?: boolean;
}

interface EditDraft {
  entity: EndpointFilter[];
  services: V2RuleService[];
  action: 'allow' | 'deny' | 'override_deny';
}

type V2RuleRow = (V2Rule | (DraftRule & { id: string })) & Record<string, unknown>;

const actionOptions: SelectorOptionData[] = [
  { value: 'allow', label: 'Allow' },
  { value: 'deny', label: 'Deny' },
  { value: 'override_deny', label: 'Override Deny' },
];

function renderEntityTokens(filters: EndpointFilter[]) {
  if (!filters || filters.length === 0) {
    return (
      <HStack gap={0.5} vAlign="center">
        <ProductIcon name="allWorkloads" size="sm" color="tertiary" />
        <Text type="supporting" color="secondary">All workloads</Text>
      </HStack>
    );
  }
  return (
    <HStack gap={0.5} wrap="wrap">
      {filters.map((f, i) => {
        const negated = isNegatedOperator(f.operator);
        return (
          <Token
            key={i}
            label={getDisplayValue(f)}
            color={negated ? 'red' : getFilterColor(f.field)}
            size="sm"
            icon={<ProductIcon name={negated ? 'removed' : 'label'} color="inherit" />}
          />
        );
      })}
    </HStack>
  );
}

function renderServiceTokens(services: V2RuleService[]) {
  if (!services || services.length === 0) {
    return (
      <HStack gap={0.5} vAlign="center">
        <ProductIcon name="service" size="sm" color="tertiary" />
        <Text type="supporting" color="secondary">All Services</Text>
      </HStack>
    );
  }
  return (
    <HStack gap={0.5} wrap="wrap">
      {services.map((s, i) => {
        const label = s.type === 'named' ? s.name : `${s.protocol}/${s.port}`;
        return (
          <Token
            key={i}
            label={label}
            color="default"
            size="sm"
            icon={<ProductIcon name="service" color="inherit" />}
          />
        );
      })}
    </HStack>
  );
}

export function V2RuleTable({
  policyId,
  direction,
  rules,
  onRulesChanged,
  draftMode = false,
  draftRules,
  onDraftRulesChange,
  readOnly = false,
}: V2RuleTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [newRuleMode, setNewRuleMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState<string>('all');

  const handleAddRule = useCallback(async () => {
    if (draftMode) {
      const tempId = crypto.randomUUID();
      const newDraft: DraftRule = {
        tempId,
        direction,
        entity: [],
        services: [],
        action: 'allow',
        enabled: 1,
      };
      onDraftRulesChange?.([...(draftRules ?? []), newDraft]);
      setEditingId(tempId);
      setEditDraft({ entity: [], services: [], action: 'allow' });
      setNewRuleMode(true);
      return;
    }

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
  }, [policyId, direction, onRulesChanged, draftMode, draftRules, onDraftRulesChange]);

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

    if (draftMode) {
      const updatedRules = (draftRules ?? []).map((r) =>
        r.tempId === editingId
          ? { ...r, entity: editDraft.entity, services: editDraft.services, action: editDraft.action }
          : r
      );
      onDraftRulesChange?.(updatedRules);
      setEditingId(null);
      setEditDraft(null);
      setNewRuleMode(false);
      return;
    }

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
  }, [editingId, editDraft, draftMode, draftRules, onDraftRulesChange, onRulesChanged]);

  const handleCancelEdit = useCallback(async () => {
    if (draftMode) {
      if (newRuleMode && editingId) {
        onDraftRulesChange?.((draftRules ?? []).filter((r) => r.tempId !== editingId));
      }
      setEditingId(null);
      setEditDraft(null);
      setNewRuleMode(false);
      return;
    }

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
  }, [newRuleMode, editingId, rules, onRulesChanged, draftMode, draftRules, onDraftRulesChange]);

  const handleDelete = useCallback(
    async (ruleId: string) => {
      if (draftMode) {
        onDraftRulesChange?.((draftRules ?? []).filter((r) => r.tempId !== ruleId));
        return;
      }
      try {
        await deleteV2Rule(ruleId);
        onRulesChanged();
      } catch (e) {
        setMutationError(e instanceof Error ? e.message : 'Failed to delete rule');
      }
    },
    [onRulesChanged, draftMode, draftRules, onDraftRulesChange]
  );

  const handleToggleEnabled = useCallback(
    async (ruleId: string, currentEnabled: number) => {
      if (draftMode) {
        const updatedRules = (draftRules ?? []).map((r) =>
          r.tempId === ruleId ? { ...r, enabled: currentEnabled ? 0 : 1 } : r
        );
        onDraftRulesChange?.(updatedRules);
        return;
      }
      try {
        await updateV2Rule(ruleId, { enabled: !currentEnabled });
        onRulesChanged();
      } catch (e) {
        setMutationError(e instanceof Error ? e.message : 'Failed to update rule');
      }
    },
    [onRulesChanged, draftMode, draftRules, onDraftRulesChange]
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
          const isEditing = !readOnly && editingId === row.id;
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
          const isEditing = !readOnly && editingId === row.id;
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
        width: pixel(150),
        renderCell: (row: V2RuleRow) => {
          const isEditing = !readOnly && editingId === row.id;
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
        width: pixel(110),
        renderCell: (row: V2RuleRow) => (
          <HStack gap={0.5} vAlign="center">
            <StatusDot
              variant={(row.enabled as number) ? 'success' : 'neutral'}
              label={(row.enabled as number) ? 'Enabled' : 'Disabled'}
            />
            <Text type="supporting">
              {(row.enabled as number) ? 'Enabled' : 'Disabled'}
            </Text>
          </HStack>
        ),
      },
      {
        key: 'provision_status',
        header: 'Provision',
        width: pixel(110),
        renderCell: (row: V2RuleRow) => {
          const status = row.provision_status as string | undefined;
          if (!status) return null;
          return (
            <Token
              label={status === 'provisioned' ? 'Provisioned' : 'Draft'}
              color={status === 'provisioned' ? 'green' : 'gray'}
              size="sm"
              icon={<ProductIcon name={status === 'provisioned' ? 'provision' : 'diff'} color="inherit" />}
            />
          );
        },
      },
      {
        key: 'actions',
        header: 'Actions',
        width: pixel(80),
        renderCell: (row: V2RuleRow) => {
          if (readOnly) return null;

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
      readOnly,
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

  const tableData: V2RuleRow[] = useMemo(() => {
    const source = draftMode
      ? (draftRules ?? []).map((r, i) => ({ ...r, id: r.tempId, position: i } as V2RuleRow))
      : rules.map((r) => r as V2RuleRow);
    if (filterAction === 'all') return source;
    return source.filter((r) => (r as any).action === filterAction);
  }, [draftMode, draftRules, rules, filterAction]);

  const isEmpty = draftMode ? (draftRules ?? []).length === 0 : rules.length === 0;

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

      {!readOnly && (
        <HStack hAlign="between" vAlign="center">
          <SegmentedControl
            label="Filter by action"
            value={filterAction}
            onChange={setFilterAction}
            size="sm"
          >
            <SegmentedControlItem value="all" label="All" />
            <SegmentedControlItem value="allow" label="Allow" />
            <SegmentedControlItem value="deny" label="Deny" />
            <SegmentedControlItem value="override_deny" label="Override Deny" />
          </SegmentedControl>
          <Button
            label="Add Rule"
            variant="secondary"
            size="sm"
            icon={<ProductIcon name="add" color="inherit" />}
            onClick={handleAddRule}
          />
        </HStack>
      )}

      {isEmpty ? (
        <EmptyState
          title={`No ${direction} rules`}
          description="Add a rule to define which entities and services are allowed or denied."
          icon={<ProductIllustration kind={direction} />}
          actions={
            !readOnly ? (
              <Button
                label="Add Rule"
                variant="primary"
                size="sm"
                icon={<ProductIcon name="add" color="inherit" />}
                onClick={handleAddRule}
              />
            ) : undefined
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
