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
import { Banner } from '@astryxdesign/core/Banner';

import { createV2Policy, type V2Policy } from '../../api/v2-policies.js';
import { fetchClusters, fetchNamespaces } from '../../api/policies.js';
import type { K8sCluster, K8sNamespace } from '../../api/policies.js';
import { apiFetch } from '../../api/client.js';

interface CreateV2PolicyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (policy: V2Policy) => void;
}

export function CreateV2PolicyDialog({ isOpen, onClose, onCreated }: CreateV2PolicyDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scopeType, setScopeType] = useState<string>('k8s');

  const [clusters, setClusters] = useState<K8sCluster[]>([]);
  const [namespaces, setNamespaces] = useState<K8sNamespace[]>([]);
  const [labelOptions, setLabelOptions] = useState<MultiSelectorOptionData[]>([]);

  const [selectedClusterIds, setSelectedClusterIds] = useState<string[]>([]);
  const [selectedNamespaceIds, setSelectedNamespaceIds] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setName('');
    setDescription('');
    setScopeType('k8s');
    setClusters([]);
    setNamespaces([]);
    setLabelOptions([]);
    setSelectedClusterIds([]);
    setSelectedNamespaceIds([]);
    setSelectedLabels([]);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  useEffect(() => {
    if (isOpen) {
      fetchClusters()
        .then(setClusters)
        .catch(() => {});
    }
  }, [isOpen]);

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

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      setError('Policy name is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const scopeLabels = selectedLabels.map((kv) => {
        const eqIdx = kv.indexOf('=');
        return { key: kv.slice(0, eqIdx), value: kv.slice(eqIdx + 1) };
      });
      const policy = await createV2Policy({
        name: name.trim(),
        description: description.trim(),
        scope_type: scopeType as V2Policy['scope_type'],
        scope_cluster_ids: scopeType === 'k8s' ? selectedClusterIds : [],
        scope_namespace_ids: scopeType === 'k8s' ? selectedNamespaceIds : [],
        scope_labels: scopeType === 'k8s' ? scopeLabels : [],
      });
      resetForm();
      onCreated(policy);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create policy');
    } finally {
      setSubmitting(false);
    }
  }, [name, description, scopeType, selectedClusterIds, selectedNamespaceIds, selectedLabels, onCreated, resetForm]);

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      purpose="form"
      width={700}
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

        <FormLayout>
          <TextInput
            label="Policy Name"
            value={name}
            onChange={setName}
            placeholder="e.g. Payments Frontend Access"
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

        <VStack gap={2}>
          <RadioList label="Scope" value={scopeType} onChange={setScopeType}>
            <RadioListItem
              label="All Workloads"
              value="all_workloads"
              description="Policy applies to every workload"
            />
            <RadioListItem
              label="Labels"
              value="labels"
              description="Select labels to define scope"
              isDisabled
            />
            <RadioListItem
              label="Kubernetes"
              value="k8s"
              description="Select clusters, namespaces, and labels"
            />
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
