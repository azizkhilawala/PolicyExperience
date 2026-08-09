import { Token } from '@astryxdesign/core/Token';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { HStack } from '@astryxdesign/core/HStack';
import type { PolicyLabel } from '../api/policies.js';

const colorMap: Record<string, 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'cyan' | 'gray'> =
  {
    app: 'blue',
    env: 'green',
    role: 'purple',
    loc: 'orange',
    type: 'teal',
    dept: 'cyan',
    tier: 'gray',
  };

const dimensionLabel: Record<string, string> = {
  app: 'Application label',
  env: 'Environment label',
  role: 'Role label',
  loc: 'Location label',
  type: 'Type label',
  dept: 'Department label',
  tier: 'Tier label',
};

export function LabelTokens({
  labels,
  size = 'sm',
}: {
  labels: PolicyLabel[];
  size?: 'sm' | 'md' | 'lg';
}) {
  if (!labels || labels.length === 0) {
    return (
      <Tooltip content="Matches every workload in this policy scope">
        <Token label="All workloads" color="gray" size={size} />
      </Tooltip>
    );
  }
  return (
    <HStack gap={0.5} wrap="wrap">
      {labels.map((l, i) => (
        <Tooltip
          key={i}
          content={`${dimensionLabel[l.key] ?? 'Label'}\n${l.key} = ${l.value}\nPolicy scope`}
        >
          <Token
            label={`${l.key}=${l.value}`}
            color={colorMap[l.key] || 'default'}
            size={size}
          />
        </Tooltip>
      ))}
    </HStack>
  );
}
