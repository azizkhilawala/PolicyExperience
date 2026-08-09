import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { Table, proportional, pixel } from '@astryxdesign/core/Table';
import { TabList, Tab } from '@astryxdesign/core/TabList';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Text } from '@astryxdesign/core/Text';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Spinner } from '@astryxdesign/core/Spinner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Breadcrumbs, BreadcrumbItem } from '@astryxdesign/core/Breadcrumbs';
import { Banner } from '@astryxdesign/core/Banner';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { TextInput } from '@astryxdesign/core/TextInput';

import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../hooks/useAuth.js';
import {
  fetchPolicies,
  deletePolicy,
  lockPolicy,
  unlockPolicy,
  type Policy,
} from '../api/policies.js';
import { LabelTokens } from '../components/LabelTokens.js';
import { ProvisionBadge } from '../components/ProvisionBadge.js';
import { StatusIndicator } from '../components/StatusIndicator.js';
import { ProductIcon, ProductIllustration } from '../components/ProductVisuals.js';
import { CreatePolicyDialog } from '../features/policies/CreatePolicyDialog.js';

// Policy already extends Record via intersection for Table's generic constraint
type PolicyTableRow = Policy & Record<string, unknown>;

export default function PolicyListPage() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApi(() => fetchPolicies());
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    name: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const allPolicies = data?.data ?? [];
  const query = searchQuery.toLowerCase();

  const filteredPolicies: PolicyTableRow[] = useMemo(
    () =>
      allPolicies
        .filter((p) => {
          if (activeTab !== 'all' && p.type !== activeTab) return false;
          if (query) {
            return (
              p.name.toLowerCase().includes(query) ||
              p.description?.toLowerCase().includes(query) ||
              p.scope?.some(
                (s) => s.key.toLowerCase().includes(query) || s.value.toLowerCase().includes(query),
              )
            );
          }
          return true;
        })
        .map((p) => p as PolicyTableRow),
    [allPolicies, activeTab, query],
  );

  const columns = [
    {
      key: 'name',
      header: 'Name',
      width: proportional(2),
      renderCell: (row: PolicyTableRow) => (
        <VStack gap={0} onClick={() => navigate(`/policies/${row.id}`)}>
          <HStack gap={0.5} vAlign="center">
            <ProductIcon
              name={row.type === 'organizational' ? 'policy' : 'app'}
              size="sm"
              color="secondary"
            />
            {row.is_locked ? (
              <ProductIcon name="lock" size="sm" color="warning" label="Locked policy" />
            ) : null}
            <Text weight="medium">{row.name}</Text>
          </HStack>
          <Text type="supporting" color="secondary">
            {row.type === 'organizational' ? 'Organizational' : 'Application'}
          </Text>
        </VStack>
      ),
    },
    {
      key: 'scope',
      header: 'Scope',
      width: proportional(2),
      renderCell: (row: PolicyTableRow) => <LabelTokens labels={row.scope} />,
    },
    {
      key: 'enabled',
      header: 'Status',
      width: pixel(140),
      renderCell: (row: PolicyTableRow) => <StatusIndicator enabled={!!row.enabled} />,
    },
    {
      key: 'provision_status',
      header: 'Provision Status',
      width: pixel(130),
      renderCell: (row: PolicyTableRow) => <ProvisionBadge status={row.provision_status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      width: pixel(60),
      renderCell: (row: PolicyTableRow) => (
        <MoreMenu
          size="sm"
          items={[
            { label: 'Edit', onClick: () => navigate(`/policies/${row.id}`) },
            {
              label: row.is_locked ? 'Unlock' : 'Lock',
              onClick: async () => {
                try {
                  setActionError(null);
                  if (row.is_locked) {
                    await unlockPolicy(row.id);
                  } else {
                    await lockPolicy(row.id);
                  }
                  refetch();
                } catch (e) {
                  setActionError(e instanceof Error ? e.message : 'Action failed');
                }
              },
              isDisabled: !!row.is_locked && user?.role !== 'global_admin',
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
                      await deletePolicy(row.id);
                      refetch();
                    } catch (e) {
                      setActionError(e instanceof Error ? e.message : 'Action failed');
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
      <Breadcrumbs>
        <BreadcrumbItem isCurrent>Policies</BreadcrumbItem>
      </Breadcrumbs>

      <HStack hAlign="between" vAlign="center">
        <Heading level={1}>Policies</Heading>
        <Button
          label="Create Policy"
          variant="primary"
          icon={<ProductIcon name="add" color="inherit" />}
          onClick={() => setDialogOpen(true)}
        />
      </HStack>

      <TabList value={activeTab} onChange={setActiveTab} hasDivider>
        <Tab value="all" label="All Policies" />
        <Tab value="organizational" label="Organizational" />
        <Tab value="application" label="Application" />
      </TabList>

      <TextInput
        label="Search policies"
        isLabelHidden
        placeholder="Search by name, description, or scope…"
        value={searchQuery}
        onChange={setSearchQuery}
        hasClear
        size="sm"
        width="100%"
      />

      {actionError ? (
        <Banner status="error" title={actionError} onDismiss={() => setActionError(null)} />
      ) : null}

      {loading ? (
        <HStack hAlign="center" padding={8}>
          <Spinner label="Loading policies…" size="lg" />
        </HStack>
      ) : error ? (
        <Banner status="error" title={error} />
      ) : filteredPolicies.length === 0 ? (
        <EmptyState
          title="No policies found"
          description={
            activeTab === 'all'
              ? 'No policies have been created yet.'
              : `No ${activeTab} policies match this filter.`
          }
          icon={<ProductIllustration kind="policies" />}
          headingLevel={3}
          actions={
            <Button
              label="Create Policy"
              variant="primary"
              icon={<ProductIcon name="add" color="inherit" />}
              onClick={() => setDialogOpen(true)}
            />
          }
        />
      ) : (
        <Table data={filteredPolicies} columns={columns} idKey="id" density="compact" hasHover />
      )}
      <CreatePolicyDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={(policy) => {
          setDialogOpen(false);
          navigate(`/policies/${policy.id}`);
        }}
      />

      <AlertDialog
        isOpen={!!deleteConfirm}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
        title={`Delete "${deleteConfirm?.name ?? ''}"?`}
        description="This policy and all its rules will be permanently deleted. This action cannot be undone."
        actionLabel="Delete policy"
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
