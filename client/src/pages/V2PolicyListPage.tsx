import { useState } from 'react';
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

import { useApi } from '../hooks/useApi.js';
import { fetchV2Policies, deleteV2Policy, type V2Policy } from '../api/v2-policies.js';
import { StatusIndicator } from '../components/StatusIndicator.js';
import { ProvisionBadge } from '../components/ProvisionBadge.js';
import { V2CreatePolicyDialog } from '../features/v2-rules/V2CreatePolicyDialog.js';

// V2Policy must satisfy Table's Record<string, unknown> generic constraint
type V2PolicyRow = V2Policy & Record<string, unknown>;

// Render scope tokens based on scope_type and available scope fields
function ScopeTokens({ policy }: { policy: V2Policy }) {
  if (policy.scope_type === 'all_workloads') {
    return <Token label="All Workloads" color="blue" size="sm" />;
  }

  if (policy.scope_type === 'labels') {
    const labelTokens = policy.scope_labels.map((l) => (
      <Token key={`${l.key}=${l.value}`} label={`${l.key}=${l.value}`} color="purple" size="sm" />
    ));
    return (
      <HStack gap={1} vAlign="center" wrap="wrap">
        {labelTokens.length > 0 ? labelTokens : <Token label="Labels" color="purple" size="sm" />}
      </HStack>
    );
  }

  // k8s scope
  const tokens: React.ReactNode[] = [];
  if (policy.scope_cluster_id) {
    tokens.push(
      <Token key="cluster" label={`Cluster: ${policy.scope_cluster_id}`} color="teal" size="sm" />
    );
  }
  if (policy.scope_namespace_id) {
    tokens.push(
      <Token key="ns" label={`NS: ${policy.scope_namespace_id}`} color="cyan" size="sm" />
    );
  }
  for (const l of policy.scope_labels) {
    tokens.push(
      <Token key={`${l.key}=${l.value}`} label={`${l.key}=${l.value}`} color="purple" size="sm" />
    );
  }
  if (tokens.length === 0) {
    return <Token label="Kubernetes" color="teal" size="sm" />;
  }
  return (
    <HStack gap={1} vAlign="center" wrap="wrap">
      {tokens}
    </HStack>
  );
}

export default function V2PolicyListPage() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApi(() => fetchV2Policies());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const policies: V2PolicyRow[] = (data ?? []).map((p) => p as V2PolicyRow);

  const columns = [
    {
      key: 'name',
      header: 'Name',
      width: proportional(2),
      renderCell: (row: V2PolicyRow) => (
        <VStack gap={0} onClick={() => navigate(`/policy-v2/${row.id}`)}>
          <Text weight="medium">{row.name as string}</Text>
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
      renderCell: (row: V2PolicyRow) => <ScopeTokens policy={row as V2Policy} />,
    },
    {
      key: 'enabled',
      header: 'Status',
      width: pixel(140),
      renderCell: (row: V2PolicyRow) => (
        <StatusIndicator enabled={!!row.enabled} />
      ),
    },
    {
      key: 'provision_status',
      header: 'Provision Status',
      width: pixel(130),
      renderCell: (row: V2PolicyRow) => (
        <ProvisionBadge status={row.provision_status as 'draft' | 'provisioned'} />
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

  return (
    <VStack gap={3} padding={4}>
      <Breadcrumbs>
        <BreadcrumbItem isCurrent>Policies (v2)</BreadcrumbItem>
      </Breadcrumbs>

      <HStack hAlign="between" vAlign="center">
        <Heading level={1}>Policies (v2)</Heading>
        <Button label="Create Policy" variant="primary" onClick={() => setDialogOpen(true)} />
      </HStack>

      {actionError ? (
        <Banner
          status="error"
          title={actionError}
          onDismiss={() => setActionError(null)}
        />
      ) : null}

      {loading ? (
        <HStack hAlign="center" padding={8}>
          <Spinner label="Loading policies…" size="lg" />
        </HStack>
      ) : error ? (
        <Banner status="error" title={error} />
      ) : policies.length === 0 ? (
        <EmptyState
          title="No v2 policies found"
          description="Create your first scope-centric policy to get started."
          headingLevel={3}
          actions={
            <Button label="Create Policy" variant="primary" onClick={() => setDialogOpen(true)} />
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
      )}

      <V2CreatePolicyDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={(policy) => {
          setDialogOpen(false);
          navigate(`/policy-v2/${policy.id}`);
        }}
      />
    </VStack>
  );
}
