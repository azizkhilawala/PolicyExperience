import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { Table, proportional, pixel } from '@astryxdesign/core/Table';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Text } from '@astryxdesign/core/Text';
import { Token } from '@astryxdesign/core/Token';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Spinner } from '@astryxdesign/core/Spinner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Breadcrumbs, BreadcrumbItem } from '@astryxdesign/core/Breadcrumbs';
import { Banner } from '@astryxdesign/core/Banner';
import { TabList, Tab } from '@astryxdesign/core/TabList';

import { useApi } from '../hooks/useApi.js';
import { fetchV2Policies, deleteV2Policy, type V2Policy } from '../api/v2-policies.js';
import { fetchV2Templates, deleteV2Template, type V2Template } from '../api/v2-templates.js';
import { ProductIcon, ProductIllustration } from '../components/ProductVisuals.js';
import { StatusIndicator } from '../components/StatusIndicator.js';
import { ProvisionBadge } from '../components/ProvisionBadge.js';

// V2Policy must satisfy Table's Record<string, unknown> generic constraint
type V2PolicyRow = V2Policy & Record<string, unknown>;
type V2TemplateRow = V2Template & Record<string, unknown>;

// Render scope tokens based on scope_type and available scope fields
function ScopeTokens({ policy }: { policy: V2Policy }) {
  if (policy.scope_type === 'all_workloads') {
    return (
      <Token
        label="All Workloads"
        color="blue"
        size="sm"
        icon={<ProductIcon name="allWorkloads" color="inherit" />}
      />
    );
  }

  if (policy.scope_type === 'labels') {
    const labelTokens = policy.scope_labels.map((l) => (
      <Token
        key={`${l.key}=${l.value}`}
        label={`${l.key}=${l.value}`}
        color="purple"
        size="sm"
        icon={<ProductIcon name="label" color="inherit" />}
      />
    ));
    return (
      <HStack gap={1} vAlign="center" wrap="wrap">
        {labelTokens.length > 0 ? labelTokens : (
          <Token
            label="Labels"
            color="purple"
            size="sm"
            icon={<ProductIcon name="label" color="inherit" />}
          />
        )}
      </HStack>
    );
  }

  // k8s scope
  const tokens: ReactNode[] = [];
  for (const id of (policy.scope_cluster_ids ?? [])) {
    tokens.push(
      <Token
        key={`cluster-${id}`}
        label={`Cluster: ${id}`}
        color="teal"
        size="sm"
        icon={<ProductIcon name="cluster" color="inherit" />}
      />
    );
  }
  for (const id of (policy.scope_namespace_ids ?? [])) {
    tokens.push(
      <Token
        key={`ns-${id}`}
        label={`NS: ${id}`}
        color="cyan"
        size="sm"
        icon={<ProductIcon name="cluster" color="inherit" />}
      />
    );
  }
  for (const l of policy.scope_labels) {
    tokens.push(
      <Token
        key={`${l.key}=${l.value}`}
        label={`${l.key}=${l.value}`}
        color="purple"
        size="sm"
        icon={<ProductIcon name="label" color="inherit" />}
      />
    );
  }
  if (tokens.length === 0) {
    return (
      <Token
        label="Kubernetes"
        color="teal"
        size="sm"
        icon={<ProductIcon name="cluster" color="inherit" />}
      />
    );
  }
  return (
    <HStack gap={1} vAlign="center" wrap="wrap">
      {tokens}
    </HStack>
  );
}

