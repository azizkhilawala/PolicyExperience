import { useCallback } from 'react';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { Heading } from '@astryxdesign/core/Heading';
import { Token } from '@astryxdesign/core/Token';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Banner } from '@astryxdesign/core/Banner';

import { useApi } from '../../hooks/useApi.js';
import { fetchCoverage, type CoverageStats, DIMENSION_LABELS } from '../../api/label-mapping.js';

function CoverageCard({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: 'green' | 'orange' | 'red' | 'blue' | 'gray';
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <Card padding={3}>
      <VStack gap={1}>
        <Text type="supporting">{label}</Text>
        <Heading level={3}>{value}</Heading>
        <HStack gap={1} vAlign="center">
          <Token label={`${pct}%`} color={color} size="sm" />
          <Text type="supporting">of {total}</Text>
        </HStack>
      </VStack>
    </Card>
  );
}

export function CoverageDashboard() {
  const fetcher = useCallback(() => fetchCoverage(), []);
  const { data, loading, error } = useApi<CoverageStats>(fetcher);

  if (loading) {
    return (
      <HStack hAlign="center" padding={4}>
        <Spinner label="Loading coverage…" />
      </HStack>
    );
  }
  if (error) return <Banner status="error" title={error} />;
  if (!data) return null;

  const total = data.total_k8s_workloads;

  return (
    <VStack gap={3}>
      <HStack gap={1} vAlign="center">
        <Text weight="medium">Coverage Overview</Text>
        <Token label={`${data.enabled_rules} / ${data.total_rules} rules enabled`} color="blue" size="sm" />
      </HStack>
      <HStack gap={3} wrap="wrap">
        <CoverageCard label="Fully Mapped" value={data.fully_mapped} total={total} color="green" />
        <CoverageCard label="Partially Mapped" value={data.partially_mapped} total={total} color="orange" />
        <CoverageCard label="Unmapped" value={data.unmapped} total={total} color="red" />
        <CoverageCard label="Conflicts" value={data.conflicts} total={total} color="red" />
      </HStack>
      <HStack gap={2} wrap="wrap">
        {Object.entries(data.dimension_coverage).map(([dim, count]) => (
          <Token
            key={dim}
            label={`${DIMENSION_LABELS[dim] ?? dim}: ${count}/${total}`}
            color={count === total ? 'green' : count > 0 ? 'orange' : 'gray'}
            size="sm"
          />
        ))}
      </HStack>
    </VStack>
  );
}
