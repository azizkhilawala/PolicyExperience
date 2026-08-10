import { Badge } from '@astryxdesign/core/Badge';
import { Tooltip } from '@astryxdesign/core/Tooltip';

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

const tooltipMap = {
  draft: 'Policy has not been provisioned yet — provision to enforce',
  provisioned: 'Policy is active and enforced on workloads',
  pending:
    'Policy has changes since last provision — workloads still enforce the previous version until reprovisioned',
} as const;

export function ProvisionBadge({ status }: { status: 'draft' | 'provisioned' | 'pending' }) {
  return (
    <Tooltip content={tooltipMap[status]}>
      <Badge variant={variantMap[status]} label={labelMap[status]} />
    </Tooltip>
  );
}
