import { useState, useEffect, useMemo } from 'react';
import type { SearchSource } from '@astryxdesign/core/Typeahead';
import type {
  PowerSearchConfig,
  PowerSearchField,
  PowerSearchOperator,
} from '@astryxdesign/core/PowerSearch';

import type { Label } from '../../api/labels.js';
import type { IpList, LabelGroup } from '../../api/policies.js';
import { fetchIpLists, fetchLabelGroups } from '../../api/policies.js';
import { useLabels } from '../../hooks/useLabels.js';

export interface V2EntityResources {
  labels: Label[];
  labelGroups: LabelGroup[];
  ipLists: IpList[];
}

export function useV2EntityResources(): V2EntityResources {
  const labels = useLabels();

  const [labelGroups, setLabelGroups] = useState<LabelGroup[]>([]);
  const [ipLists, setIpLists] = useState<IpList[]>([]);

  useEffect(() => {
    fetchLabelGroups()
      .then(setLabelGroups)
      .catch(() => {});
    fetchIpLists()
      .then(setIpLists)
      .catch(() => {});
  }, []);

  return useMemo(() => ({ labels, labelGroups, ipLists }), [labels, labelGroups, ipLists]);
}

function makeEntitySource<T extends { id: string; name: string }>(
  items: T[],
  toLabel: (item: T) => string,
): SearchSource {
  return {
    search: (q: string) => {
      const lower = q.toLowerCase();
      return items
        .filter((item) => toLabel(item).toLowerCase().includes(lower))
        .map((item) => ({ id: item.id, label: toLabel(item) }));
    },
    bootstrap: () => items.map((item) => ({ id: item.id, label: toLabel(item) })),
  };
}

