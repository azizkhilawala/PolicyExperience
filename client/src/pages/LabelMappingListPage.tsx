import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, proportional, pixel } from '@astryxdesign/core/Table';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Text } from '@astryxdesign/core/Text';
import { Token } from '@astryxdesign/core/Token';
import { Spinner } from '@astryxdesign/core/Spinner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Banner } from '@astryxdesign/core/Banner';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Icon } from '@astryxdesign/core/Icon';
import { Play, Plus } from 'lucide-react';

import { useApi } from '../hooks/useApi.js';
import { Tooltip } from '@astryxdesign/core/Tooltip';

import {
  fetchMappingRules,
  deleteMappingRule,
  evaluateMappings,
  updateMappingRule,
  getRuleExpression,
  type MappingRule,
  DIMENSION_LABELS,
  VALUE_MODE_LABELS,
} from '../api/label-mapping.js';
import { CoverageDashboard } from '../features/label-mapping/CoverageDashboard.js';

type RuleRow = MappingRule & Record<string, unknown>;

export default function LabelMappingListPage() {
  const navigate = useNavigate();
  const fetcher = useCallback(() => fetchMappingRules(), []);
  const { data, loading, error, refetch } = useApi<MappingRule[]>(fetcher);
  const [actionError, setActionError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    name: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const rules: RuleRow[] = (data ?? []) as RuleRow[];

  const handleEvaluate = async () => {
    setEvaluating(true);
    setActionError(null);
    try {
      const result = await evaluateMappings();
      setActionError(null);
      refetch();
      alert(`Evaluation complete: ${result.mappings_created} mappings, ${result.conflicts} conflicts`);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Evaluation failed');
    }
    setEvaluating(false);
  };

  const handleToggle = async (rule: MappingRule) => {
    try {
      await updateMappingRule(rule.id, { enabled: rule.enabled ? 0 : 1 });
      refetch();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Toggle failed');
    }
  };

  const columns = [
    {
      key: 'priority',
      header: '#',
      width: pixel(50),
      renderCell: (row: RuleRow) => <Text type="supporting">{row.priority}</Text>,
    },
    {
      key: 'name',
      header: 'Rule',
      width: proportional(2),
      renderCell: (row: RuleRow) => (
        <VStack
          gap={0}
          onClick={() => navigate(`/label-mapping/${row.id}`)}
          style={{ cursor: 'pointer' }}
        >
          <HStack gap={1} vAlign="center">
            <StatusDot
              variant={row.enabled ? 'success' : 'neutral'}
              label={row.enabled ? 'Enabled' : 'Disabled'}
            />
            <Text weight="medium">{row.name}</Text>
          </HStack>
          {row.description && (
            <Text type="supporting" color="secondary">{row.description}</Text>
          )}
        </VStack>
      ),
    },
    {
      key: 'match_mode',
      header: 'Mode',
      width: pixel(100),
      renderCell: (row: RuleRow) => (
        <Token
          label={row.match_mode === 'guided' ? 'Guided' : 'Expression'}
          color={row.match_mode === 'guided' ? 'blue' : 'purple'}
          size="sm"
        />
      ),
    },
    {
      key: 'expression',
      header: 'Expression',
      width: proportional(2),
      renderCell: (row: RuleRow) => {
        const expr = getRuleExpression(row as MappingRule);
        if (!expr) return <Text type="supporting">—</Text>;
        const truncated = expr.length > 60 ? expr.slice(0, 57) + '…' : expr;
        return (
          <Tooltip content={expr}>
            <Text
              type="supporting"
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: 'var(--font-size-xs, 11px)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 280,
                display: 'block',
              }}
            >
              {truncated}
            </Text>
          </Tooltip>
        );
      },
    },
    {
      key: 'target_dimension',
      header: 'Target',
      width: pixel(160),
      renderCell: (row: RuleRow) => (
        <VStack gap={0}>
          <Token
            label={DIMENSION_LABELS[row.target_dimension] ?? row.target_dimension}
            color="teal"
            size="sm"
          />
          <Text type="supporting">{VALUE_MODE_LABELS[row.target_value_mode] ?? row.target_value_mode}</Text>
        </VStack>
      ),
    },
    {
      key: 'matched',
      header: 'Matched',
      width: pixel(90),
      renderCell: (row: RuleRow) => (
        <HStack gap={1} vAlign="center">
          <Text>{row.matched_count ?? 0}</Text>
          {(row.conflict_count ?? 0) > 0 && (
            <Token label={`${row.conflict_count} conflicts`} color="red" size="sm" />
          )}
        </HStack>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: pixel(50),
      renderCell: (row: RuleRow) => (
        <MoreMenu
          size="sm"
          items={[
            { label: 'View Details', onClick: () => navigate(`/label-mapping/${row.id}`) },
            { label: 'Edit', onClick: () => navigate(`/label-mapping/${row.id}/edit`) },
            {
              label: row.enabled ? 'Disable' : 'Enable',
              onClick: () => handleToggle(row as MappingRule),
            },
            { type: 'divider' as const },
            {
              label: 'Delete',
              onClick: () => {
                setDeleteConfirm({
                  name: row.name,
                  onConfirm: async () => {
                    try {
                      setActionError(null);
                      await deleteMappingRule(row.id);
                      refetch();
                    } catch (e) {
                      setActionError(e instanceof Error ? e.message : 'Delete failed');
                    }
                  },
                });
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <VStack gap={3} padding={4}>
      <HStack hAlign="between" vAlign="center">
        <Heading level={1}>Label Mapping</Heading>
        <HStack gap={2}>
          <Button
            label={evaluating ? 'Evaluating…' : 'Evaluate All'}
            variant="secondary"
            size="sm"
            icon={<Icon icon={Play} />}
            onClick={handleEvaluate}
            isDisabled={evaluating}
          />
          <Button
            label="Create Rule"
            variant="primary"
            icon={<Icon icon={Plus} />}
            onClick={() => navigate('/label-mapping/new')}
          />
        </HStack>
      </HStack>

      <CoverageDashboard />

      {actionError && (
        <Banner
          status="error"
          title={actionError}
          isDismissable
          onDismiss={() => setActionError(null)}
        />
      )}

      {loading ? (
        <HStack hAlign="center" padding={8}>
          <Spinner label="Loading rules…" size="lg" />
        </HStack>
      ) : error ? (
        <Banner status="error" title={error} />
      ) : rules.length === 0 ? (
        <EmptyState
          title="No mapping rules"
          description="Create your first rule to map Kubernetes labels to Illumio label dimensions."
          headingLevel={3}
          actions={
            <Button
              label="Create Rule"
              variant="primary"
              icon={<Icon icon={Plus} />}
              onClick={() => navigate('/label-mapping/new')}
            />
          }
        />
      ) : (
        <Table<RuleRow> data={rules} columns={columns} idKey="id" density="compact" hasHover />
      )}

      <AlertDialog
        isOpen={!!deleteConfirm}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
        title={`Delete "${deleteConfirm?.name ?? ''}"?`}
        description="This will permanently delete this rule and all associated mappings."
        actionLabel="Delete"
        isActionLoading={deleteLoading}
        onAction={async () => {
          if (!deleteConfirm) return;
          setDeleteLoading(true);
          await deleteConfirm.onConfirm();
          setDeleteLoading(false);
          setDeleteConfirm(null);
        }}
      />
    </VStack>
  );
}
