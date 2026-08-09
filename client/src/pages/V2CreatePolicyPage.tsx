import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Breadcrumbs, BreadcrumbItem } from '@astryxdesign/core/Breadcrumbs';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { TextInput } from '@astryxdesign/core/TextInput';
import { TextArea } from '@astryxdesign/core/TextArea';
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList';
import { MultiSelector } from '@astryxdesign/core/MultiSelector';
import type { MultiSelectorOptionData } from '@astryxdesign/core/MultiSelector';
import { Divider } from '@astryxdesign/core/Divider';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Selector } from '@astryxdesign/core/Selector';

import { createV2Policy, createV2Rule } from '../api/v2-policies.js';
import type { V2Policy } from '../api/v2-policies.js';
import { fetchClusters, fetchNamespaces } from '../api/policies.js';
import type { K8sCluster, K8sNamespace } from '../api/policies.js';
import { apiFetch } from '../api/client.js';
import { fetchV2Templates, fetchV2TemplateRules } from '../api/v2-templates.js';
import type { V2Template, V2TemplateRule } from '../api/v2-templates.js';
import { V2RuleTable } from '../features/v2-rules/V2RuleTable.js';
import type { DraftRule } from '../features/v2-rules/V2RuleTable.js';
import { DirectionVisual } from '../features/v2-rules/DirectionVisual.js';

