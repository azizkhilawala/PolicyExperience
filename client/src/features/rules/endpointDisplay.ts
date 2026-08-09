import type { EndpointFilter } from '../../api/policies.js';

export type TokenColor =
  | 'default'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'cyan'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'gray';

export const FIELD_COLOR_MAP: Array<[string, TokenColor]> = [
  ['label_group', 'purple'],
  ['label_', 'default'],
  ['ip_list', 'orange'],
  ['workload', 'teal'],
  ['user_group', 'blue'],
  ['virtual_service', 'green'],
  ['k8s_cluster', 'gray'],
  ['k8s_namespace', 'teal'],
  ['k8s_pod_', 'blue'],
  ['k8s_service_account', 'blue'],
  ['k8s_service', 'green'],
  ['k8s_ingress', 'green'],
  ['k8s_gateway', 'green'],
  ['cloud_aws', 'orange'],
  ['cloud_azure', 'blue'],
  ['fqdn', 'gray'],
];

export function getFilterColor(field: string): TokenColor {
  for (const [prefix, color] of FIELD_COLOR_MAP) {
    if (field.startsWith(prefix)) return color;
  }
  return 'default';
}

export function fieldLabel(field: string): string {
  const labelMap: Record<string, string> = {
    label_role: 'Role',
    label_app: 'App',
    label_env: 'Env',
    label_loc: 'Loc',
    label_type: 'Type',
    ip_list: 'IP List',
    workload: 'Workload',
    user_group: 'User Group',
    virtual_service: 'Virtual Service',
    label_group: 'Label Group',
    k8s_cluster: 'Cluster',
    k8s_namespace: 'Namespace',
    k8s_pod_app: 'Pod App',
    k8s_pod_tier: 'Pod Tier',
    k8s_service: 'K8s Service',
    k8s_ingress: 'Ingress',
    k8s_gateway: 'Gateway',
    k8s_service_account: 'Service Account',
    cloud_aws_account: 'AWS Account',
    cloud_azure_subscription: 'Azure Subscription',
    fqdn: 'FQDN',
  };
  if (labelMap[field]) return labelMap[field];
  // Fallback: convert snake_case to Title Case
  return field
    .replace(/^(label_|k8s_|cloud_)/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isNegatedOperator(operator: string): boolean {
  return ['is_not', 'is_none_of', 'does_not_exist', 'does_not_match'].includes(operator);
}

const OPERATOR_LABELS: Record<string, string> = {
  is: '=',
  is_not: '!=',
  is_any_of: 'in',
  is_none_of: 'not in',
  exists: 'exists',
  does_not_exist: 'does not exist',
  matches: 'matches',
  does_not_match: 'not matches',
};

export function getDisplayValue(filter: EndpointFilter): string {
  const val = filter.value as { type: string; value?: unknown } | null | undefined;
  const label = fieldLabel(filter.field);
  const op = OPERATOR_LABELS[filter.operator] ?? filter.operator;
  if (!val || val.type === 'empty') return `${label} ${op}`;
  if (val.type === 'enum') return `${label}${op === '=' ? '=' : ` ${op} `}${val.value as string}`;
  if (val.type === 'enum_list') return `${label} ${op} [${(val.value as string[]).join(', ')}]`;
  if (val.type === 'entity_list') {
    const names = (val.value as Array<{ id: string; label: string }>)
      .map((e) => e.label)
      .join(', ');
    return isNegatedOperator(filter.operator) ? `${label}: is not ${names}` : names;
  }
  if (val.type === 'string') return `${label} ${op} ${val.value as string}`;
  if (val.type === 'string_list') {
    const items = (val.value as string[]).join(', ');
    return isNegatedOperator(filter.operator) ? `${label}: is not ${items}` : items;
  }
  return String(val.value ?? '');
}
