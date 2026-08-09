import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Banner } from '@astryxdesign/core/Banner';

import type { ObjVirtualService } from '../../api/objects.js';
import { createVirtualService, updateVirtualService } from '../../api/objects.js';

const PROTOCOL_OPTIONS = [
  { value: 'TCP', label: 'TCP' },
  { value: 'UDP', label: 'UDP' },
];

interface VirtualServiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (virtualService: ObjVirtualService) => void;
  virtualService?: ObjVirtualService;
}

export function VirtualServiceDialog({
  isOpen,
  onClose,
  onSaved,
  virtualService,
}: VirtualServiceDialogProps) {
  const isEdit = !!virtualService;
  const [name, setName] = useState('');
  const [port, setPort] = useState('');
  const [protocol, setProtocol] = useState('TCP');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(virtualService?.name ?? '');
      setPort(virtualService ? String(virtualService.port) : '');
      setProtocol(virtualService?.protocol ?? 'TCP');
      setSubmitting(false);
      setError(null);
    }
  }, [isOpen, virtualService]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!port.trim() || isNaN(Number(port))) {
      setError('Port is required and must be a number');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const data = { name: name.trim(), port: Number(port), protocol };
      const result = isEdit
        ? await updateVirtualService(virtualService!.id, data)
        : await createVirtualService(data);
      onSaved(result);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  }, [name, port, protocol, isEdit, virtualService, onSaved, onClose]);

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      purpose="form"
      width={480}
    >
      <DialogHeader
        title={isEdit ? 'Edit Virtual Service' : 'Create Virtual Service'}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      />
      <VStack gap={3} padding={4}>
        {error && (
          <Banner status="error" title={error} isDismissable onDismiss={() => setError(null)} />
        )}
        <FormLayout>
          <TextInput label="Name" value={name} onChange={setName} isRequired />
          <TextInput label="Port" value={port} onChange={setPort} isRequired />
          <Selector
            label="Protocol"
            options={PROTOCOL_OPTIONS}
            value={protocol}
            onChange={setProtocol}
          />
        </FormLayout>
      </VStack>
      <HStack padding={4} hAlign="end" gap={2}>
        <Button label="Cancel" variant="secondary" onClick={onClose} isDisabled={submitting} />
        <Button
          label={isEdit ? 'Save' : 'Create'}
          variant="primary"
          onClick={handleSubmit}
          isLoading={submitting}
          isDisabled={!name.trim() || !port.trim()}
        />
      </HStack>
    </Dialog>
  );
}