export default function V2CreatePolicyPage() {
  const navigate = useNavigate();

  // Policy info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Scope
  const [scopeType, setScopeType] = useState<string>('k8s');

  // K8s scope cascading selectors
  const [clusters, setClusters] = useState<K8sCluster[]>([]);
  const [namespaces, setNamespaces] = useState<K8sNamespace[]>([]);
  const [labelOptions, setLabelOptions] = useState<MultiSelectorOptionData[]>([]);

  const [selectedClusterIds, setSelectedClusterIds] = useState<string[]>([]);
  const [selectedNamespaceIds, setSelectedNamespaceIds] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  // Draft rules
  const [ingressDraftRules, setIngressDraftRules] = useState<DraftRule[]>([]);
  const [egressDraftRules, setEgressDraftRules] = useState<DraftRule[]>([]);

  // Policy type (standard vs guardrail)
  const [policyType, setPolicyType] = useState<'standard' | 'guardrail'>('standard');
  const [templates, setTemplates] = useState<V2Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templatePreviewRules, setTemplatePreviewRules] = useState<V2TemplateRule[]>([]);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load clusters on mount
  useEffect(() => {
    fetchClusters()
      .then(setClusters)
      .catch(() => {});
  }, []);

  // Load templates on mount
  useEffect(() => {
    fetchV2Templates()
      .then(setTemplates)
      .catch(() => {});
  }, []);

  // Load template rules when template is selected
  useEffect(() => {
    if (!selectedTemplateId) {
      setTemplatePreviewRules([]);
      return;
    }
    fetchV2TemplateRules(selectedTemplateId)
      .then(setTemplatePreviewRules)
      .catch(() => {});
  }, [selectedTemplateId]);

  // Load namespaces when clusters change
  useEffect(() => {
    if (selectedClusterIds.length === 0) {
      setNamespaces([]);
      setSelectedNamespaceIds([]);
      setSelectedLabels([]);
      setLabelOptions([]);
      return;
    }
    fetchNamespaces(selectedClusterIds)
      .then(setNamespaces)
      .catch(() => {});
  }, [selectedClusterIds]);

  // Load workload labels when namespaces change
  useEffect(() => {
    if (selectedNamespaceIds.length === 0) {
      setSelectedLabels([]);
      setLabelOptions([]);
      return;
    }

    const fetchLabels = async () => {
      const allLabels = new Map<string, string>();
      for (const nsId of selectedNamespaceIds) {
        try {
          const workloads = await apiFetch<
            Array<{ labels: Array<{ key: string; value: string }> }>
          >(`/api/workloads?namespace_id=${nsId}`);
          for (const wl of workloads) {
            for (const lbl of wl.labels ?? []) {
              const kv = `${lbl.key}=${lbl.value}`;
              allLabels.set(kv, kv);
            }
          }
        } catch {
          // ignore per-namespace errors
        }
      }
      setLabelOptions(Array.from(allLabels.values()).map((kv) => ({ value: kv, label: kv })));
    };

    fetchLabels();
  }, [selectedNamespaceIds]);

  const clusterOptions: MultiSelectorOptionData[] = clusters.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const namespaceOptions: MultiSelectorOptionData[] = namespaces.map((n) => ({
    value: n.id,
    label: n.name,
  }));

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Policy name is required');
      return;
    }
    if (policyType === 'guardrail' && !selectedTemplateId) {
      setError('Please select a template for the guardrail policy');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const scopeLabels = selectedLabels.map((kv) => {
        const eqIdx = kv.indexOf('=');
        return { key: kv.slice(0, eqIdx), value: kv.slice(eqIdx + 1) };
      });
      if (policyType === 'guardrail') {
        const policy = await createV2Policy({
          name: name.trim(),
          description: description.trim(),
          scope_type: scopeType as V2Policy['scope_type'],
          scope_cluster_ids: scopeType === 'k8s' ? selectedClusterIds : [],
          scope_namespace_ids: scopeType === 'k8s' ? selectedNamespaceIds : [],
          scope_labels: scopeType === 'k8s' ? scopeLabels : [],
          policy_type: 'guardrail',
          template_id: selectedTemplateId,
        });
        navigate(`/policy-v2/${policy.id}`);
      } else {
        const policy = await createV2Policy({
          name: name.trim(),
          description: description.trim(),
          scope_type: scopeType as V2Policy['scope_type'],
          scope_cluster_ids: scopeType === 'k8s' ? selectedClusterIds : [],
          scope_namespace_ids: scopeType === 'k8s' ? selectedNamespaceIds : [],
          scope_labels: scopeType === 'k8s' ? scopeLabels : [],
        });
        for (const rule of [...ingressDraftRules, ...egressDraftRules]) {
          await createV2Rule(policy.id, {
            direction: rule.direction,
            entity: rule.entity,
            services: rule.services,
            action: rule.action,
          });
        }
        navigate(`/policy-v2/${policy.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create policy');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <VStack gap={4} padding={4}>
      {/* Breadcrumbs */}
      <Breadcrumbs>
        <BreadcrumbItem onClick={() => navigate('/policy-v2')}>Policies (v2)</BreadcrumbItem>
        <BreadcrumbItem isCurrent>Create Policy</BreadcrumbItem>
      </Breadcrumbs>

      <Heading level={1}>Create Policy</Heading>

      {error ? (
        <Banner status="error" title={error} isDismissable onDismiss={() => setError(null)} />
      ) : null}

      {/* Zone 1: Policy Info */}
      <VStack gap={3}>
        <Heading level={2}>Policy Info</Heading>
        <SegmentedControl
          label="Policy Type"
          value={policyType}
          onChange={(v) => setPolicyType(v as 'standard' | 'guardrail')}
        >
          <SegmentedControlItem value="standard" label="Standard Policy" />
          <SegmentedControlItem value="guardrail" label="Guardrail Policy" />
        </SegmentedControl>
        <TextInput
          label="Name"
          value={name}
          onChange={setName}
          isRequired
          placeholder="Enter policy name"
          width="100%"
          status={
            error && !name.trim()
              ? { type: 'error', message: 'Policy name is required' }
              : undefined
          }
        />
        <TextArea
          label="Description"
          value={description}
          onChange={setDescription}
          isOptional
          placeholder="Enter an optional description"
          rows={3}
        />
      </VStack>

      <Divider />

      {/* Zone 2: Scope Selection */}
      <VStack gap={3}>
        <Heading level={2}>{policyType === 'guardrail' ? 'Enforcement Points' : 'Scope'}</Heading>
        <RadioList
          label="Scope Type"
          value={scopeType}
          onChange={setScopeType}
          orientation="horizontal"
        >
          <RadioListItem value="all_workloads" label="All Workloads" />
          <RadioListItem value="labels" label="Labels" isDisabled />
          <RadioListItem value="k8s" label="Kubernetes" />
        </RadioList>

        {scopeType === 'k8s' && (
          <HStack gap={3} vAlign="start">
            <MultiSelector
              label="Clusters"
              options={clusterOptions}
              value={selectedClusterIds}
              onChange={(vals) => {
                setSelectedClusterIds(vals);
                setSelectedNamespaceIds([]);
                setSelectedLabels([]);
              }}
              isRequired
              placeholder="Select clusters…"
              hasSearch
              triggerDisplay="badges"
              width="100%"
            />
            <MultiSelector
              label="Namespaces"
              options={namespaceOptions}
              value={selectedNamespaceIds}
              onChange={(vals) => {
                setSelectedNamespaceIds(vals);
                setSelectedLabels([]);
              }}
              isOptional
              placeholder="Select namespaces…"
              isDisabled={selectedClusterIds.length === 0}
              disabledMessage="Select at least one cluster first"
              hasSearch
              triggerDisplay="badges"
              width="100%"
            />
            <MultiSelector
              label="K8s Labels"
              options={labelOptions}
              value={selectedLabels}
              onChange={setSelectedLabels}
              isOptional
              placeholder="Select labels…"
              isDisabled={selectedNamespaceIds.length === 0}
              disabledMessage="Select at least one namespace first"
              hasSearch
              triggerDisplay="badges"
              width="100%"
            />
          </HStack>
        )}
      </VStack>

      <Divider />

      {/* Zone 3 & 4: Guardrail template picker + read-only preview OR standard draft rule editors */}
      {policyType === 'guardrail' ? (
        <>
          <VStack gap={3}>
            <Selector
              label="Template"
              options={templates.map((t) => ({ value: t.id, label: t.name }))}
              value={selectedTemplateId}
              onChange={setSelectedTemplateId}
              isRequired
              placeholder="Select a template…"
              hasSearch
              width="100%"
            />
            {selectedTemplateId && (
              <Banner
                status="info"
                title={`Rules are managed by the selected template. The policy will inherit all template rules.`}
              />
            )}
          </VStack>

          {selectedTemplateId && (
            <>
              <Divider />

              <VStack gap={2}>
                <HStack gap={2} vAlign="center">
                  <DirectionVisual direction="ingress" />
                  <Heading level={2}>Ingress Rules (Template Preview)</Heading>
                </HStack>
                <V2RuleTable
                  policyId=""
                  direction="ingress"
                  rules={templatePreviewRules
                    .filter((r) => r.direction === 'ingress')
                    .map((r) => ({
                      ...r,
                      policy_id: '',
                      provision_status: 'draft' as const,
                    }))}
                  onRulesChanged={() => {}}
                  readOnly
                />
              </VStack>

              <Divider />

              <VStack gap={2}>
                <HStack gap={2} vAlign="center">
                  <DirectionVisual direction="egress" />
                  <Heading level={2}>Egress Rules (Template Preview)</Heading>
                </HStack>
                <V2RuleTable
                  policyId=""
                  direction="egress"
                  rules={templatePreviewRules
                    .filter((r) => r.direction === 'egress')
                    .map((r) => ({
                      ...r,
                      policy_id: '',
                      provision_status: 'draft' as const,
                    }))}
                  onRulesChanged={() => {}}
                  readOnly
                />
              </VStack>
            </>
          )}
        </>
      ) : (
        <>
          {/* Zone 3: Ingress Rules */}
          <VStack gap={2}>
            <HStack gap={2} vAlign="center">
              <DirectionVisual direction="ingress" />
              <Heading level={2}>Ingress Rules</Heading>
            </HStack>
            <V2RuleTable
              policyId=""
              direction="ingress"
              rules={[]}
              onRulesChanged={() => {}}
              draftMode
              draftRules={ingressDraftRules}
              onDraftRulesChange={setIngressDraftRules}
            />
          </VStack>

          <Divider />

          {/* Zone 4: Egress Rules */}
          <VStack gap={2}>
            <HStack gap={2} vAlign="center">
              <DirectionVisual direction="egress" />
              <Heading level={2}>Egress Rules</Heading>
            </HStack>
            <V2RuleTable
              policyId=""
              direction="egress"
              rules={[]}
              onRulesChanged={() => {}}
              draftMode
              draftRules={egressDraftRules}
              onDraftRulesChange={setEgressDraftRules}
            />
          </VStack>
        </>
      )}

      <Divider />

      {/* Footer */}
      <HStack gap={2} hAlign="end">
        <Button
          label="Cancel"
          variant="ghost"
          onClick={() => navigate('/policy-v2')}
          isDisabled={submitting}
        />
        <Button
          label="Create Policy"
          variant="primary"
          onClick={handleSubmit}
          isDisabled={submitting}
          isLoading={submitting}
        />
      </HStack>
    </VStack>
  );
}
