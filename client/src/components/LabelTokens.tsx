import { Token } from '@astryxdesign/core/Token';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { HStack } from '@astryxdesign/core/HStack';
import type { PolicyLabel } from '../api/policies.js';

type TokenColor =
  | 'default'
  | 'blue'
  | 'green'
  | 'purple'
  | 'orange'
  | 'teal'
  | 'cyan'
  | 'gray'
  | 'red'
  | 'yellow'
  | 'pink';

const colorMap: Record<string, TokenColor> = {
  app: 'blue',
  env: 'green',
  role: 'purple',
  loc: 'orange',
  type: 'teal',
  dept: 'cyan',
  tier: 'gray',
  label_group: 'purple',
  aws_account: 'orange',
  azure_subscription: 'blue',
  aws_vpc: 'orange',
  azure_vnet: 'blue',
  k8s_cluster: 'teal',
  k8s_namespace: 'cyan',
};

const dimensionLabel: Record<string, string> = {
  app: 'Application',
  env: 'Environment',
  role: 'Role',
  loc: 'Location',
  type: 'Type',
  dept: 'Department',
  tier: 'Tier',
  label_group: 'Label Group',
  aws_account: 'AWS Account',
  azure_subscription: 'Azure Subscription',
  aws_vpc: 'AWS VPC',
  azure_vnet: 'Azure VNET',
  k8s_cluster: 'K8s Cluster',
  k8s_namespace: 'K8s Namespace',
};

function getColor(key: string): TokenColor {
  if (colorMap[key]) return colorMap[key];
  if (key.startsWith('k8s_label_')) return 'teal';
  return 'default';
}

function getLabel(key: string): string {
  if (dimensionLabel[key]) return dimensionLabel[key];
  if (key.startsWith('k8s_label_')) {
    const raw = key.replace('k8s_label_', '');
    return `K8s Label: ${raw}`;
  }
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function getDisplayKey(key: string): string {
  if (dimensionLabel[key]) return key;
  if (key.startsWith('k8s_label_')) return key.replace('k8s_label_', '');
  return key;
}

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
          content={`${getLabel(l.key)} — ${getDisplayKey(l.key)} = ${l.value}`}
        >
          <Token
            label={`${getDisplayKey(l.key)}=${l.value}`}
            color={getColor(l.key)}
            size={size}
          />
        </Tooltip>
      ))}
    </HStack>
  );
}