export default function V2PolicyListPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'policies' | 'templates'>('policies');

  const { data, loading, error, refetch } = useApi(() => fetchV2Policies());
  const { data: templatesData, loading: templatesLoading, error: templatesError, refetch: refetchTemplates } = useApi(() => fetchV2Templates());
  const [actionError, setActionError] = useState<string | null>(null);

  const policies: V2PolicyRow[] = (data ?? []).map((p) => p as V2PolicyRow);
  const templates: V2TemplateRow[] = (templatesData ?? []).map((t) => t as V2TemplateRow);

  const columns = [
    {
      key: 'name',
      header: 'Name',
      width: proportional(2),
      renderCell: (row: V2PolicyRow) => (
        <VStack gap={0} onClick={() => navigate(`/policy-v2/${row.id}`)} style={{ cursor: 'pointer' }}>
          <HStack gap={1} vAlign="center">
            <ProductIcon
              name={(row as V2Policy).policy_type === 'guardrail' ? 'template' : 'policy'}
              size="sm"
              color={(row as V2Policy).policy_type === 'guardrail' ? 'warning' : 'secondary'}
            />
            <Text weight="medium">{row.name as string}</Text>
            {(row as V2Policy).policy_type === 'guardrail' && (
              <Token
                label="Guardrail"
                color="orange"
                size="sm"
                icon={<ProductIcon name="template" color="inherit" />}
              />
            )}
          </HStack>
          {row.description ? (
            <Text type="supporting" color="secondary">{row.description as string}</Text>
          ) : null}
        </VStack>
      ),
    },
    {
      key: 'scope',
      header: 'Scope',
      width: proportional(2),
      renderCell: (row: V2PolicyRow) => (
        <HStack onClick={() => navigate(`/policy-v2/${row.id}`)} style={{ cursor: 'pointer' }}>
          <ScopeTokens policy={row as V2Policy} />
        </HStack>
      ),
    },
    {
      key: 'enabled',
      header: 'Status',
      width: pixel(140),
      renderCell: (row: V2PolicyRow) => (
        <HStack onClick={() => navigate(`/policy-v2/${row.id}`)} style={{ cursor: 'pointer' }}>
          <StatusIndicator enabled={!!row.enabled} />
        </HStack>
      ),
    },
    {
      key: 'provision_status',
      header: 'Provision Status',
      width: pixel(130),
      renderCell: (row: V2PolicyRow) => (
        <HStack onClick={() => navigate(`/policy-v2/${row.id}`)} style={{ cursor: 'pointer' }}>
          <ProvisionBadge status={row.provision_status as 'draft' | 'provisioned'} />
        </HStack>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: pixel(60),
      renderCell: (row: V2PolicyRow) => (
        <MoreMenu
          size="sm"
          items={[
            { label: 'Edit', onClick: () => navigate(`/policy-v2/${row.id}`) },
            { type: 'divider' as const },
            {
              label: 'Delete',
              onClick: async () => {
                try {
                  setActionError(null);
                  await deleteV2Policy(row.id as string);
                  refetch();
                } catch (e) {
                  setActionError(e instanceof Error ? e.message : 'Delete failed');
                }
              },
            },
          ]}
        />
      ),
    },
  ];

  const templateColumns = [
    {
      key: 'name',
      header: 'Name',
      width: proportional(2),
      renderCell: (row: V2TemplateRow) => (
        <VStack gap={0} onClick={() => navigate(`/policy-v2/templates/${row.id}`)} style={{ cursor: 'pointer' }}>
          <HStack gap={0.5} vAlign="center">
            <ProductIcon name="template" size="sm" color="secondary" />
            <Text weight="medium">{row.name as string}</Text>
          </HStack>
          {row.description ? (
            <Text type="supporting" color="secondary">{row.description as string}</Text>
          ) : null}
        </VStack>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      width: pixel(160),
      renderCell: (row: V2TemplateRow) => (
        <HStack onClick={() => navigate(`/policy-v2/templates/${row.id}`)} style={{ cursor: 'pointer' }}>
          <Token
            label={(row.source as string) === 'illumio_suggested' ? 'Illumio Suggested' : 'User Created'}
            color={(row.source as string) === 'illumio_suggested' ? 'orange' : 'blue'}
            size="sm"
            icon={<ProductIcon name={(row.source as string) === 'illumio_suggested' ? 'template' : 'policy'} color="inherit" />}
          />
        </HStack>
      ),
    },
    {
      key: 'rule_count',
      header: 'Rules',
      width: pixel(80),
      renderCell: (row: V2TemplateRow) => (
        <HStack gap={0.5} vAlign="center" onClick={() => navigate(`/policy-v2/templates/${row.id}`)} style={{ cursor: 'pointer' }}>
          <ProductIcon name="rules" size="sm" color="tertiary" />
          <Text>{String(row.rule_count ?? 0)}</Text>
        </HStack>
      ),
    },
    {
      key: 'linked_policy_count',
      header: 'Policies',
      width: pixel(80),
      renderCell: (row: V2TemplateRow) => (
        <HStack gap={0.5} vAlign="center" onClick={() => navigate(`/policy-v2/templates/${row.id}`)} style={{ cursor: 'pointer' }}>
          <ProductIcon name="policy" size="sm" color="tertiary" />
          <Text>{String(row.linked_policy_count ?? 0)}</Text>
        </HStack>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: pixel(60),
      renderCell: (row: V2TemplateRow) => (
        <MoreMenu
          size="sm"
          items={[
            { label: 'Edit', onClick: () => navigate(`/policy-v2/templates/${row.id}/edit`) },
            { type: 'divider' as const },
            {
              label: 'Delete',
              onClick: async () => {
                try {
                  setActionError(null);
                  await deleteV2Template(row.id as string);
                  refetchTemplates();
                } catch (e) {
                  setActionError(e instanceof Error ? e.message : 'Delete failed');
                }
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <VStack gap={3} padding={4}>
      <Breadcrumbs>
        <BreadcrumbItem isCurrent>Policies (v2)</BreadcrumbItem>
      </Breadcrumbs>

      <HStack hAlign="between" vAlign="center">
        <Heading level={1}>Policies (v2)</Heading>
        {activeTab === 'policies' ? (
          <Button
            label="Create Policy"
            variant="primary"
            icon={<ProductIcon name="add" color="inherit" />}
            onClick={() => navigate('/policy-v2/new')}
          />
        ) : (
          <Button
            label="Create Template"
            variant="primary"
            icon={<ProductIcon name="add" color="inherit" />}
            onClick={() => navigate('/policy-v2/templates/new')}
          />
        )}
      </HStack>

      <TabList value={activeTab} onChange={(v) => setActiveTab(v as 'policies' | 'templates')} hasDivider>
        <Tab value="policies" label="Policies" />
        <Tab value="templates" label="Templates" />
      </TabList>

      {actionError ? (
        <Banner
          status="error"
          title={actionError}
          isDismissable
          onDismiss={() => setActionError(null)}
        />
      ) : null}

      {activeTab === 'policies' ? (
        loading ? (
          <HStack hAlign="center" padding={8}>
            <Spinner label="Loading policies…" size="lg" />
          </HStack>
        ) : error ? (
          <Banner status="error" title={error} />
        ) : policies.length === 0 ? (
          <EmptyState
            title="No v2 policies found"
            description="Create your first scope-centric policy to get started."
            icon={<ProductIllustration kind="policies" />}
            headingLevel={3}
            actions={
              <Button
                label="Create Policy"
                variant="primary"
                icon={<ProductIcon name="add" color="inherit" />}
                onClick={() => navigate('/policy-v2/new')}
              />
            }
          />
        ) : (
          <Table
            data={policies}
            columns={columns}
            idKey="id"
            density="compact"
            hasHover
          />
        )
      ) : (
        templatesLoading ? (
          <HStack hAlign="center" padding={8}>
            <Spinner label="Loading templates…" size="lg" />
          </HStack>
        ) : templatesError ? (
          <Banner status="error" title={templatesError} />
        ) : templates.length === 0 ? (
          <EmptyState
            title="No templates found"
            description="Create a template to reuse rules across multiple guardrail policies."
            icon={<ProductIllustration kind="templates" />}
            headingLevel={3}
            actions={
              <Button
                label="Create Template"
                variant="primary"
                icon={<ProductIcon name="add" color="inherit" />}
                onClick={() => navigate('/policy-v2/templates/new')}
              />
            }
          />
        ) : (
          <Table
            data={templates}
            columns={templateColumns}
            idKey="id"
            density="compact"
            hasHover
          />
        )
      )}

    </VStack>
  );
}
