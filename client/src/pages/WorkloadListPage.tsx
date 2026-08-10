import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { Heading } from '@astryxdesign/core/Heading';
import { Token } from '@astryxdesign/core/Token';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Button } from '@astryxdesign/core/Button';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell } from '@astryxdesign/core/Table';
import { Banner } from '@astryxdesign/core/Banner';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { fetchWorkloads, type Workload } from '../api/workloads.js';
import { LabelTokens } from '../components/LabelTokens.js';
import { WorkloadFilters, type WorkloadFilterValues } from '../features/workloads/WorkloadFilters.js';

const ENFORCEMENT_COLOR: Record<string, 'gray' | 'blue' | 'orange' | 'green'> = {
  idle: 'gray',
  visibility_only: 'blue',
  selective: 'orange',
  full: 'green',
};

const ENFORCEMENT_LABEL: Record<string, string> = {
  idle: 'Idle',
  visibility_only: 'Visibility Only',
  selective: 'Selective',
  full: 'Full',
};

export function WorkloadListPage() {
  const navigate = useNavigate();
  const [workloads, setWorkloads] = useState<Workload[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<WorkloadFilterValues>({
    search: '',
    type: 'all',
    managed: 'all',
    online: 'all',
    enforcement_mode: 'all',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWorkloads({
        search: filters.search || undefined,
        type: filters.type !== 'all' ? filters.type : undefined,
        managed: filters.managed !== 'all' ? filters.managed : undefined,
        online: filters.online !== 'all' ? filters.online : undefined,
        enforcement_mode: filters.enforcement_mode !== 'all' ? filters.enforcement_mode : undefined,
        page,
        limit: 50,
      });
      setWorkloads(res.data);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load workloads');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => { setPage(1); }, [filters]);

  const totalPages = Math.ceil(total / 50);

  return (
    <VStack gap={3} padding={4}>
      <HStack vAlign="center" gap={2}>
        <Heading level={1}>Workloads</Heading>
        {!loading && (
          <Token label={`${total} total`} color="default" size="sm" />
        )}
      </HStack>

      <WorkloadFilters values={filters} onChange={setFilters} />

      {error && <Banner status="error" title={error} />}

      {loading ? (
        <VStack gap={1}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} width="100%" height={48} />
          ))}
        </VStack>
      ) : workloads.length === 0 ? (
        <Banner status="info" title="No workloads match your filters." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Hostname</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Labels</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Enforcement</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workloads.map((w) => (
                <TableRow
                  key={w.id}
                  onClick={() => navigate(`/workloads/${w.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Text weight="medium">{w.name}</Text>
                  </TableCell>
                  <TableCell>
                    <Text type="supporting">{w.hostname}</Text>
                  </TableCell>
                  <TableCell>
                    <Token
                      label={w.type === 'k8s_pod' ? 'K8s Pod' : 'VM'}
                      color={w.type === 'k8s_pod' ? 'teal' : 'purple'}
                      size="sm"
                    />
                  </TableCell>
                  <TableCell>
                    <LabelTokens labels={w.labels} size="sm" />
                  </TableCell>
                  <TableCell>
                    <HStack gap={1} vAlign="center">
                      <StatusDot
                        variant={w.managed ? (w.online ? 'success' : 'error') : 'warning'}
                        label={w.managed ? (w.online ? 'Online' : 'Offline') : 'Unmanaged'}
                      />
                      <Text type="supporting">
                        {w.managed ? (w.online ? 'Online' : 'Offline') : 'Unmanaged'}
                      </Text>
                    </HStack>
                  </TableCell>
                  <TableCell>
                    <Token
                      label={ENFORCEMENT_LABEL[w.enforcement_mode] ?? w.enforcement_mode}
                      color={ENFORCEMENT_COLOR[w.enforcement_mode] ?? 'gray'}
                      size="sm"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <HStack hAlign="center" vAlign="center" gap={1}>
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
          )}
        </>
      )}
    </VStack>
  );
}
