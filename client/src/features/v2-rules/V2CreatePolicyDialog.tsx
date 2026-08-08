import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { TextArea } from '@astryxdesign/core/TextArea';
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList';
import { Selector } from '@astryxdesign/core/Selector';
import { MultiSelector } from '@astryxdesign/core/MultiSelector';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { StackItem } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';

import { createV2Policy, type V2Policy } from '../../api/v2-policies.js';
import { fetchClusters, fetchNamespaces, type K8sCluster, type K8sNamespace } from '../../api/policies.js';
import { apiFetch } from '../../api/client.js';

interface V2CreatePolicyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (policy: V2Policy) => void;
}

export function V2CreatePolicyDialog({ isOpen, onClose, onCreated }: V2CreatePolicyDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [scopeType, setScopeType] = useState<string>('k8s');

  // K8s scope state
  const [clusters, setClusters] = useState<K8sCluster[]>([]);
  const [namespaces, setNamespaces] = useState<K8sNamespace[]>([]);
  const [availableLabels, setAvailableLabels] = useState<Array<{ value: string; label: string }>>([]);
  const [selectedCluster, setSelectedCluster] = useState<string>('');
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  // Step 2 state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch clusters on open
  useEffect(() => {
    if (isOpen) fetchClusters().then(setClusters).catch(() => {});
  }, [isOpen]);

  // Fetch namespaces when cluster changes
  useEffect(() => {
    if (selectedCluster) {
      fetchNamespaces(selectedCluster).then(setNamespaces).catch(() => {});
      setSelectedNamespace('');
      setSelectedLabels([]);
      setAvailableLabels([]);
    }
  }, [selectedCluster]);

  // Fetch workload labels when namespace changes
  useEffect(() => {
    if (selectedNamespace) {
      apiFetch<Array<{ labels: Array<{ key: string; value: string }> }>>(
        `/api/workloads?namespace_id=${selectedNamespace}`
      )
        .then((workloads) => {
          const seen = new Set<string>();
          const labels: Array<{ value: string; label: string }> = [];
          for (const w of workloads) {
            for (const l of (w.labels ?? [])) {
              const k = `${l.key}=${l.value}`;
              if (!seen.has(k)) {
                seen.add(k);
                labels.push({ value: k, label: k });
              }
            }
          }
          labels.sort((a, b) => a.label.localeCompare(b.label));
          setAvailableLabels(labels);
        })
        .catch(() => {});
      setSelectedLabels([]);
    }
  }, [selectedNamespace]);

  const resetForm = useCallback(() => {
    setStep(1);
    setScopeType('k8s');
    setSelectedCluster('');
    setSelectedNamespace('');
    setSelectedLabels([]);
    setNamespaces([]);
    setAvailableLabels([]);
    setName('');
    setDescription('');
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const canProceedStep1 =
    scopeType === 'all_workloads' ||
    (scopeType === 'k8s' && !!selectedCluster && !!selectedNamespace);

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
        const key = eqIdx >= 0 ? kv.slice(0, eqIdx) : kv;
        const value = eqIdx >= 0 ? kv.slice(eqIdx + 1) : '';
        return { key, value };
      });
      const policy = await createV2Policy({
        name: name.trim(),
        description: description.trim(),
        scope_type: scopeType as V2Policy['scope_type'],
        scope_cluster_ids: scopeType === 'k8s' && selectedCluster ? [selectedCluster] : undefined,
        scope_namespace_ids: scopeType === 'k8s' && selectedNamespace ? [selectedNamespace] : undefined,
        scope_labels: scopeType === 'k8s' ? scopeLabels : [],
      });
      resetForm();
      onCreated(policy);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create policy');
    } finally {
      setSubmitting(false);
    }
  }, [name, description, scopeType, selectedCluster, selectedNamespace, selectedLabels, onCreated, resetForm]);

  const clusterOptions = clusters.map((c) => ({ value: c.id, label: c.name }));
  const namespaceOptions = namespaces.map((ns) => ({ value: ns.id, label: ns.name }));

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) handleClose(); }}
      purpose="form"
      width={720}
    >
      <DialogHeader
        title={step === 1 ? 'Create Policy — Select Scope' : 'Create Policy — Details'}
        onOpenChange={(open) => { if (!open) handleClose(); }}
      />

      <VStack gap={3} padding={4}>
        {error && (
          <Banner status="error" title={error} isDismissable onDismiss={() => setError(null)} />
        )}

        {step === 1 && (
          <VStack gap={3}>
            <RadioList label="Policy Scope" value={scopeType} onChange={setScopeType}>
              <RadioListItem
                label="All Workloads"
                value="all_workloads"
                description="Baseline rules apply everywhere"
              />
              <RadioListItem
                label="Specific Labels / Groups"
                value="labels"
                description="Coming soon — scope by App + Env labels, label groups"
                isDisabled
              />
              <RadioListItem
                label="Kubernetes Cluster / Namespace"
                value="k8s"
                description="Scope by cluster, namespace, and K8s labels"
              />
            </RadioList>

            {scopeType === 'labels' && (
              <Banner
                status="info"
                title="Label-based scoping is coming soon. Select Kubernetes for this build."
              />
            )}

            {scopeType === 'k8s' && (
              <HStack gap={2} vAlign="start">
                <StackItem size="fill">
                  <Selector
                    label="Cluster"
                    options={clusterOptions}
                    value={selectedCluster}
                    onChange={setSelectedCluster}
                    placeholder="Select cluster…"
                  />
                </StackItem>
                <StackItem size="fill">
                  <Selector
                    label="Namespace"
                    options={namespaceOptions}
                    value={selectedNamespace}
                    onChange={setSelectedNamespace}
                    placeholder="Select namespace…"
                    isDisabled={!selectedCluster}
                  />
                </StackItem>
                <StackItem size="fill">
                  <MultiSelector
                    label="K8s Labels"
                    options={availableLabels}
                    value={selectedLabels}
                    onChange={setSelectedLabels}
                    placeholder="Select labels…"
                    isDisabled={!selectedNamespace}
                    triggerDisplay="badges"
                    isOptional
                  />
                </StackItem>
              </HStack>
            )}
          </VStack>
        )}

        {step === 2 && (
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
        )}
      </VStack>

      <HStack padding={4} hAlign="end" gap={2}>
        {step === 1 ? (
          <>
            <Button label="Cancel" variant="secondary" onClick={handleClose} />
            <Button
              label="Next"
              variant="primary"
              onClick={() => setStep(2)}
              isDisabled={!canProceedStep1}
            />
          </>
        ) : (
          <>
            <Button label="Back" variant="secondary" onClick={() => setStep(1)} isDisabled={submitting} />
            <Button
              label="Create Policy"
              variant="primary"
              onClick={handleSubmit}
              isLoading={submitting}
              isDisabled={!name.trim()}
            />
          </>
        )}
      </HStack>
    </Dialog>
  );
}
