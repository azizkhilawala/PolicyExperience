import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { TextArea } from '@astryxdesign/core/TextArea';
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList';
import { MultiSelector } from '@astryxdesign/core/MultiSelector';
import type { MultiSelectorOptionData } from '@astryxdesign/core/MultiSelector';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';

import { createPolicy, fetchClusters, fetchNamespaces, type Policy, type PolicyLabel } from '../../api/policies.js';
import type { K8sCluster, K8sNamespace } from '../../api/policies.js';
import { createV2Policy, type V2Policy } from '../../api/v2-policies.js';
import { apiFetch } from '../../api/client.js';
import { ScopeSearch } from '../../components/ScopeSearch.js';
import { useSettings } from '../../hooks/useSettings.js';

function deriveType(scope: PolicyLabel[]): 'organizational' | 'application' {
  if (scope.length === 0) return 'organizational';
  return 'application';
}

interface CreatePolicyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (policy: Policy) => void;
  onCreatedV2?: (policy: V2Policy) => void;
}

export function CreatePolicyDialog({ isOpen, onClose, onCreated, onCreatedV2 }: CreatePolicyDialogProps) {
  const { settings } = useSettings();
  const scopesEnabled = settings.display_scopes_in_policies !== 'false';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scopeChoice, setScopeChoice] = useState<string>('selected');
  const [scopeLabels, setScopeLabels] = useState<PolicyLabel[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // K8s scope state
  const [clusters, setClusters] = useState<K8sCluster[]>([]);
  const [namespaces, setNamespaces] = useState<K8sNamespace[]>([]);
  const [labelOptions, setLabelOptions] = useState<MultiSelectorOptionData[]>([]);
  const [selectedClusterIds, setSelectedClusterIds] = useState<string[]>([]);
  const [selectedNamespaceIds, setSelectedNamespaceIds] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  const resetForm = useCallback(() => {
    setName('');
    setDescription('');
    setScopeChoice('selected');
    setScopeLabels([]);
    setSelectedClusterIds([]);
    setSelectedNamespaceIds([]);
    setSelectedLabels([]);
    setLabelOptions([]);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  useEffect(() => {
    if (isOpen && scopeChoice === 'k8s' && clusters.length === 0) {
      fetchClusters()
        .then(setClusters)
        .catch(() => {});
    }
  }, [isOpen, scopeChoice, clusters.length]);

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
          const res = await apiFetch<
            { data: Array<{ labels: Array<{ key: string; value: string }> }> }
          >(`/api/workloads?namespace_id=${nsId}&limit=100`);
          for (const wl of res.data) {
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

  const isK8s = scopeChoice === 'k8s';
  const effectiveScope = scopesEnabled && scopeChoice === 'selected' ? scopeLabels : [];
  const derivedType = deriveType(effectiveScope);
  const typeLabel = derivedType === 'organizational' ? 'Organizational' : 'Application';

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      setError('Policy name is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (isK8s) {
        const k8sLabels = selectedLabels.map((kv) => {
          const eqIdx = kv.indexOf('=');
          return { key: kv.slice(0, eqIdx), value: kv.slice(eqIdx + 1) };
        });
        const policy = await createV2Policy({
          name: name.trim(),
          description: description.trim(),
          scope_type: 'k8s',
          scope_cluster_ids: selectedClusterIds,
          scope_namespace_ids: selectedNamespaceIds,
          scope_labels: k8sLabels,
        });
        resetForm();
        onCreatedV2?.(policy);
      } else {
        const policy = await createPolicy({
          name: name.trim(),
          description: description.trim(),
          scope: effectiveScope,
          type: derivedType,
        });
        resetForm();
        onCreated(policy);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create policy');
    } finally {
      setSubmitting(false);
    }
  }, [name, description, isK8s, selectedClusterIds, selectedNamespaceIds, selectedLabels, effectiveScope, derivedType, onCreated, onCreatedV2, resetForm]);

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      purpose="form"
      width={isK8s ? 700 : 600}
    >
      <DialogHeader
        title="Create Policy"
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      />

      <VStack gap={3} padding={4}>
        {error && (
          <Banner status="error" title={error} isDismissable onDismiss={() => setError(null)} />
        )}

        {!scopesEnabled && (
          <Banner status="info" title="Scopes are hidden by tenant configuration." />
        )}

        <FormLayout>
          <TextInput
            label="Policy Name"
            value={name}
            onChange={setName}
            placeholder="e.g. HRM Production Access"
            isRequired
          />

          <TextArea
            label="Description"
            value={description}
            onChange={setDescription}
            placeholder="Optional description…"
            isOptional
            rows={2}
          />
        </FormLayout>

        {scopesEnabled && (
          <VStack gap={2}>
            <RadioList label="Scope" value={scopeChoice} onChange={setScopeChoice}>
              <RadioListItem
                label="Selected scope"
                value="selected"
                description="Choose specific labels to define this policy's scope"
              />
              <RadioListItem
                label="All workloads"
                value="all"
                description="Policy applies to all workloads (Organizational)"
              />
              <RadioListItem
                label="Kubernetes"
                value="k8s"
                description="Select clusters, namespaces, and labels"
              />
            </RadioList>

            {scopeChoice === 'selected' && (
              <ScopeSearch labels={scopeLabels} onChange={setScopeLabels} />
            )}

            {scopeChoice === 'all' && (
              <Banner
                status="warning"
                title="This policy will apply to all workloads in your environment."
              />
            )}

            {scopeChoice === 'k8s' && (
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
        )}

        {!isK8s && (
          <HStack vAlign="center" gap={1}>
            <Text type="supporting">Policy type:</Text>
            <Text weight="medium">{typeLabel}</Text>
          </HStack>
        )}
      </VStack>

      <HStack padding={4} hAlign="end" gap={2}>
        <Button label="Cancel" variant="secondary" onClick={handleClose} isDisabled={submitting} />
        <Button
          label="Create Draft"
          variant="primary"
          onClick={handleSubmit}
          isLoading={submitting}
        />
      </HStack>
    </Dialog>
  );
}
