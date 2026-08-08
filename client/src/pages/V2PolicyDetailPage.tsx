import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { Breadcrumbs, BreadcrumbItem } from '@astryxdesign/core/Breadcrumbs';
import { Banner } from '@astryxdesign/core/Banner';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Button } from '@astryxdesign/core/Button';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Divider } from '@astryxdesign/core/Divider';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Token } from '@astryxdesign/core/Token';

import { useApi } from '../hooks/useApi.js';
import {
  fetchV2Policy,
  deleteV2Policy,
  updateV2Policy,
  provisionV2Policy,
} from '../api/v2-policies.js';
import { fetchClusters, fetchNamespaces } from '../api/policies.js';
import type { K8sCluster, K8sNamespace } from '../api/policies.js';
import { ProvisionBadge } from '../components/ProvisionBadge.js';
import { StatusIndicator } from '../components/StatusIndicator.js';
import { V2RuleTable } from '../features/v2-rules/V2RuleTable.js';
import { DirectionVisual } from '../features/v2-rules/DirectionVisual.js';
import { ConvertToTemplateDialog } from '../features/v2-rules/ConvertToTemplateDialog.js';

export default function V2PolicyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: policy, loading, error, refetch } = useApi(() => fetchV2Policy(id!), [id]);

  const [actionError, setActionError] = useState<string | null>(null);
  const [clusters, setClusters] = useState<K8sCluster[]>([]);
  const [namespaces, setNamespaces] = useState<K8sNamespace[]>([]);
  const [convertToTemplateOpen, setConvertToTemplateOpen] = useState(false);

  // Fetch clusters and namespaces for name resolution
  useEffect(() => {
    fetchClusters()
      .then(setClusters)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!policy?.scope_cluster_ids?.length) return;
    fetchNamespaces(policy.scope_cluster_ids)
      .then(setNamespaces)
      .catch(() => {});
  }, [policy?.scope_cluster_ids]);

  if (loading) {
    return (
      <HStack hAlign="center" padding={8}>
        <Spinner label="Loading policy…" size="lg" />
      </HStack>
    );
  }

  if (error || !policy) {
    return (
      <VStack gap={3} padding={4}>
        <Banner
          status="error"
          title={error ?? 'Policy not found'}
          container="section"
        />
      </VStack>
    );
  }

  const clusterNames = (policy.scope_cluster_ids ?? [])
    .map((id) => clusters.find((c) => c.id === id)?.name ?? id);

  const namespaceNames = (policy.scope_namespace_ids ?? [])
    .map((id) => namespaces.find((n) => n.id === id)?.name ?? id);

  const ingressRules = (policy.rules ?? []).filter((r) => r.direction === 'ingress');
  const egressRules = (policy.rules ?? []).filter((r) => r.direction === 'egress');

  const handleProvision = async () => {
    try {
      setActionError(null);
      await provisionV2Policy(id!);
      refetch();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Provision failed');
    }
  };

  const handleEnable = async () => {
    try {
      setActionError(null);
      await updateV2Policy(id!, { enabled: !policy.enabled });
      refetch();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Action failed');
    }
  };

  const handleDelete = async () => {
    try {
      setActionError(null);
      await deleteV2Policy(id!);
      navigate('/policy-v2');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  return (
    <VStack gap={4} padding={4}>
      {/* Zone 1: Breadcrumbs + Header */}
      <Breadcrumbs>
        <BreadcrumbItem href="/policy-v2">Policy-v2</BreadcrumbItem>
        <BreadcrumbItem isCurrent>{policy.name}</BreadcrumbItem>
      </Breadcrumbs>

      {!!actionError && (
        <Banner
          status="error"
          title={actionError}
          isDismissable
          onDismiss={() => setActionError(null)}
        />
      )}

      <HStack hAlign="between" vAlign="center">
        <HStack gap={2} vAlign="center">
          <Heading level={1}>{policy.name}</Heading>
          <ProvisionBadge status={policy.provision_status} />
          <StatusIndicator enabled={!!policy.enabled} />
        </HStack>
        <HStack gap={2} vAlign="center">
          <Button
            label="Provision"
            variant="primary"
            isDisabled={policy.provision_status === 'provisioned'}
            tooltip={
              policy.provision_status === 'provisioned' ? 'Already provisioned' : undefined
            }
            onClick={handleProvision}
          />
          <MoreMenu
            items={[
              {
                label: policy.enabled ? 'Disable' : 'Enable',
                onClick: handleEnable,
              },
              ...(policy.policy_type === 'standard'
                ? [
                    { type: 'divider' as const },
                    {
                      label: 'Convert to Template',
                      onClick: () => setConvertToTemplateOpen(true),
                    },
                  ]
                : []),
              { type: 'divider' as const },
              {
                label: 'Delete',
                onClick: handleDelete,
              },
            ]}
          />
        </HStack>
      </HStack>

      {/* Zone 2: Scope Display */}
      <Heading level={2}>
        {policy.policy_type === 'guardrail' ? 'Enforcement Points' : 'Scope (Who am I)'}
      </Heading>

      {policy.scope_type === 'k8s' ? (
        <MetadataList columns="multi">
          {clusterNames.length > 0 && (
            <MetadataListItem label="Clusters">
              <HStack gap={0.5} wrap="wrap">
                {clusterNames.map((name) => (
                  <Token key={name} label={name} color="teal" size="sm" />
                ))}
              </HStack>
            </MetadataListItem>
          )}
          {namespaceNames.length > 0 && (
            <MetadataListItem label="Namespaces">
              <HStack gap={0.5} wrap="wrap">
                {namespaceNames.map((name) => (
                  <Token key={name} label={name} color="cyan" size="sm" />
                ))}
              </HStack>
            </MetadataListItem>
          )}
          {policy.scope_labels && policy.scope_labels.length > 0 && (
            <MetadataListItem label="K8s Labels">
              <HStack gap={0.5} wrap="wrap">
                {policy.scope_labels.map((lbl, i) => (
                  <Token key={i} label={`${lbl.key}=${lbl.value}`} color="blue" size="sm" />
                ))}
              </HStack>
            </MetadataListItem>
          )}
        </MetadataList>
      ) : (
        <MetadataList columns="multi">
          <MetadataListItem label="Scope Type">
            <Text>{policy.scope_type === 'all_workloads' ? 'All Workloads' : policy.scope_type}</Text>
          </MetadataListItem>
          {policy.scope_labels && policy.scope_labels.length > 0 && (
            <MetadataListItem label="Labels">
              <HStack gap={0.5} wrap="wrap">
                {policy.scope_labels.map((lbl, i) => (
                  <Token key={i} label={`${lbl.key}=${lbl.value}`} color="blue" size="sm" />
                ))}
              </HStack>
            </MetadataListItem>
          )}
        </MetadataList>
      )}

      <Divider />

      {/* Guardrail banner */}
      {policy.policy_type === 'guardrail' && (
        <Banner
          status="info"
          title={`Rules managed by template: ${policy.template_id ?? 'unknown'}`}
        />
      )}

      {/* Zone 3: Ingress Rules Section */}
      <VStack gap={3}>
        <HStack gap={2} vAlign="center">
          <Heading level={2}>Ingress Rules (Who can talk to me)</Heading>
          <DirectionVisual direction="ingress" />
        </HStack>
        <V2RuleTable
          policyId={policy.id}
          direction="ingress"
          rules={ingressRules}
          onRulesChanged={refetch}
          readOnly={policy.policy_type === 'guardrail'}
        />
      </VStack>

      <Divider />

      {/* Zone 3: Egress Rules Section */}
      <VStack gap={3}>
        <HStack gap={2} vAlign="center">
          <Heading level={2}>Egress Rules (Who can I talk to)</Heading>
          <DirectionVisual direction="egress" />
        </HStack>
        <V2RuleTable
          policyId={policy.id}
          direction="egress"
          rules={egressRules}
          onRulesChanged={refetch}
          readOnly={policy.policy_type === 'guardrail'}
        />
      </VStack>

      {policy.policy_type === 'standard' && (
        <ConvertToTemplateDialog
          isOpen={convertToTemplateOpen}
          onClose={() => setConvertToTemplateOpen(false)}
          policy={policy}
          onConverted={refetch}
        />
      )}
    </VStack>
  );
}
