import { Badge } from '@astryxdesign/core/Badge';

const variantMap = {
  draft: 'neutral',
  provisioned: 'success',
  pending: 'warning',
} as const;

const labelMap = {
  draft: 'Draft',
  provisioned: 'Provisioned',
  pending: 'Pending',
} as const;

export function ProvisionBadge({ status }: { status: 'draft' | 'provisioned' | 'pending' }) {
  return <Badge variant={variantMap[status]} label={labelMap[status]} />;
}
