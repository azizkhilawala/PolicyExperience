import { useState, useCallback } from 'react';
import { Heading } from '@astryxdesign/core/Heading';
import { Table, proportional, pixel } from '@astryxdesign/core/Table';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Text } from '@astryxdesign/core/Text';
import { Token } from '@astryxdesign/core/Token';
import { Spinner } from '@astryxdesign/core/Spinner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';

import { useApi } from '../hooks/useApi.js';
import { fetchAuditLog, type AuditEntry, type PaginatedResponse } from '../api/audit.js';

type AuditRow = AuditEntry & Record<string, unknown>;

const ACTION_COLORS: Record<string, 'green' | 'red' | 'blue' | 'orange'> = {
  created: 'green',
  deleted: 'red',
  updated: 'blue',
  provisioned: 'orange',
};

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState('');

  const buildFetcher = useCallback(
    () =>
      fetchAuditLog({
        page,
        limit: 25,
        ...(entityFilter ? { entity_type: entityFilter } : {}),
      }),
    [page, entityFilter],
  );

  const { data, loading, error } = useApi<PaginatedResponse<AuditEntry>>(buildFetcher, [
    page,
    entityFilter,
  ]);

  const entries = (data?.data ?? []) as AuditRow[];
  const totalPages = data?.totalPages ?? 1;

  const columns = [
    {
      key: 'performed_at',
      header: 'When',
      width: pixel(180),
      renderCell: (row: AuditRow) => (
        <Text type="supporting">{new Date(row.performed_at).toLocaleString()}</Text>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      width: pixel(120),
      renderCell: (row: AuditRow) => (
        <Token label={row.action} color={ACTION_COLORS[row.action] ?? 'blue'} size="sm" />
      ),
    },
    {
      key: 'entity_type',
      header: 'Type',
      width: pixel(120),
      renderCell: (row: AuditRow) => <Text>{(row.entity_type as string).replace(/_/g, ' ')}</Text>,
    },
    {
      key: 'entity_name',
      header: 'Name',
      width: proportional(2),
      renderCell: (row: AuditRow) => <Text weight="medium">{row.entity_name as string}</Text>,
    },
    {
      key: 'performed_by_name',
      header: 'By',
      width: pixel(150),
      renderCell: (row: AuditRow) => <Text>{(row.performed_by_name as string) ?? 'Unknown'}</Text>,
    },
  ];

  return (
    <VStack gap={3} padding={4}>
      <Heading level={1}>Audit Log</Heading>

      <HStack gap={2} vAlign="center">
        <TextInput
          label="Filter by type"
          isLabelHidden
          placeholder="Filter by entity type (e.g. policy, service)…"
          value={entityFilter}
          onChange={(v) => {
            setEntityFilter(v);
            setPage(1);
          }}
          hasClear
          size="sm"
          width="100%"
        />
      </HStack>

      {loading ? (
        <HStack hAlign="center" padding={8}>
          <Spinner label="Loading audit log…" size="lg" />
        </HStack>
      ) : error ? (
        <Banner status="error" title={error} />
      ) : entries.length === 0 ? (
        <EmptyState
          title="No audit entries"
          description="Actions like creating, updating, and deleting resources will appear here."
          headingLevel={3}
        />
      ) : (
        <>
          <Table<AuditRow> columns={columns} data={entries} idKey="id" density="compact" />
          <HStack hAlign="center" gap={2} vAlign="center">
            <Button
              label="Previous"
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              isDisabled={page <= 1}
            />
            <Text type="supporting">
              Page {page} of {totalPages}
            </Text>
            <Button
              label="Next"
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              isDisabled={page >= totalPages}
            />
          </HStack>
        </>
      )}
    </VStack>
  );
}
