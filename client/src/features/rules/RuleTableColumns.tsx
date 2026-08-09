import type React from 'react';
import type { ReactNode } from 'react';
import type { TableColumn } from '@astryxdesign/core/Table';
import { proportional, pixel } from '@astryxdesign/core/Table';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Token } from '@astryxdesign/core/Token';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { Text } from '@astryxdesign/core/Text';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Button } from '@astryxdesign/core/Button';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Selector, SelectorOption } from '@astryxdesign/core/Selector';
import type { SelectorOptionData } from '@astryxdesign/core/Selector';

import type { Rule, PolicyLabel, RuleEndpoint, RuleService } from '../../api/policies.js';
import { ProductIcon } from '../../components/ProductVisuals.js';
import { ActionToken } from './ActionToken.js';
import { GhostTokens } from './GhostTokens.js';
import { EndpointEditor } from './EndpointEditor.js';
import { ServiceEditor } from './ServiceEditor.js';
import {
  getFilterColor,
  getDisplayValue,
  isNegatedOperator,
  getFilterTooltip,
} from './endpointDisplay.js';

export type RuleTableRow = Rule & Record<string, unknown>;

function dimIfDisabled(row: RuleTableRow, content: React.ReactNode): React.ReactNode {
  if (!row.enabled) {
    return <span style={{ opacity: 0.5 }}>{content}</span>;
  }
  return content;
}

export interface EditDraft {
  source: RuleEndpoint;
  destination: RuleEndpoint;
  services: RuleService[];
  action: 'allow' | 'deny';
  scope_type: 'intra' | 'extra';
}

export function getGhostLabels(
  scopeLabels: PolicyLabel[],
  scopeType: 'intra' | 'extra',
  field: 'source' | 'destination',
): PolicyLabel[] {
  if (scopeLabels.length === 0) return [];
  if (scopeType === 'intra') return scopeLabels;
  if (scopeType === 'extra' && field === 'destination') return scopeLabels;
  return [];
}

function renderEndpointTokens(endpoint: RuleEndpoint): React.ReactNode {
  if (!endpoint.filters || endpoint.filters.length === 0) {
    return (
      <Tooltip content="Matches all workloads in the policy scope">
        <HStack gap={0.5} vAlign="center">
          <ProductIcon name="allWorkloads" size="sm" color="tertiary" />
          <Text type="supporting" color="secondary">
            All workloads
          </Text>
        </HStack>
      </Tooltip>
    );
  }

  return (
    <HStack gap={0.5} wrap="wrap">
      {endpoint.filters.map((f, i) => {
        const negated = isNegatedOperator(f.operator);
        return (
          <Tooltip key={i} content={getFilterTooltip(f)}>
            <Token
              label={getDisplayValue(f)}
              color={negated ? 'red' : getFilterColor(f.field)}
              size="sm"
              icon={<ProductIcon name={negated ? 'removed' : 'label'} color="inherit" />}
            />
          </Tooltip>
        );
      })}
    </HStack>
  );
}

const SCOPE_TYPE_DESCRIPTIONS: Record<string, string> = {
  intra: 'Within scope',
  extra: 'From outside the scope (inbound)',
};

const scopeTypeOptions = [
  { value: 'intra', label: 'Intra scope' },
  { value: 'extra', label: 'Extra scope' },
];

function renderScopeTypeOption(option: SelectorOptionData): ReactNode {
  return (
    <SelectorOption
      label={option.label ?? option.value}
      description={SCOPE_TYPE_DESCRIPTIONS[option.value] ?? ''}
    />
  );
}

const actionOptions = [
  { value: 'allow', label: 'Allow' },
  { value: 'deny', label: 'Deny' },
];

export interface ColumnOptions {
  scopeLabels: PolicyLabel[];
  editingId: string | null;
  editDraft: EditDraft | null;
  onEditDraftChange: (field: keyof EditDraft, value: EditDraft[keyof EditDraft]) => void;
  onStartEdit: (rule: Rule) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (ruleId: string) => void;
  onDuplicate: (ruleId: string) => void;
  onToggleEnabled: (ruleId: string, currentEnabled: number) => void;
  onOpenAdvanced: (ruleId: string) => void;
  isLocked: boolean;
  provisionStatus: 'draft' | 'provisioned' | 'pending';
}

