import { useMemo, useCallback, useState, useEffect } from 'react';
import { PowerSearch } from '@astryxdesign/core/PowerSearch';
import type {
  PowerSearchConfig,
  PowerSearchFilter,
  PowerSearchChangeType,
  FilterValueEnum,
} from '@astryxdesign/core/PowerSearch';
import { VStack } from '@astryxdesign/core/VStack';
import { Selector } from '@astryxdesign/core/Selector';
import { TextInput } from '@astryxdesign/core/TextInput';

import type { Label } from '../../api/labels.js';
import type { RuleEndpoint, PolicyLabel, K8sCluster } from '../../api/policies.js';
import { fetchClusters } from '../../api/policies.js';
import { useLabels } from '../../hooks/useLabels.js';
import { GhostTokens } from './GhostTokens.js';

interface EndpointEditorProps {
  value: RuleEndpoint;
  onChange: (value: RuleEndpoint) => void;
  ghostLabels?: PolicyLabel[];
  isDisabled?: boolean;
}

const TYPE_OPTIONS = [
  { value: 'labels', label: 'Labels' },
  { value: 'k8s', label: 'Kubernetes' },
  { value: 'ip_list', label: 'IP List' },
];

const DEFAULT_ENDPOINTS: Record<RuleEndpoint['type'], RuleEndpoint> = {
  labels: { type: 'labels', labels: [] },
  k8s: { type: 'k8s', k8s: { cluster: '', namespace: { type: 'name', value: '' }, selector: '' } },
  ip_list: { type: 'ip_list', ipList: { cidr: '', name: '' } },
};

export function EndpointEditor({ value, onChange, ghostLabels, isDisabled }: EndpointEditorProps) {
  const allLabels: Label[] = useLabels();
  const [clusters, setClusters] = useState<K8sCluster[]>([]);

  useEffect(() => {
    fetchClusters()
      .then(setClusters)
      .catch(() => setClusters([]));
  }, []);

  const clusterOptions = useMemo(
    () => clusters.map((c) => ({ value: c.name, label: c.name })),
    [clusters]
  );

  const handleTypeChange = useCallback(
    (newType: RuleEndpoint['type']) => {
      onChange(DEFAULT_ENDPOINTS[newType]);
    },
    [onChange]
  );

  // --- Labels type helpers ---
  const config: PowerSearchConfig = useMemo(() => {
    const labelsByKey: Record<string, { value: string; label: string }[]> = {};
    for (const l of allLabels) {
      if (!labelsByKey[l.key]) labelsByKey[l.key] = [];
      labelsByKey[l.key].push({ value: l.value, label: l.value });
    }

    const fieldKeys = ['role', 'app', 'env', 'loc'];
    return {
      name: 'EndpointSearch',
      fields: fieldKeys
        .filter((k) => labelsByKey[k])
        .map((key) => ({
          key,
          label: key.charAt(0).toUpperCase() + key.slice(1),
          defaultOperator: 'is',
          operators: [
            {
              key: 'is',
              label: 'is',
              value: { type: 'enum' as const, values: labelsByKey[key] },
            },
          ],
        })),
    };
  }, [allLabels]);

  const filters: ReadonlyArray<PowerSearchFilter> = useMemo(() => {
    if (value.type !== 'labels' || !value.labels) return [];
    return value.labels.map((l) => ({
      field: l.key,
      operator: 'is',
      value: { type: 'enum' as const, value: l.value },
    }));
  }, [value]);

  const handleLabelsChange = useCallback(
    (
      newFilters: ReadonlyArray<PowerSearchFilter>,
      _changeType: PowerSearchChangeType,
      _index: number
    ) => {
      const labels: PolicyLabel[] = newFilters
        .filter((f) => f.value.type === 'enum')
        .map((f) => ({
          key: f.field,
          value: (f.value as FilterValueEnum).value,
        }));
      onChange({ type: 'labels', labels });
    },
    [onChange]
  );

  // --- K8s type helpers ---
  const handleK8sClusterChange = useCallback(
    (cluster: string) => {
      onChange({
        type: 'k8s',
        k8s: {
          cluster,
          namespace: value.k8s?.namespace ?? { type: 'name', value: '' },
          selector: value.k8s?.selector ?? '',
        },
      });
    },
    [onChange, value.k8s]
  );

  const handleK8sNamespaceChange = useCallback(
    (ns: string) => {
      onChange({
        type: 'k8s',
        k8s: {
          cluster: value.k8s?.cluster ?? '',
          namespace: { type: 'name', value: ns },
          selector: value.k8s?.selector ?? '',
        },
      });
    },
    [onChange, value.k8s]
  );

  const handleK8sSelectorChange = useCallback(
    (selector: string) => {
      onChange({
        type: 'k8s',
        k8s: {
          cluster: value.k8s?.cluster ?? '',
          namespace: value.k8s?.namespace ?? { type: 'name', value: '' },
          selector,
        },
      });
    },
    [onChange, value.k8s]
  );

  // --- IP list type helpers ---
  const handleIpNameChange = useCallback(
    (name: string) => {
      onChange({
        type: 'ip_list',
        ipList: { cidr: value.ipList?.cidr ?? '', name },
      });
    },
    [onChange, value.ipList]
  );

  const handleIpCidrChange = useCallback(
    (cidr: string) => {
      onChange({
        type: 'ip_list',
        ipList: { cidr, name: value.ipList?.name ?? '' },
      });
    },
    [onChange, value.ipList]
  );

  return (
    <VStack gap={0.5}>
      <Selector
        label="Endpoint type"
        isLabelHidden
        options={TYPE_OPTIONS}
        value={value.type}
        onChange={(t: string) => handleTypeChange(t as RuleEndpoint['type'])}
        size="sm"
      />

      {value.type === 'labels' && (
        <VStack gap={0.5}>
          {ghostLabels && ghostLabels.length > 0 && <GhostTokens labels={ghostLabels} />}
          <PowerSearch
            config={config}
            filters={filters}
            onChange={handleLabelsChange}
            placeholder="Add labels…"
            label="Endpoint"
            isDisabled={isDisabled}
            size="sm"
          />
        </VStack>
      )}

      {value.type === 'k8s' && (
        <VStack gap={0.5}>
          <Selector
            label="Cluster"
            options={clusterOptions}
            value={value.k8s?.cluster ?? ''}
            onChange={handleK8sClusterChange}
            size="sm"
          />
          <TextInput
            label="Namespace"
            value={value.k8s?.namespace.value ?? ''}
            onChange={handleK8sNamespaceChange}
            placeholder="e.g. production"
            size="sm"
          />
          <TextInput
            label="Selector"
            value={value.k8s?.selector ?? ''}
            onChange={handleK8sSelectorChange}
            placeholder="e.g. app=web,tier=frontend"
            size="sm"
          />
        </VStack>
      )}

      {value.type === 'ip_list' && (
        <VStack gap={0.5}>
          <TextInput
            label="Name"
            value={value.ipList?.name ?? ''}
            onChange={handleIpNameChange}
            placeholder="e.g. Corporate VPN"
            size="sm"
          />
          <TextInput
            label="CIDR"
            value={value.ipList?.cidr ?? ''}
            onChange={handleIpCidrChange}
            placeholder="e.g. 10.0.0.0/8"
            size="sm"
          />
        </VStack>
      )}
    </VStack>
  );
}
