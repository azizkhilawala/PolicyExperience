import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Table, proportional, pixel } from '@astryxdesign/core/Table';
import { TabList, Tab } from '@astryxdesign/core/TabList';
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
import { Banner } from '@astryxdesign/core/Banner';

import { useApi } from '../hooks/useApi.js';
import { fetchPolicies, type Policy } from '../api/policies.js';
import { LabelTokens } from '../components/LabelTokens.js';
import { ProvisionBadge } from '../components/ProvisionBadge.js';
import { StatusIndicator } from '../components/StatusIndicator.js';

// SVG lock icon — "lock" is not in Astryx's semantic icon list
function LockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

// Policy already extends Record via intersection for Table's generic constraint
type PolicyTableRow = Policy & Record<string, unknown>;

export default function PolicyListPage() {
  const navigate = useNavigate();
  const { data, loading, error } = useApi(() => fetchPolicies());
  const [activeTab, setActiveTab] = useState<string>('all');

  const allPolicies = data ?? [];

  const filteredPolicies: PolicyTableRow[] = allPolicies
    .filter((p) => {
      if (activeTab === 'all') return true;
      return p.type === activeTab;
    })
    .map((p) => p as PolicyTableRow);

  const columns = [
    {
      key: 'name',
      header: 'Name',
      width: proportional(2),
      renderCell: (row: PolicyTableRow) => (
        <VStack gap={0} onClick={() => navigate(`/policies/${row.id}`)}>
          <HStack gap={0.5} vAlign="center">
            {row.is_locked ? (
              <Icon icon={LockIcon} size="sm" color="warning" label="Locked" />
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
      renderCell: (row: PolicyTableRow) => (
        <LabelTokens labels={row.scope} />
      ),
    },
    {
      key: 'enabled',
      header: 'Status',
      width: pixel(140),
      renderCell: (row: PolicyTableRow) => (
        <HStack style={!row.enabled ? { opacity: 0.5 } : undefined}>
          <StatusIndicator enabled={!!row.enabled} />
        </HStack>
      ),
    },
    {
      key: 'provision_status',
      header: 'Provision Status',
      width: pixel(130),
      renderCell: (row: PolicyTableRow) => (
        <ProvisionBadge status={row.provision_status} />
      ),
    },
    {
      key: 'actions',
      header: '',
      width: pixel(60),
      renderCell: (row: PolicyTableRow) => (
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
