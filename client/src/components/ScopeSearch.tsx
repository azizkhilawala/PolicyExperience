import { useMemo, useCallback, useState, useEffect } from 'react';
import { PowerSearch } from '@astryxdesign/core/PowerSearch';
import type {
  PowerSearchConfig,
  PowerSearchFilter,
  PowerSearchChangeType,
  FilterValueEnum,
} from '@astryxdesign/core/PowerSearch';

import type { PolicyLabel } from '../api/policies.js';
import {
  fetchLabelGroups,
  fetchCloudAccounts,
  fetchCloudVpcs,
  fetchClusters,
  fetchNamespaces,
} from '../api/policies.js';
import { fetchLabels, type Label } from '../api/labels.js';
import { useLabels } from '../hooks/useLabels.js';

interface ScopeSearchProps {
  labels: PolicyLabel[];
  onChange: (labels: PolicyLabel[]) => void;
  isDisabled?: boolean;
}

interface EntityOption {
  value: string;
  label: string;
}

export function ScopeSearch({ labels, onChange, isDisabled }: ScopeSearchProps) {
  const allLabels: Label[] = useLabels();

  const [labelGroupOptions, setLabelGroupOptions] = useState<EntityOption[]>([]);
  const [awsAccountOptions, setAwsAccountOptions] = useState<EntityOption[]>([]);
  const [azureSubOptions, setAzureSubOptions] = useState<EntityOption[]>([]);
  const [awsVpcOptions, setAwsVpcOptions] = useState<EntityOption[]>([]);
  const [azureVnetOptions, setAzureVnetOptions] = useState<EntityOption[]>([]);
  const [clusterOptions, setClusterOptions] = useState<EntityOption[]>([]);
  const [namespaceOptions, setNamespaceOptions] = useState<EntityOption[]>([]);
  const [k8sLabelOptions, setK8sLabelOptions] = useState<
    Record<string, EntityOption[]>
  >({});

  useEffect(() => {
    fetchLabelGroups()
      .then((groups) =>
        setLabelGroupOptions(groups.map((g) => ({ value: g.name, label: g.name }))),
      )
      .catch(() => {});

    fetchCloudAccounts('aws')
      .then((accts) =>
        setAwsAccountOptions(accts.map((a) => ({ value: a.name, label: `${a.name} (${a.account_id})` }))),
      )
      .catch(() => {});

    fetchCloudAccounts('azure')
      .then((accts) =>
        setAzureSubOptions(accts.map((a) => ({ value: a.name, label: `${a.name} (${a.account_id})` }))),
      )
      .catch(() => {});

    fetchCloudVpcs('aws')
      .then((vpcs) =>
        setAwsVpcOptions(vpcs.map((v) => ({ value: v.name, label: `${v.name} (${v.vpc_id})` }))),
      )
      .catch(() => {});

    fetchCloudVpcs('azure')
      .then((vpcs) =>
        setAzureVnetOptions(vpcs.map((v) => ({ value: v.name, label: `${v.name} (${v.vpc_id})` }))),
      )
      .catch(() => {});

    fetchClusters()
      .then((clusters) =>
        setClusterOptions(clusters.map((c) => ({ value: c.name, label: `${c.name} (${c.region})` }))),
      )
      .catch(() => {});

    fetchNamespaces()
      .then((nss) =>
        setNamespaceOptions(nss.map((n) => ({ value: n.name, label: n.name }))),
      )
      .catch(() => {});

    fetchLabels({ type: 'k8s' })
      .then((k8sLabels) => {
        const byKey: Record<string, EntityOption[]> = {};
        for (const l of k8sLabels) {
          const k = `k8s_label_${l.key}`;
          if (!byKey[k]) byKey[k] = [];
          byKey[k].push({ value: l.value, label: l.value });
        }
        setK8sLabelOptions(byKey);
      })
      .catch(() => {});
  }, []);

  const config: PowerSearchConfig = useMemo(() => {
    const labelsByKey: Record<string, EntityOption[]> = {};
    for (const l of allLabels) {
      if (l.type === 'k8s') continue;
      if (!labelsByKey[l.key]) labelsByKey[l.key] = [];
      labelsByKey[l.key].push({ value: l.value, label: l.value });
    }

    const labelFields = Object.keys(labelsByKey)
      .sort((a, b) => {
        const order = ['app', 'env', 'loc', 'role'];
        const ai = order.indexOf(a);
        const bi = order.indexOf(b);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.localeCompare(b);
      })
      .map((key) => ({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        defaultOperator: 'is' as const,
        operators: [
          {
            key: 'is',
            label: 'is',
            value: { type: 'enum' as const, values: labelsByKey[key] },
          },
        ],
      }));

    const entityFields: typeof labelFields = [];

    if (labelGroupOptions.length > 0) {
      entityFields.push({
        key: 'label_group',
        label: 'Label Group',
        defaultOperator: 'is',
        operators: [
          { key: 'is', label: 'is', value: { type: 'enum' as const, values: labelGroupOptions } },
        ],
      });
    }

    if (awsAccountOptions.length > 0) {
      entityFields.push({
        key: 'aws_account',
        label: 'AWS Account',
        defaultOperator: 'is',
        operators: [
          { key: 'is', label: 'is', value: { type: 'enum' as const, values: awsAccountOptions } },
        ],
      });
    }

    if (azureSubOptions.length > 0) {
      entityFields.push({
        key: 'azure_subscription',
        label: 'Azure Subscription',
        defaultOperator: 'is',
        operators: [
          { key: 'is', label: 'is', value: { type: 'enum' as const, values: azureSubOptions } },
        ],
      });
    }

    if (awsVpcOptions.length > 0) {
      entityFields.push({
        key: 'aws_vpc',
        label: 'AWS VPC',
        defaultOperator: 'is',
        operators: [
          { key: 'is', label: 'is', value: { type: 'enum' as const, values: awsVpcOptions } },
        ],
      });
    }

    if (azureVnetOptions.length > 0) {
      entityFields.push({
        key: 'azure_vnet',
        label: 'Azure VNET',
        defaultOperator: 'is',
        operators: [
          { key: 'is', label: 'is', value: { type: 'enum' as const, values: azureVnetOptions } },
        ],
      });
    }

    if (clusterOptions.length > 0) {
      entityFields.push({
        key: 'k8s_cluster',
        label: 'K8s Cluster',
        defaultOperator: 'is',
        operators: [
          { key: 'is', label: 'is', value: { type: 'enum' as const, values: clusterOptions } },
        ],
      });
    }

    if (namespaceOptions.length > 0) {
      entityFields.push({
        key: 'k8s_namespace',
        label: 'K8s Namespace',
        defaultOperator: 'is',
        operators: [
          { key: 'is', label: 'is', value: { type: 'enum' as const, values: namespaceOptions } },
        ],
      });
    }

    for (const [fieldKey, values] of Object.entries(k8sLabelOptions)) {
      if (values.length > 0) {
        const rawKey = fieldKey.replace('k8s_label_', '');
        entityFields.push({
          key: fieldKey,
          label: `K8s Label: ${rawKey}`,
          defaultOperator: 'is',
          operators: [
            { key: 'is', label: 'is', value: { type: 'enum' as const, values } },
          ],
        });
      }
    }

    return {
      name: 'ScopeSearch',
      fields: [...labelFields, ...entityFields],
    };
  }, [
    allLabels,
    labelGroupOptions,
    awsAccountOptions,
    azureSubOptions,
    awsVpcOptions,
    azureVnetOptions,
    clusterOptions,
    namespaceOptions,
    k8sLabelOptions,
  ]);

  const filters: ReadonlyArray<PowerSearchFilter> = useMemo(
    () =>
      labels.map((l) => ({
        field: l.key,
        operator: 'is',
        value: { type: 'enum' as const, value: l.value },
      })),
    [labels],
  );

  const handleChange = useCallback(
    (
      newFilters: ReadonlyArray<PowerSearchFilter>,
      _changeType: PowerSearchChangeType,
      _index: number,
    ) => {
      const newLabels: PolicyLabel[] = newFilters
        .filter((f) => f.value.type === 'enum')
        .map((f) => ({
          key: f.field,
          value: (f.value as FilterValueEnum).value,
        }));
      onChange(newLabels);
    },
    [onChange],
  );

  return (
    <PowerSearch
      config={config}
      filters={filters}
      onChange={handleChange}
      placeholder="Add scope criteria…"
      label="Scope"
      isDisabled={isDisabled}
      size="sm"
    />
  );
}
