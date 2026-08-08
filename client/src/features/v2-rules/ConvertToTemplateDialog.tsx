import { useState, useCallback } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { TextArea } from '@astryxdesign/core/TextArea';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Banner } from '@astryxdesign/core/Banner';

import { apiFetch } from '../../api/client.js';
import type { V2Policy } from '../../api/v2-policies.js';

interface ConvertToTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  policy: V2Policy;
  onConverted: () => void;
}

export function ConvertToTemplateDialog({ isOpen, onClose, policy, onConverted }: ConvertToTemplateDialogProps) {
  const [templateName, setTemplateName] = useState(`${policy.name} Template`);
  const [templateDescription, setTemplateDescription] = useState('');
  const [convertPolicy, setConvertPolicy] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!templateName.trim()) { setError('Template name is required'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/api/v2/policies/${policy.id}/convert-to-template`, {
        method: 'POST',
        body: JSON.stringify({
          template_name: templateName.trim(),
          template_description: templateDescription.trim(),
          convert_policy: convertPolicy,
        }),
      });
      onConverted();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Conversion failed');
    } finally {
      setSubmitting(false);
    }
  }, [policy.id, templateName, templateDescription, convertPolicy, onConverted, onClose]);

  return (
    <Dialog isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} purpose="form" width={520}>
      <DialogHeader title="Convert to Template" onOpenChange={(open) => { if (!open) onClose(); }} />
      <VStack gap={3} padding={4}>
        {error && <Banner status="error" title={error} isDismissable onDismiss={() => setError(null)} />}
        <FormLayout>
          <TextInput label="Template Name" value={templateName} onChange={setTemplateName} isRequired />
          <TextArea label="Description" value={templateDescription} onChange={setTemplateDescription} isOptional rows={2} />
          <CheckboxInput label="Convert this policy to a guardrail referencing the new template" value={convertPolicy} onChange={(checked) => setConvertPolicy(checked)} />
        </FormLayout>
      </VStack>
      <HStack padding={4} hAlign="end" gap={2}>
        <Button label="Cancel" variant="secondary" onClick={onClose} isDisabled={submitting} />
        <Button label="Convert" variant="primary" onClick={handleSubmit} isLoading={submitting} isDisabled={!templateName.trim()} />
      </HStack>
    </Dialog>
  );
}
