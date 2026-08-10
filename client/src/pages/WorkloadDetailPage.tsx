import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { Token } from '@astryxdesign/core/Token';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Button } from '@astryxdesign/core/Button';
import { Section } from '@astryxdesign/core/Section';
import { Banner } from '@astryxdesign/core/Banner';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell } from '@astryxdesign/core/Table';
import { Breadcrumbs, BreadcrumbItem } from '@astryxdesign/core/Breadcrumbs';
import { fetchWorkload, updateWorkloadLabels, type Workload } from '../api/workloads.js';
import { LabelTokens } from '../components/LabelTokens.js';
import { WorkloadLabelEditor } from '../features/workloads/WorkloadLabelEditor.js';

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

export function WorkloadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workload, setWorkload] = useState<Workload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWorkload(id);
      setWorkload(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load workload');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleSaveLabels = useCallback(
    async (labels: Array<{ key: string; value: string }>) => {
      if (!id) return;
      setSaving(true);
      try {
        const updated = await updateWorkloadLabels(id, labels);
        setWorkload(updated);
        setEditing(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update labels');
      } finally {
        setSaving(false);
      }
    },
    [id],
  );

  if (loading) {
    return (
      <VStack gap={3} padding={4}>
        <Skeleton width={200} height={24} />
        <Skeleton width="100%" height={200} />
      </VStack>
    );
  }

  if (error || !workload) {
    return (
      <VStack gap={3} padding={4}>
        <Banner
          status="error"
          title={error ?? 'Workload not found'}
        />
        <Button label="Back to Workloads" variant="secondary" onClick={() => navigate('/workloads')} />
      </VStack>
    );
  }

  return (
    <VStack gap={3} padding={4}>
      <Breadcrumbs>
        <BreadcrumbItem href="/workloads">Workloads</BreadcrumbItem>
        <BreadcrumbItem isCurrent>{workload.name}</BreadcrumbItem>
      </Breadcrumbs>

      <HStack vAlign="center" gap={2}>
        <Text type="title3" weight="bold">{workload.name}</Text>
        <StatusDot
          variant={workload.managed ? (workload.online ? 'success' : 'error') : 'warning'}
          label={workload.managed ? (workload.online ? 'Online' : 'Offline') : 'Unmanaged'}
        />
        <Text type="supporting">
          {workload.managed ? (workload.online ? 'Online' : 'Offline') : 'Unmanaged'}
        </Text>
        <Token
          label={ENFORCEMENT_LABEL[workload.enforcement_mode] ?? workload.enforcement_mode}
          color={ENFORCEMENT_COLOR[workload.enforcement_mode] ?? 'gray'}
          size="sm"
        />
      </HStack>

      {workload.description && (
        <Text type="supporting">{workload.description}</Text>
      )}

      <HStack gap={3} wrap="wrap" style={{ alignItems: 'flex-start' }}>
        <VStack gap={2} style={{ flex: '1 1 400px' }}>
          <Section title="Properties">
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell><Text weight="medium">Hostname</Text></TableCell>
                  <TableCell>{workload.hostname}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><Text weight="medium">IP Address</Text></TableCell>
                  <TableCell>{workload.ip}</TableCell>
                </TableRow>
                {workload.public_ip && (
                  <TableRow>
                    <TableCell><Text weight="medium">Public IP</Text></TableCell>
                    <TableCell>{workload.public_ip}</TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell><Text weight="medium">Type</Text></TableCell>
                  <TableCell>
                    <Token
                      label={workload.type === 'k8s_pod' ? 'K8s Pod' : 'VM'}
                      color={workload.type === 'k8s_pod' ? 'teal' : 'purple'}
                      size="sm"
                    />
                  </TableCell>
                </TableRow>
                {workload.os_type && (
                  <TableRow>
                    <TableCell><Text weight="medium">OS</Text></TableCell>
                    <TableCell>{workload.os_detail || workload.os_type}</TableCell>
                  </TableRow>
                )}
                {workload.ven_version && (
                  <TableRow>
                    <TableCell><Text weight="medium">VEN Version</Text></TableCell>
                    <TableCell>{workload.ven_version}</TableCell>
                  </TableRow>
                )}
                {workload.ven_status && workload.managed ? (
                  <TableRow>
                    <TableCell><Text weight="medium">VEN Status</Text></TableCell>
                    <TableCell>{workload.ven_status}</TableCell>
                  </TableRow>
                ) : null}
                {workload.data_center && (
                  <TableRow>
                    <TableCell><Text weight="medium">Data Center</Text></TableCell>
                    <TableCell>{workload.data_center}</TableCell>
                  </TableRow>
                )}
                {workload.service_provider && (
                  <TableRow>
                    <TableCell><Text weight="medium">Provider</Text></TableCell>
                    <TableCell>{workload.service_provider.toUpperCase()}</TableCell>
                  </TableRow>
                )}
                {workload.last_heartbeat_at && (
                  <TableRow>
                    <TableCell><Text weight="medium">Last Heartbeat</Text></TableCell>
                    <TableCell>{new Date(workload.last_heartbeat_at).toLocaleString()}</TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell><Text weight="medium">Created</Text></TableCell>
                  <TableCell>{new Date(workload.created_at).toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Section>
        </VStack>

        <VStack gap={2} style={{ flex: '1 1 400px' }}>
          <Section title="Labels">
            {editing ? (
              <WorkloadLabelEditor
                labels={workload.labels}
                onSave={handleSaveLabels}
                onCancel={() => setEditing(false)}
                isSaving={saving}
              />
            ) : (
              <VStack gap={2}>
                <LabelTokens labels={workload.labels} size="md" />
                <Button
                  label="Edit Labels"
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditing(true)}
                />
              </VStack>
            )}
          </Section>
        </VStack>
      </HStack>
    </VStack>
  );
}
