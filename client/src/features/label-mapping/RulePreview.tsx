import { useState, useCallback } from 'react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { Heading } from '@astryxdesign/core/Heading';
import { Token } from '@astryxdesign/core/Token';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Table, proportional, pixel } from '@astryxdesign/core/Table';
import { Icon } from '@astryxdesign/core/Icon';
import { Play } from 'lucide-react';

import { previewRule, type PreviewResult, type PreviewWorkload, DIMENSION_LABELS } from '../../api/label-mapping.js';

type PreviewRow = PreviewWorkload & Record<string, unknown>;

interface RulePreviewProps {
  ruleId: string;
}

export function RulePreview({ ruleId }: RulePreviewProps) {
  const [data, setData] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await previewRule(ruleId);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Preview failed');
    }
    setLoading(false);
  }, [ruleId]);

  const columns = [
    {
      key: 'workload_name',
      header: 'Workload',
      width: proportional(2),
      renderCell: (row: PreviewRow) => <Text weight="medium">{row.workload_name}</Text>,
    },
    {
      key: 'namespace',
      header: 'Namespace',
      width: pixel(140),
      renderCell: (row: PreviewRow) => <Text type="supporting">{row.namespace}</Text>,
    },
    {
      key: 'cluster',
      header: 'Cluster',
      width: pixel(140),
      renderCell: (row: PreviewRow) => <Text type="supporting">{row.cluster}</Text>,
    },
    {
      key: 'proposed',
      header: 'Proposed Label',
      width: proportional(1),
      renderCell: (row: PreviewRow) => (
        row.proposed_value ? (
          <Token
            label={`${DIMENSION_LABELS[row.proposed_dimension] ?? row.proposed_dimension}: ${row.proposed_value}`}
            color="green"
            size="sm"
          />
        ) : (
          <Text type="supporting">—</Text>
        )
      ),
    },
  ];

  return (
    <VStack gap={3}>
      <HStack gap={2} vAlign="center">
        <Heading level={3}>Preview</Heading>
        <Button
          label={loading ? 'Running…' : 'Run Preview'}
          variant="secondary"
          size="sm"
          icon={<Icon icon={Play} />}
          onClick={runPreview}
          isDisabled={loading}
        />
      </HStack>

      {error && <Banner status="error" title={error} />}

      {loading && (
        <HStack hAlign="center" padding={4}>
          <Spinner label="Evaluating workloads…" />
        </HStack>
      )}

      {data && !loading && (
        <VStack gap={2}>
          <HStack gap={2}>
            <Token label={`${data.matched_count} matched`} color="green" size="sm" />
            <Token label={`${data.unmatched_count} unmatched`} color="gray" size="sm" />
          </HStack>

          {data.matched.length > 0 ? (
            <Table<PreviewRow>
              columns={columns}
              data={data.matched as PreviewRow[]}
              idKey="workload_id"
              density="compact"
            />
          ) : (
            <Banner status="info" title="No workloads matched this rule." />
          )}
        </VStack>
      )}
    </VStack>
  );
}
