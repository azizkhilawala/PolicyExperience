import { useState, useCallback, useMemo } from 'react';
import { Table } from '@astryxdesign/core/Table';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { useToast } from '@astryxdesign/core/Toast';

import type { Rule, PolicyLabel, RuleEndpoint, RuleService } from '../../api/policies.js';
import { getColumns, type RuleTableRow, type EditDraft } from './RuleTableColumns.js';
import { AdvancedOptionsDialog } from './AdvancedOptionsDialog.js';

interface RuleTableProps {
  rules: Rule[];
  scopeLabels: PolicyLabel[];
  isLocked: boolean;
  provisionStatus: 'draft' | 'provisioned' | 'pending';
  onUpdate: (ruleId: string, data: Partial<Rule>) => Promise<void>;
  onDelete: (ruleId: string) => Promise<void>;
  onDuplicate: (ruleId: string) => Promise<void>;
}

export function RuleTable({
  rules,
  scopeLabels,
  isLocked,
  provisionStatus,
  onUpdate,
  onDelete,
  onDuplicate,
}: RuleTableProps) {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [advancedRule, setAdvancedRule] = useState<Rule | null>(null);

  const toast = useToast();

  const filteredRules: RuleTableRow[] = useMemo(() => {
    let result = rules;
    if (actionFilter !== 'all') {
      result = result.filter((r) => r.action === actionFilter);
    }
    return result.map((r) => r as RuleTableRow);
  }, [rules, actionFilter]);

  const handleStartEdit = useCallback((rule: Rule) => {
    setEditingId(rule.id);
    setEditDraft({
      source: rule.source,
      destination: rule.destination,
      services: rule.services,
      action: rule.action,
      scope_type: rule.scope_type,
    });
  }, []);

  const handleEditDraftChange = useCallback(
    (field: keyof EditDraft, value: EditDraft[keyof EditDraft]) => {
      setEditDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
    },
    []
  );

  const handleSaveEdit = useCallback(async () => {
    if (!editingId || !editDraft) return;
    await onUpdate(editingId, editDraft);
    setEditingId(null);
    setEditDraft(null);
  }, [editingId, editDraft, onUpdate]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditDraft(null);
  }, []);

  const handleToggleEnabled = useCallback(
    (ruleId: string, currentEnabled: number) => {
      onUpdate(ruleId, { enabled: currentEnabled ? 0 : 1 } as Partial<Rule>);
    },
    [onUpdate]
  );

  const handleOpenAdvanced = useCallback((ruleId: string) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (rule) setAdvancedRule(rule);
  }, [rules]);

  const handleSaveAdvanced = useCallback(
    async (ruleId: string, data: { notes: string; logging: boolean; stateless: boolean }) => {
      await onUpdate(ruleId, {
        notes: data.notes,
        logging: data.logging ? 1 : 0,
        stateless: data.stateless ? 1 : 0,
      });
      toast({ body: 'Advanced options saved', type: 'info', isAutoHide: true, uniqueID: 'adv-save' });
    },
    [onUpdate, toast]
  );

  const columns = useMemo(
    () =>
      getColumns({
        scopeLabels,
        editingId,
        editDraft,
        onEditDraftChange: handleEditDraftChange,
        onStartEdit: handleStartEdit,
        onSaveEdit: handleSaveEdit,
        onCancelEdit: handleCancelEdit,
        onDelete: (id) => onDelete(id),
        onDuplicate: (id) => onDuplicate(id),
        onToggleEnabled: handleToggleEnabled,
        onOpenAdvanced: handleOpenAdvanced,
        isLocked,
        provisionStatus,
      }),
    [
      scopeLabels,
      editingId,
      editDraft,
      handleEditDraftChange,
      handleStartEdit,
      handleSaveEdit,
      handleCancelEdit,
      onDelete,
      onDuplicate,
      handleToggleEnabled,
      handleOpenAdvanced,
      isLocked,
      provisionStatus,
    ]
  );

  return (
    <VStack gap={2}>
      <HStack hAlign="start">
        <SegmentedControl
          value={actionFilter}
          onChange={setActionFilter}
          label="Filter by action"
          size="sm"
        >
          <SegmentedControlItem value="all" label="All" />
          <SegmentedControlItem value="allow" label="Allow" />
          <SegmentedControlItem value="deny" label="Deny" />
        </SegmentedControl>
      </HStack>

      <Table
        data={filteredRules}
        columns={columns}
        idKey="id"
        density="compact"
        hasHover
        verticalAlign="top"
      />

      {advancedRule && (
        <AdvancedOptionsDialog
          isOpen={advancedRule !== null}
          onOpenChange={(open) => { if (!open) setAdvancedRule(null); }}
          rule={advancedRule}
          onSave={handleSaveAdvanced}
        />
      )}
    </VStack>
  );
}
