import { useState, useCallback } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { TextArea } from '@astryxdesign/core/TextArea';
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';

import { createPolicy, type Policy, type PolicyLabel } from '../../api/policies.js';
import { ScopeSearch } from '../../components/ScopeSearch.js';
import { useSettings } from '../../hooks/useSettings.js';

function deriveType(scope: PolicyLabel[]): 'organizational' | 'application' {
  if (scope.length === 0) return 'organizational';
  const hasAppOrRole = scope.some((l) => l.key === 'app' || l.key === 'role');
  return hasAppOrRole ? 'application' : 'organizational';
}

interface CreatePolicyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (policy: Policy) => void;
}

export function CreatePolicyDialog({ isOpen, onClose, onCreated }: CreatePolicyDialogProps) {
  const { settings } = useSettings();
  const scopesEnabled = settings.display_scopes_in_policies !== 'false';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scopeChoice, setScopeChoice] = useState<string>('selected');
  const [scopeLabels, setScopeLabels] = useState<PolicyLabel[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setName('');
    setDescription('');
    setScopeChoice('selected');
    setScopeLabels([]);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

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
      const policy = await createPolicy({
        name: name.trim(),
        description: description.trim(),
        scope: effectiveScope,
        type: derivedType,
      });
      resetForm();
      onCreated(policy);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create policy');
    } finally {
      setSubmitting(false);
    }
  }, [name, description, effectiveScope, derivedType, onCreated, resetForm]);

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) handleClose(); }}
      purpose="form"
      width={600}
    >
      <DialogHeader
        title="Create Policy"
        onOpenChange={(open) => { if (!open) handleClose(); }}
      />

      <VStack gap={3} padding={4}>
        {error && (
          <Banner
            status="error"
            title={error}
            isDismissable
            onDismiss={() => setError(null)}
          />
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
            <RadioList
              label="Scope"
              value={scopeChoice}
              onChange={setScopeChoice}
            >
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
          </VStack>
        )}

        <HStack vAlign="center" gap={1}>
          <Text type="supporting">Policy type:</Text>
          <Text weight="medium">{typeLabel}</Text>
        </HStack>
      </VStack>

      <HStack padding={4} hAlign="end" gap={2}>
        <Button
          label="Cancel"
          variant="secondary"
          onClick={handleClose}
          isDisabled={submitting}
        />
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