export function getColumns(opts: ColumnOptions): TableColumn<RuleTableRow>[] {
  const {
    scopeLabels,
    editingId,
    editDraft,
    onEditDraftChange,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onDelete,
    onDuplicate,
    onToggleEnabled,
    onOpenAdvanced,
    isLocked,
    provisionStatus,
  } = opts;

  const hasScope = scopeLabels.length > 0;

  const columns: TableColumn<RuleTableRow>[] = [
    {
      key: 'position',
      header: '#',
      width: pixel(48),
      renderCell: (row: RuleTableRow) =>
        dimIfDisabled(
          row,
          <Text type="supporting" weight="medium">
            {row.position}
          </Text>,
        ),
    },
    {
      key: 'status',
      header: 'Status',
      width: pixel(110),
      renderCell: (row: RuleTableRow) => (
        <HStack gap={0.5} vAlign="center">
          <StatusDot
            variant={row.enabled ? 'success' : 'neutral'}
            label={row.enabled ? 'Enabled' : 'Disabled'}
          />
          <Text type="supporting">{row.enabled ? 'Enabled' : 'Disabled'}</Text>
        </HStack>
      ),
    },
  ];

  if (hasScope) {
    columns.push({
      key: 'scope_type',
      header: 'Scope',
      width: pixel(130),
      renderCell: (row: RuleTableRow) => {
        const isEditing = editingId === row.id;
        if (isEditing && editDraft) {
          return (
            <Selector
              label="Scope type"
              isLabelHidden
              options={scopeTypeOptions}
              value={editDraft.scope_type}
              onChange={(v: string) => onEditDraftChange('scope_type', v as 'intra' | 'extra')}
              size="sm"
              renderOption={renderScopeTypeOption}
            />
          );
        }
        return dimIfDisabled(
          row,
          <Tooltip
            content={
              row.scope_type === 'intra'
                ? 'Intra scope\nTraffic within this policy scope'
                : 'Extra scope\nTraffic from outside the policy scope'
            }
          >
            <Token
              label={row.scope_type === 'intra' ? 'Intra' : 'Extra'}
              color={row.scope_type === 'intra' ? 'blue' : 'purple'}
              size="sm"
              icon={<ProductIcon name="scope" color="inherit" />}
            />
          </Tooltip>,
        );
      },
    });
  }

  columns.push(
    {
      key: 'source',
      header: 'Source',
      width: proportional(2),
      renderCell: (row: RuleTableRow) => {
        const isEditing = editingId === row.id;
        const scopeType = isEditing && editDraft ? editDraft.scope_type : row.scope_type;
        const ghosts = getGhostLabels(scopeLabels, scopeType, 'source');

        if (isEditing && editDraft) {
          return (
            <EndpointEditor
              value={editDraft.source}
              onChange={(v) => onEditDraftChange('source', v)}
              ghostLabels={ghosts}
              side="source"
            />
          );
        }
        return dimIfDisabled(
          row,
          <VStack gap={0.5}>
            {renderEndpointTokens(row.source)}
            {ghosts.length > 0 && <GhostTokens labels={ghosts} />}
          </VStack>,
        );
      },
    },
    {
      key: 'arrow',
      header: 'Direction',
      width: pixel(32),
      renderCell: (row: RuleTableRow) =>
        dimIfDisabled(
          row,
          <ProductIcon name="arrowRight" size="sm" color="secondary" label="to" />,
        ),
    },
    {
      key: 'destination',
      header: 'Destination',
      width: proportional(2),
      renderCell: (row: RuleTableRow) => {
        const isEditing = editingId === row.id;
        const scopeType = isEditing && editDraft ? editDraft.scope_type : row.scope_type;
        const ghosts = getGhostLabels(scopeLabels, scopeType, 'destination');

        if (isEditing && editDraft) {
          return (
            <EndpointEditor
              value={editDraft.destination}
              onChange={(v) => onEditDraftChange('destination', v)}
              ghostLabels={ghosts}
              side="destination"
            />
          );
        }
        return dimIfDisabled(
          row,
          <VStack gap={0.5}>
            {renderEndpointTokens(row.destination)}
            {ghosts.length > 0 && <GhostTokens labels={ghosts} />}
          </VStack>,
        );
      },
    },
    {
      key: 'services',
      header: 'Service',
      width: proportional(1),
      renderCell: (row: RuleTableRow) => {
        const isEditing = editingId === row.id;
        if (isEditing && editDraft) {
          return (
            <ServiceEditor
              value={editDraft.services}
              onChange={(v) => onEditDraftChange('services', v)}
            />
          );
        }
        return dimIfDisabled(
          row,
          <HStack gap={0.5} wrap="wrap">
            {row.services.map((s, i) => (
              <Tooltip key={i} content={`Service\nProtocol: ${s.protocol}\nPort: ${s.port}`}>
                <Token
                  label={`${s.protocol} ${s.port}`}
                  color="default"
                  size="sm"
                  icon={<ProductIcon name="service" color="inherit" />}
                />
              </Tooltip>
            ))}
          </HStack>,
        );
      },
    },
    {
      key: 'action',
      header: 'Action',
      width: pixel(100),
      renderCell: (row: RuleTableRow) => {
        const isEditing = editingId === row.id;
        if (isEditing && editDraft) {
          return (
            <Selector
              label="Action"
              isLabelHidden
              options={actionOptions}
              value={editDraft.action}
              onChange={(v: string) => onEditDraftChange('action', v as 'allow' | 'deny')}
              size="sm"
            />
          );
        }
        return dimIfDisabled(row, <ActionToken action={row.action} />);
      },
    },
    {
      key: 'provision',
      header: 'Provision',
      width: pixel(100),
      renderCell: (row: RuleTableRow) => {
        let token: React.ReactNode;
        if (provisionStatus === 'provisioned') {
          token = (
            <Tooltip content="Active\nRule is live in the enforced policy">
              <Token
                label="Active"
                color="green"
                size="sm"
                icon={<ProductIcon name="provision" color="inherit" />}
              />
            </Tooltip>
          );
        } else if (provisionStatus === 'pending') {
          token = (
            <Tooltip content="Modified\nRule has unpushed changes since last provision">
              <Token
                label="Modified"
                color="orange"
                size="sm"
                icon={<ProductIcon name="modified" color="inherit" />}
              />
            </Tooltip>
          );
        } else {
          token = (
            <Tooltip content="Draft\nRule has not been provisioned yet">
              <Token
                label="Draft"
                color="gray"
                size="sm"
                icon={<ProductIcon name="diff" color="inherit" />}
              />
            </Tooltip>
          );
        }
        return dimIfDisabled(row, token);
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      width: pixel(80),
      renderCell: (row: RuleTableRow) => {
        const isEditing = editingId === row.id;
        if (isEditing) {
          return (
            <HStack gap={1}>
              <Button label="Save" variant="primary" size="sm" onClick={onSaveEdit} />
              <Button label="Cancel" variant="ghost" size="sm" onClick={onCancelEdit} />
            </HStack>
          );
        }
        const hasAdvanced = Boolean(row.notes) || Boolean(row.logging) || Boolean(row.stateless);
        return (
          <HStack gap={0.5} vAlign="center">
            {hasAdvanced && (
              <StatusDot
                variant="accent"
                label="Advanced options configured"
                tooltip="This rule has advanced options"
              />
            )}
            <MoreMenu
              size="sm"
              items={[
                {
                  label: 'Edit',
                  onClick: () => onStartEdit(row),
                  isDisabled: isLocked,
                },
                {
                  label: row.enabled ? 'Disable' : 'Enable',
                  onClick: () => onToggleEnabled(row.id, row.enabled),
                  isDisabled: isLocked,
                },
                {
                  label: 'Advanced',
                  onClick: () => onOpenAdvanced(row.id),
                  isDisabled: isLocked,
                },
                {
                  label: 'Duplicate',
                  onClick: () => onDuplicate(row.id),
                  isDisabled: isLocked,
                },
                { type: 'divider' as const },
                {
                  label: 'Delete',
                  onClick: () => onDelete(row.id),
                  isDisabled: isLocked,
                },
              ]}
            />
          </HStack>
        );
      },
    },
  );

  return columns;
}
