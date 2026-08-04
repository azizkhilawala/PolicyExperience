import { useState, useEffect, useMemo } from 'react';
import type { SearchSource } from '@astryxdesign/core/Typeahead';
import type {
  PowerSearchConfig,
  PowerSearchField,
  PowerSearchOperator,
} from '@astryxdesign/core/PowerSearch';

import type { Label } from '../../api/labels.js';
import type {
  IpList,
  UserGroup,
  VirtualService,
  LabelGroup,
  CloudAccount,
  CloudVpc,
  CloudSubnet,
  K8sCluster,
  K8sNamespace,
} from '../../api/policies.js';
import {
  fetchIpLists,
  fetchUserGroups,
  fetchVirtualServices,
  fetchLabelGroups,
  fetchCloudAccounts,
  fetchCloudVpcs,
  fetchCloudSubnets,
  fetchClusters,
  fetchNamespaces,
} from '../../api/policies.js';
import { useLabels } from '../../hooks/useLabels.js';

// Workload is not a real API type in this demo; we use a minimal placeholder
export interface Workload {
  id: string;
  name: string;
  hostname: string;
}

export interface EndpointResources {
  labels: Label[];
  labelGroups: LabelGroup[];
  ipLists: IpList[];
  workloads: Workload[];
  userGroups: UserGroup[];
  virtualServices: VirtualService[];
  clusters: K8sCluster[];
  namespaces: K8sNamespace[];
  cloudAccounts: CloudAccount[];
  cloudVpcs: CloudVpc[];
  cloudSubnets: CloudSubnet[];
}

export function useEndpointResources(): EndpointResources {
  const labels = useLabels();

  const [labelGroups, setLabelGroups] = useState<LabelGroup[]>([]);
  const [ipLists, setIpLists] = useState<IpList[]>([]);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [virtualServices, setVirtualServices] = useState<VirtualService[]>([]);
  const [clusters, setClusters] = useState<K8sCluster[]>([]);
  const [namespaces, setNamespaces] = useState<K8sNamespace[]>([]);
  const [cloudAccounts, setCloudAccounts] = useState<CloudAccount[]>([]);
  const [cloudVpcs, setCloudVpcs] = useState<CloudVpc[]>([]);
  const [cloudSubnets, setCloudSubnets] = useState<CloudSubnet[]>([]);

  useEffect(() => {
    fetchLabelGroups().then(setLabelGroups).catch(() => {});
    fetchIpLists().then(setIpLists).catch(() => {});
    fetchUserGroups().then(setUserGroups).catch(() => {});
    fetchVirtualServices().then(setVirtualServices).catch(() => {});
    fetchClusters().then(setClusters).catch(() => {});
    fetchNamespaces().then(setNamespaces).catch(() => {});
    fetchCloudAccounts().then(setCloudAccounts).catch(() => {});
    fetchCloudVpcs().then(setCloudVpcs).catch(() => {});
    fetchCloudSubnets().then(setCloudSubnets).catch(() => {});
  }, []);

  return useMemo(
    () => ({
      labels,
      labelGroups,
      ipLists,
      workloads: [] as Workload[], // no workloads API in this demo
      userGroups,
      virtualServices,
      clusters,
      namespaces,
      cloudAccounts,
      cloudVpcs,
      cloudSubnets,
    }),
    [labels, labelGroups, ipLists, userGroups, virtualServices, clusters, namespaces, cloudAccounts, cloudVpcs, cloudSubnets]
  );
}

