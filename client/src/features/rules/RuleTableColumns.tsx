import type React from 'react';
import type { ReactNode } from 'react';
import type { TableColumn } from '@astryxdesign/core/Table';
import { proportional, pixel } from '@astryxdesign/core/Table';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Token } from '@astryxdesign/core/Token';
import { Text } from '@astryxdesign/core/Text';
import { Icon } from '@astryxdesign/core/Icon';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Button } from '@astryxdesign/core/Button';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Selector, SelectorOption } from '@astryxdesign/core/Selector';
import type { SelectorOptionData } from '@astryxdesign/core/Selector';

import type { Rule, PolicyLabel, RuleEndpoint, RuleService, EndpointFilter } from '../../api/policies.js';
import { ActionToken } from './ActionToken.js';
import { GhostTokens } from './GhostTokens.js';
import { EndpointEditor } from './EndpointEditor.js';
import { ServiceEditor } from './ServiceEditor.js';

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
  field: 'source' | 'destination'
): PolicyLabel[] {
  if (scopeLabels.length === 0) return [];
  if (scopeType === 'intra') return scopeLabels;
  if (scopeType === 'extra' && field === 'destination') return scopeLabels;
  return [];
}

function fieldLabel(field: string): string {
  const labelMap: Record<string, string> = {
    label_role: 'Role',
    label_app: 'App',
    label_env: 'Env',
    label_loc: 'Loc',
    label_type: 'Type',
    ip_list: 'IP List',
    workload: 'Workload',
    user_group: 'User Group',
    virtual_service: 'Virtual Service',
    label_group: 'Label Group',
    k8s_cluster: 'Cluster',
    k8s_namespace: 'Namespace',
    k8s_pod_app: 'Pod App',
    k8s_pod_tier: 'Pod Tier',
    k8s_service: 'K8s Service',
    k8s_ingress: 'Ingress',
    k8s_gateway: 'Gateway',
    k8s_service_account: 'Service Account',
    cloud_aws_account: 'AWS Account',
    cloud_azure_subscription: 'Azure Subscription',
    fqdn: 'FQDN',
  };
  if (labelMap[field]) return labelMap[field];
  // Fallback: convert snake_case to Title Case
  return field
    .replace(/^(label_|k8s_|cloud_)/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

type TokenColor = 'default' | 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'cyan' | 'blue' | 'purple' | 'pink' | 'gray';

const FIELD_COLOR_MAP: Array<[string, TokenColor]> = [
  ['label_group', 'purple'],
  ['label_', 'default'],
  ['ip_list', 'orange'],
  ['workload', 'teal'],
  ['user_group', 'blue'],
  ['virtual_service', 'green'],
  ['k8s_cluster', 'gray'],
  ['k8s_namespace', 'teal'],
  ['k8s_pod_', 'blue'],
  ['k8s_service_account', 'blue'],
  ['k8s_service', 'green'],
  ['k8s_ingress', 'green'],
  ['k8s_gateway', 'green'],
  ['cloud_aws', 'orange'],
  ['cloud_azure', 'blue'],
  ['fqdn', 'gray'],
];

function getFilterColor(field: string): TokenColor {
  for (const [prefix, color] of FIELD_COLOR_MAP) {
    if (field.startsWith(prefix)) return color;
  }
  return 'default';
}

function getDisplayValue(filter: EndpointFilter): string {
  const val = filter.value;
  if (!val || val.type === 'empty') return `${fieldLabel(filter.field)} exists`;
  if (val.type === 'enum') return `${fieldLabel(filter.field)}=${val.value}`;
  if (val.type === 'enum_list') return `${fieldLabel(filter.field)} [${(val.value as string[]).join(',')}]`;
  if (val.type === 'entity_list') return (val.value as Array<{ id: string; label: string }>).map((e) => e.label).join(', ');
  if (val.type === 'string') return val.value as string;
  if (val.type === 'string_list') return (val.value as string[]).join(', ');
  return String(val.value ?? '');
}

function renderEndpointTokens(endpoint: RuleEndpoint): React.ReactNode {
  if (!endpoint.filters || endpoint.filters.length === 0) {
    return <Text type="supporting" color="secondary">All workloads</Text>;
  }

  return (
    <HStack gap={0.5} wrap="wrap">
      {endpoint.filters.map((f, i) => (
        <Token key={i} label={getDisplayValue(f)} color={getFilterColor(f.field)} size="sm" />
      ))}
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
      renderCell: (row: RuleTableRow) => dimIfDisabled(
        row,
        <Text type="supporting" weight="medium">{row.position}</Text>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: pixel(80),
      renderCell: (row: RuleTableRow) => (
        <StatusDot
          variant={row.enabled ? 'success' : 'neutral'}
          label={row.enabled ? 'Enabled' : 'Disabled'}
          tooltip={row.enabled ? 'Enabled' : 'Disabled'}
        />
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
          <Token
            label={row.scope_type === 'intra' ? 'Intra' : 'Extra'}
            color={row.scope_type === 'intra' ? 'blue' : 'purple'}
            size="sm"
          />
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
          </VStack>
        );
      },
    },
    {
      key: 'arrow',
      header: '',
      width: pixel(32),
      renderCell: (row: RuleTableRow) => dimIfDisabled(
        row,
        <Icon icon="chevronRight" size="sm" color="secondary" label="to" />
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
          </VStack>
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
              <Token key={i} label={`${s.protocol} ${s.port}`} color="default" size="sm" />
            ))}
          </HStack>
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
          token = <Token label="Active" color="green" size="sm" />;
        } else if (provisionStatus === 'pending') {
          token = <Token label="Modified" color="orange" size="sm" />;
        } else {
          token = <Token label="Draft" color="gray" size="sm" />;
        }
        return dimIfDisabled(row, token);
      },
    },
    {
      key: 'actions',
      header: '',
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
