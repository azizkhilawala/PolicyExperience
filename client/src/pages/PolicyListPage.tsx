import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Table, proportional, pixel } from '@astryxdesign/core/Table';
import { TabList } from '@astryxdesign/core/TabList';
import { Tab } from '@astryxdesign/core/TabList';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Icon } from '@astryxdesign/core/Icon';
import { Text } from '@astryxdesign/core/Text';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Spinner } from '@astryxdesign/core/Spinner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Breadcrumbs, BreadcrumbItem } from '@astryxdesign/core/Breadcrumbs';

import { useApi } from '../hooks/useApi.js';
import { fetchPolicies, type Policy } from '../api/policies.js';
import { LabelTokens } from '../components/LabelTokens.js';
import { ProvisionBadge } from '../components/ProvisionBadge.js';
import { StatusIndicator } from '../components/StatusIndicator.js';

interface PolicyRow extends Record<string, unknown> {
  id: string;
  name: string;
  description: string;
  type: 'organizational' | 'application';
  scope: Policy['scope'];
  enabled: number;
  provision_status: 'draft' | 'provisioned' | 'pending';
  is_locked: number;
  locked_by: string | null;
  locked_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

function toPolicyRow(p: Policy): PolicyRow {
  return p as unknown as PolicyRow;
}

export default function PolicyListPage() {
  const navigate = useNavigate();
  const { data, loading } = useApi(() => fetchPolicies());
  const [activeTab, setActiveTab] = useState<string>('all');

  const allPolicies = data ?? [];

  const filteredPolicies: PolicyRow[] = allPolicies
    .filter((p) => {
      if (activeTab === 'all') return true;
      return p.type === activeTab;
    })
    .map(toPolicyRow);

  const columns = [
    {
      key: 'name',
      header: 'Name',
      width: proportional(2),
      renderCell: (row: PolicyRow) => (
        <VStack gap={0} onClick={() => navigate(`/policies/${row.id}`)} style={{ cursor: 'pointer' }}>
          <HStack gap={0.5} vAlign="center">
            {row.is_locked ? <Icon icon="stop" size="sm" color="warning" /> : null}
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
      renderCell: (row: PolicyRow) => (
        <LabelTokens labels={row.scope as Policy['scope']} />
      ),
    },
    {
      key: 'enabled',
      header: 'Status',
      width: pixel(140),
      renderCell: (row: PolicyRow) => (
        <HStack style={!row.enabled ? { opacity: 0.5 } : undefined}>
          <StatusIndicator enabled={!!row.enabled} />
        </HStack>
      ),
    },
    {
      key: 'provision_status',
      header: 'Provision Status',
      width: pixel(130),
      renderCell: (row: PolicyRow) => (
        <ProvisionBadge status={row.provision_status as 'draft' | 'provisioned' | 'pending'} />
      ),
    },
    {
      key: 'actions',
      header: '',
      width: pixel(60),
      renderCell: (row: PolicyRow) => (
        <MoreMenu
          size="sm"
          items={[
            { label: 'Edit', onClick: () => navigate(`/policies/${row.id}`) },
            {
              label: row.is_locked ? 'Unlock' : 'Lock',
              onClick: () => {
                // stub for Phase 2
              },
            },
            { type: 'divider' as const },
            {
              label: 'Delete',
              onClick: () => {
                // stub for Phase 2
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
        <Button label="Create Policy" variant="primary" isDisabled />
      </HStack>

      <TabList value={activeTab} onChange={setActiveTab} hasDivider>
        <Tab value="all" label="All Policies" />
        <Tab value="organizational" label="Organizational" />
        <Tab value="application" label="Application" />
      </TabList>

      {loading ? (
        <HStack hAlign="center" padding={8}>
          <Spinner label="Loading policies…" size="lg" />
        </HStack>
      ) : filteredPolicies.length === 0 ? (
        <EmptyState
          title="No policies found"
          description={
            activeTab === 'all'
              ? 'No policies have been created yet.'
              : `No ${activeTab} policies match this filter.`
          }
          headingLevel={3}
        />
      ) : (
        <Table
          data={filteredPolicies}
          columns={columns}
          idKey="id"
          density="compact"
          hasHover
        />
      )}
    </VStack>
  );
}
