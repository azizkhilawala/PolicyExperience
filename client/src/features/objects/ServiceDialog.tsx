import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Selector } from '@astryxdesign/core/Selector';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Banner } from '@astryxdesign/core/Banner';

import type { Service } from '../../api/objects.js';
import { createService, updateService } from '../../api/objects.js';

const PROTOCOL_OPTIONS = [
  { value: 'TCP', label: 'TCP' },
  { value: 'UDP', label: 'UDP' },
  { value: 'ICMP', label: 'ICMP' },
  { value: 'GRE', label: 'GRE' },
];

interface ServiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (service: Service) => void;
  service?: Service;
}

export function ServiceDialog({ isOpen, onClose, onSaved, service }: ServiceDialogProps) {
  const isEdit = !!service;
  const [name, setName] = useState('');
  const [port, setPort] = useState('');
  const [toPort, setToPort] = useState('');
  const [protocol, setProtocol] = useState('TCP');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(service?.name ?? '');
      setPort(service ? String(service.port) : '');
      setToPort(service?.to_port != null ? String(service.to_port) : '');
      setProtocol(service?.protocol ?? 'TCP');
      setDescription(service?.description ?? '');
      setSubmitting(false);
      setError(null);
    }
  }, [isOpen, service]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!port.trim() || isNaN(Number(port))) { setError('Port is required and must be a number'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const data = {
        name: name.trim(),
        port: Number(port),
        protocol,
        to_port: toPort.trim() ? Number(toPort) : null,
        description: description.trim(),
      };
      const result = isEdit
        ? await updateService(service!.id, data)
        : await createService(data);
      onSaved(result);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  }, [name, port, toPort, protocol, description, isEdit, service, onSaved, onClose]);

  return (
    <Dialog isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} purpose="form" width={480}>
      <DialogHeader title={isEdit ? 'Edit Service' : 'Create Service'} onOpenChange={(open) => { if (!open) onClose(); }} />
      <VStack gap={3} padding={4}>
        {error && <Banner status="error" title={error} isDismissable onDismiss={() => setError(null)} />}
        <FormLayout>
          <TextInput label="Name" value={name} onChange={setName} isRequired />
          <TextInput label="Port" value={port} onChange={setPort} isRequired />
          <TextInput label="Port Range End (optional)" value={toPort} onChange={setToPort} />
          <Selector label="Protocol" options={PROTOCOL_OPTIONS} value={protocol} onChange={setProtocol} />
          <TextArea label="Description" value={description} onChange={setDescription} isOptional rows={2} />
        </FormLayout>
      </VStack>
      <HStack padding={4} hAlign="end" gap={2}>
        <Button label="Cancel" variant="secondary" onClick={onClose} isDisabled={submitting} />
        <Button label={isEdit ? 'Save' : 'Create'} variant="primary" onClick={handleSubmit} isLoading={submitting} isDisabled={!name.trim() || !port.trim()} />
      </HStack>
    </Dialog>
  );
}
