import { Token } from '@astryxdesign/core/Token';
import { HStack } from '@astryxdesign/core/HStack';
import type { PolicyLabel } from '../api/policies.js';

const colorMap: Record<string, 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'cyan' | 'gray'> = {
  app: 'blue',
  env: 'green',
  role: 'purple',
  loc: 'orange',
};

export function LabelTokens({ labels, size = 'sm' }: { labels: PolicyLabel[]; size?: 'sm' | 'md' | 'lg' }) {
  if (!labels || labels.length === 0) {
    return <Token label="All workloads" color="gray" size={size} />;
  }
  return (
    <HStack gap={0.5} wrap="wrap">
      {labels.map((l, i) => (
        <Token key={i} label={`${l.key}=${l.value}`} color={colorMap[l.key] || 'default'} size={size} />
      ))}
    </HStack>
  );
}