function makeEntitySource<T extends { id: string; name: string }>(
  items: T[],
  toLabel: (item: T) => string
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

export function buildEndpointConfig(
  resources: EndpointResources,
  side: 'source' | 'destination'
): PowerSearchConfig {
  const { labels, labelGroups, ipLists, userGroups, virtualServices, clusters, namespaces, cloudAccounts, cloudVpcs, cloudSubnets } = resources;

  const fields: PowerSearchField[] = [];

  // ─── Labels group ─────────────────────────────────────────────────────────
  const labelsByKey: Record<string, { value: string; label: string }[]> = {};
  for (const l of labels) {
    if (!labelsByKey[l.key]) labelsByKey[l.key] = [];
    labelsByKey[l.key].push({ value: l.value, label: l.value });
  }

  const labelFieldKeys = ['role', 'app', 'env', 'loc'];
  // Also include any label keys found in the data that aren't in the default set
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

  // ─── Network group ────────────────────────────────────────────────────────
  const ipListSource: SearchSource = makeEntitySource(
    ipLists,
    (ip) => `${ip.name} (${ip.cidr})`
  );
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
    ],
  });

  if (side === 'destination') {
    fields.push({
      key: 'fqdn',
      label: 'FQDN',
      group: 'Network',
      defaultOperator: 'matches',
      operators: [
        {
          key: 'matches',
          label: 'matches',
          value: { type: 'string' },
        } satisfies PowerSearchOperator,
      ],
    });
  }

  // ─── Workloads group ──────────────────────────────────────────────────────
  const workloadSource: SearchSource = makeEntitySource(resources.workloads, (w) => w.name);
  fields.push({
    key: 'workload',
    label: 'Workload',
    group: 'Workloads',
    defaultOperator: 'is',
    operators: [
      {
        key: 'is',
        label: 'is',
        value: { type: 'entity_list', searchSource: workloadSource },
      } satisfies PowerSearchOperator,
    ],
  });

  // ─── Identity group ───────────────────────────────────────────────────────
  const userGroupSource: SearchSource = makeEntitySource(userGroups, (ug) => ug.name);
  fields.push({
    key: 'user_group',
    label: 'User Group',
    group: 'Identity',
    defaultOperator: 'is',
    operators: [
      {
        key: 'is',
        label: 'is',
        value: { type: 'entity_list', searchSource: userGroupSource },
      } satisfies PowerSearchOperator,
    ],
  });

  // ─── Services group ───────────────────────────────────────────────────────
  const virtualServiceSource: SearchSource = makeEntitySource(virtualServices, (vs) => vs.name);
  fields.push({
    key: 'virtual_service',
    label: 'Virtual Service',
    group: 'Services',
    defaultOperator: 'is',
    operators: [
      {
        key: 'is',
        label: 'is',
        value: { type: 'entity_list', searchSource: virtualServiceSource },
      } satisfies PowerSearchOperator,
    ],
  });

  // ─── Kubernetes group ─────────────────────────────────────────────────────
  const clusterEnumValues = clusters.map((c) => ({ value: c.name, label: c.name }));
  fields.push({
    key: 'k8s_cluster',
    label: 'K8s Cluster',
    group: 'Kubernetes',
    defaultOperator: 'is',
    operators: [
      {
        key: 'is',
        label: 'is',
        value: { type: 'enum', values: clusterEnumValues },
      } satisfies PowerSearchOperator,
      {
        key: 'is_not',
        label: 'is not',
        value: { type: 'enum', values: clusterEnumValues },
      } satisfies PowerSearchOperator,
    ],
  });

  const namespaceEnumValues = namespaces.map((ns) => ({ value: ns.name, label: ns.name }));
  fields.push({
    key: 'k8s_namespace',
    label: 'K8s Namespace',
    group: 'Kubernetes',
    defaultOperator: 'is',
    operators: [
      {
        key: 'is',
        label: 'is',
        value: { type: 'enum', values: namespaceEnumValues },
      } satisfies PowerSearchOperator,
      {
        key: 'is_not',
        label: 'is not',
        value: { type: 'enum', values: namespaceEnumValues },
      } satisfies PowerSearchOperator,
    ],
  });

  // K8s pod label fields — derive unique keys from k8s labels in the data
  const k8sPodLabelKeys = new Set<string>(['app', 'tier', 'version']);
  for (const l of labels) {
    if (l.type === 'k8s') {
      k8sPodLabelKeys.add(l.key);
    }
  }
  for (const ns of namespaces) {
    for (const l of ns.labels) {
      k8sPodLabelKeys.add(l.key);
    }
  }

  for (const podKey of k8sPodLabelKeys) {
    fields.push({
      key: `k8s_pod_${podKey}`,
      label: `K8s Pod: ${podKey}`,
      group: 'Kubernetes',
      defaultOperator: 'is',
      operators: [
        {
          key: 'is',
          label: 'is',
          value: { type: 'string' },
        } satisfies PowerSearchOperator,
        {
          key: 'is_not',
          label: 'is not',
          value: { type: 'string' },
        } satisfies PowerSearchOperator,
      ],
    });
  }

  fields.push({
    key: 'k8s_service_account',
    label: 'K8s Service Account',
    group: 'Kubernetes',
    defaultOperator: 'is',
    operators: [
      {
        key: 'is',
        label: 'is',
        value: { type: 'string_list' },
      } satisfies PowerSearchOperator,
    ],
  });

  if (side === 'destination') {
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
            value: { type: 'string' },
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
            value: { type: 'string' },
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
            value: { type: 'string' },
          } satisfies PowerSearchOperator,
        ],
      }
    );
  }

  // ─── Cloud - AWS group ────────────────────────────────────────────────────
  const awsAccounts = cloudAccounts.filter((a) => a.provider === 'aws');
  const awsVpcs = cloudVpcs.filter((v) => v.provider === 'aws');
  const awsSubnets = cloudSubnets.filter((s) => s.provider === 'aws');

  const awsAccountSource: SearchSource = makeEntitySource(awsAccounts, (a) => `${a.name} (${a.account_id})`);
  const awsVpcSource: SearchSource = makeEntitySource(awsVpcs, (v) => `${v.name} (${v.vpc_id})`);
  const awsSubnetSource: SearchSource = makeEntitySource(awsSubnets, (s) => `${s.name} (${s.subnet_id})`);

  fields.push(
    {
      key: 'cloud_aws_account',
      label: 'AWS Account',
      group: 'Cloud - AWS',
      defaultOperator: 'is',
      operators: [
        {
          key: 'is',
          label: 'is',
          value: { type: 'entity_list', searchSource: awsAccountSource },
        } satisfies PowerSearchOperator,
      ],
    },
    {
      key: 'cloud_aws_vpc',
      label: 'AWS VPC',
      group: 'Cloud - AWS',
      defaultOperator: 'is',
      operators: [
        {
          key: 'is',
          label: 'is',
          value: { type: 'entity_list', searchSource: awsVpcSource },
        } satisfies PowerSearchOperator,
      ],
    },
    {
      key: 'cloud_aws_subnet',
      label: 'AWS Subnet',
      group: 'Cloud - AWS',
      defaultOperator: 'is',
      operators: [
        {
          key: 'is',
          label: 'is',
          value: { type: 'entity_list', searchSource: awsSubnetSource },
        } satisfies PowerSearchOperator,
      ],
    }
  );

  // ─── Cloud - Azure group ──────────────────────────────────────────────────
  const azureAccounts = cloudAccounts.filter((a) => a.provider === 'azure');
  const azureVpcs = cloudVpcs.filter((v) => v.provider === 'azure');
  const azureSubnets = cloudSubnets.filter((s) => s.provider === 'azure');

  const azureAccountSource: SearchSource = makeEntitySource(azureAccounts, (a) => `${a.name} (${a.account_id})`);
  const azureVpcSource: SearchSource = makeEntitySource(azureVpcs, (v) => `${v.name} (${v.vpc_id})`);
  const azureSubnetSource: SearchSource = makeEntitySource(azureSubnets, (s) => `${s.name} (${s.subnet_id})`);

  fields.push(
    {
      key: 'cloud_azure_subscription',
      label: 'Azure Subscription',
      group: 'Cloud - Azure',
      defaultOperator: 'is',
      operators: [
        {
          key: 'is',
          label: 'is',
          value: { type: 'entity_list', searchSource: azureAccountSource },
        } satisfies PowerSearchOperator,
      ],
    },
    {
      key: 'cloud_azure_vnet',
      label: 'Azure VNet',
      group: 'Cloud - Azure',
      defaultOperator: 'is',
      operators: [
        {
          key: 'is',
          label: 'is',
          value: { type: 'entity_list', searchSource: azureVpcSource },
        } satisfies PowerSearchOperator,
      ],
    },
    {
      key: 'cloud_azure_subnet',
      label: 'Azure Subnet',
      group: 'Cloud - Azure',
      defaultOperator: 'is',
      operators: [
        {
          key: 'is',
          label: 'is',
          value: { type: 'entity_list', searchSource: azureSubnetSource },
        } satisfies PowerSearchOperator,
      ],
    }
  );

  return {
    name: 'EndpointSearch',
    fields,
  };
}