export function buildV2EntityConfig(
  resources: V2EntityResources,
  direction: 'ingress' | 'egress',
): PowerSearchConfig {
  const { labels, labelGroups, ipLists } = resources;

  const fields: PowerSearchField[] = [];

  // ─── Labels group ─────────────────────────────────────────────────────────
  const labelsByKey: Record<string, { value: string; label: string }[]> = {};
  for (const l of labels) {
    if (l.type !== 'k8s') {
      if (!labelsByKey[l.key]) labelsByKey[l.key] = [];
      labelsByKey[l.key].push({ value: l.value, label: l.value });
    }
  }

  const labelFieldKeys = ['role', 'app', 'env', 'loc'];
  for (const key of Object.keys(labelsByKey)) {
    if (!labelFieldKeys.includes(key)) {
      labelFieldKeys.push(key);
    }
  }

  for (const key of labelFieldKeys) {
    const enumValues = labelsByKey[key] ?? [];
    fields.push({
      key: `label_${key}`,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      group: 'Labels',
      defaultOperator: 'is',
      operators: [
        {
          key: 'is',
          label: 'is',
          value: { type: 'enum', values: enumValues },
        } satisfies PowerSearchOperator,
        {
          key: 'is_not',
          label: 'is not',
          value: { type: 'enum', values: enumValues },
        } satisfies PowerSearchOperator,
        {
          key: 'is_any_of',
          label: 'is any of',
          value: { type: 'enum_list', values: enumValues },
        } satisfies PowerSearchOperator,
        {
          key: 'is_none_of',
          label: 'is none of',
          value: { type: 'enum_list', values: enumValues },
        } satisfies PowerSearchOperator,
        {
          key: 'exists',
          label: 'exists',
          value: { type: 'empty' },
        } satisfies PowerSearchOperator,
        {
          key: 'does_not_exist',
          label: 'does not exist',
          value: { type: 'empty' },
        } satisfies PowerSearchOperator,
      ],
    });
  }

  // label_group field
  const labelGroupSource: SearchSource = {
    search: (q: string) => {
      const lower = q.toLowerCase();
      return labelGroups
        .filter((lg) => lg.name.toLowerCase().includes(lower))
        .map((lg) => ({ id: lg.id, label: lg.name }));
    },
    bootstrap: () => labelGroups.map((lg) => ({ id: lg.id, label: lg.name })),
  };
  fields.push({
    key: 'label_group',
    label: 'Label Group',
    group: 'Labels',
    defaultOperator: 'is',
    operators: [
      {
        key: 'is',
        label: 'is',
        value: { type: 'entity_list', searchSource: labelGroupSource },
      } satisfies PowerSearchOperator,
      {
        key: 'is_not',
        label: 'is not',
        value: { type: 'entity_list', searchSource: labelGroupSource },
      } satisfies PowerSearchOperator,
    ],
  });

  // ─── Kubernetes group ─────────────────────────────────────────────────────
  const k8sPodLabelKeys = new Set<string>(['app', 'tier', 'version']);
  for (const l of labels) {
    if (l.type === 'k8s') {
      k8sPodLabelKeys.add(l.key);
    }
  }

  const k8sPodLabelValues: Record<string, { value: string; label: string }[]> = {};
  for (const l of labels) {
    if (l.type === 'k8s' && k8sPodLabelKeys.has(l.key)) {
      if (!k8sPodLabelValues[l.key]) k8sPodLabelValues[l.key] = [];
      if (!k8sPodLabelValues[l.key].some((v) => v.value === l.value)) {
        k8sPodLabelValues[l.key].push({ value: l.value, label: l.value });
      }
    }
  }

  for (const podKey of k8sPodLabelKeys) {
    const podEnumValues = k8sPodLabelValues[podKey] ?? [];
    fields.push({
      key: `k8s_pod_${podKey}`,
      label: `K8s Pod: ${podKey}`,
      group: 'Kubernetes',
      defaultOperator: 'is',
      operators: [
        {
          key: 'is',
          label: 'is',
          value:
            podEnumValues.length > 0
              ? { type: 'enum' as const, values: podEnumValues }
              : { type: 'string' as const },
        } satisfies PowerSearchOperator,
        {
          key: 'is_not',
          label: 'is not',
          value:
            podEnumValues.length > 0
              ? { type: 'enum' as const, values: podEnumValues }
              : { type: 'string' as const },
        } satisfies PowerSearchOperator,
        {
          key: 'is_any_of',
          label: 'is any of',
          value:
            podEnumValues.length > 0
              ? { type: 'enum_list' as const, values: podEnumValues }
              : { type: 'string_list' as const },
        } satisfies PowerSearchOperator,
        {
          key: 'is_none_of',
          label: 'is none of',
          value:
            podEnumValues.length > 0
              ? { type: 'enum_list' as const, values: podEnumValues }
              : { type: 'string_list' as const },
        } satisfies PowerSearchOperator,
        {
          key: 'exists',
          label: 'exists',
          value: { type: 'empty' },
        } satisfies PowerSearchOperator,
        {
          key: 'does_not_exist',
          label: 'does not exist',
          value: { type: 'empty' },
        } satisfies PowerSearchOperator,
      ],
    });
  }

  const serviceAccountValues = [
    { value: 'default', label: 'default' },
    { value: 'payment-processor-sa', label: 'payment-processor-sa' },
    { value: 'monitoring-agent-sa', label: 'monitoring-agent-sa' },
    { value: 'backend-api-sa', label: 'backend-api-sa' },
    { value: 'ingress-controller-sa', label: 'ingress-controller-sa' },
    { value: 'cert-manager-sa', label: 'cert-manager-sa' },
    { value: 'fluentd-sa', label: 'fluentd-sa' },
    { value: 'etl-worker-sa', label: 'etl-worker-sa' },
    { value: 'ml-trainer-sa', label: 'ml-trainer-sa' },
    { value: 'vault-auth-sa', label: 'vault-auth-sa' },
  ];

  fields.push({
    key: 'k8s_service_account',
    label: 'K8s Service Account',
    group: 'Kubernetes',
    defaultOperator: 'is',
    operators: [
      {
        key: 'is',
        label: 'is',
        value: { type: 'enum', values: serviceAccountValues },
      } satisfies PowerSearchOperator,
      {
        key: 'is_not',
        label: 'is not',
        value: { type: 'enum', values: serviceAccountValues },
      } satisfies PowerSearchOperator,
      {
        key: 'is_any_of',
        label: 'is any of',
        value: { type: 'enum_list', values: serviceAccountValues },
      } satisfies PowerSearchOperator,
      {
        key: 'is_none_of',
        label: 'is none of',
        value: { type: 'enum_list', values: serviceAccountValues },
      } satisfies PowerSearchOperator,
    ],
  });

  const k8sServiceValues = [
    { value: 'payment-api-svc', label: 'payment-api-svc' },
    { value: 'backend-api-svc', label: 'backend-api-svc' },
    { value: 'web-frontend-svc', label: 'web-frontend-svc' },
    { value: 'prometheus-svc', label: 'prometheus-svc' },
    { value: 'grafana-svc', label: 'grafana-svc' },
    { value: 'elasticsearch-svc', label: 'elasticsearch-svc' },
    { value: 'redis-svc', label: 'redis-svc' },
    { value: 'postgres-svc', label: 'postgres-svc' },
    { value: 'kube-dns', label: 'kube-dns' },
    { value: 'notification-svc', label: 'notification-svc' },
  ];

  const k8sIngressValues = [
    { value: 'nginx-ingress', label: 'nginx-ingress' },
    { value: 'traefik-ingress', label: 'traefik-ingress' },
    { value: 'istio-ingressgateway', label: 'istio-ingressgateway' },
    { value: 'haproxy-ingress', label: 'haproxy-ingress' },
    { value: 'contour-ingress', label: 'contour-ingress' },
    { value: 'alb-ingress', label: 'alb-ingress' },
    { value: 'api-gateway-ingress', label: 'api-gateway-ingress' },
  ];

  const k8sGatewayValues = [
    { value: 'istio-gateway', label: 'istio-gateway' },
    { value: 'kong-gateway', label: 'kong-gateway' },
    { value: 'envoy-gateway', label: 'envoy-gateway' },
    { value: 'nginx-gateway', label: 'nginx-gateway' },
    { value: 'apisix-gateway', label: 'apisix-gateway' },
    { value: 'traefik-gateway', label: 'traefik-gateway' },
    { value: 'gloo-gateway', label: 'gloo-gateway' },
  ];

  if (direction === 'egress') {
    fields.push(
      {
        key: 'k8s_service',
        label: 'K8s Service',
        group: 'Kubernetes',
        defaultOperator: 'is',
        operators: [
          {
            key: 'is',
            label: 'is',
            value: { type: 'enum', values: k8sServiceValues },
          } satisfies PowerSearchOperator,
          {
            key: 'is_not',
            label: 'is not',
            value: { type: 'enum', values: k8sServiceValues },
          } satisfies PowerSearchOperator,
        ],
      },
      {
        key: 'k8s_ingress',
        label: 'K8s Ingress',
        group: 'Kubernetes',
        defaultOperator: 'is',
        operators: [
          {
            key: 'is',
            label: 'is',
            value: { type: 'enum', values: k8sIngressValues },
          } satisfies PowerSearchOperator,
          {
            key: 'is_not',
            label: 'is not',
            value: { type: 'enum', values: k8sIngressValues },
          } satisfies PowerSearchOperator,
        ],
      },
      {
        key: 'k8s_gateway',
        label: 'K8s Gateway',
        group: 'Kubernetes',
        defaultOperator: 'is',
        operators: [
          {
            key: 'is',
            label: 'is',
            value: { type: 'enum', values: k8sGatewayValues },
          } satisfies PowerSearchOperator,
          {
            key: 'is_not',
            label: 'is not',
            value: { type: 'enum', values: k8sGatewayValues },
          } satisfies PowerSearchOperator,
        ],
      },
    );
  }

  // ─── Network group ────────────────────────────────────────────────────────
  const ipListSource: SearchSource = makeEntitySource(ipLists, (ip) => `${ip.name} (${ip.cidr})`);
  fields.push({
    key: 'ip_list',
    label: 'IP List',
    group: 'Network',
    defaultOperator: 'is',
    operators: [
      {
        key: 'is',
        label: 'is',
        value: { type: 'entity_list', searchSource: ipListSource },
      } satisfies PowerSearchOperator,
      {
        key: 'is_not',
        label: 'is not',
        value: { type: 'entity_list', searchSource: ipListSource },
      } satisfies PowerSearchOperator,
      {
        key: 'is_any_of',
        label: 'is any of',
        value: { type: 'entity_list', searchSource: ipListSource },
      } satisfies PowerSearchOperator,
      {
        key: 'is_none_of',
        label: 'is none of',
        value: { type: 'entity_list', searchSource: ipListSource },
      } satisfies PowerSearchOperator,
    ],
  });

  if (direction === 'egress') {
    const fqdnValues = [
      { value: 'api.stripe.com', label: 'api.stripe.com' },
      { value: '*.amazonaws.com', label: '*.amazonaws.com' },
      { value: '*.googleapis.com', label: '*.googleapis.com' },
      { value: 'login.microsoftonline.com', label: 'login.microsoftonline.com' },
      { value: 'api.github.com', label: 'api.github.com' },
    ];
    fields.push({
      key: 'fqdn',
      label: 'FQDN',
      group: 'Network',
      defaultOperator: 'matches',
      operators: [
        {
          key: 'matches',
          label: 'matches',
          value: { type: 'enum', values: fqdnValues },
        } satisfies PowerSearchOperator,
        {
          key: 'does_not_match',
          label: 'does not match',
          value: { type: 'enum', values: fqdnValues },
        } satisfies PowerSearchOperator,
      ],
    });
  }

  return {
    name: 'V2EntitySearch',
    fields,
  };
}
