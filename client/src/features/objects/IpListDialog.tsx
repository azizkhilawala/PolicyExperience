import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Banner } from '@astryxdesign/core/Banner';

import type { ObjIpList } from '../../api/objects.js';
import { createIpList, updateIpList } from '../../api/objects.js';

interface IpListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (ipList: ObjIpList) => void;
  ipList?: ObjIpList;
}

export function IpListDialog({ isOpen, onClose, onSaved, ipList }: IpListDialogProps) {
  const isEdit = !!ipList;
  const [name, setName] = useState('');
  const [cidr, setCidr] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(ipList?.name ?? '');
      setCidr(ipList?.cidr ?? '');
      setDescription(ipList?.description ?? '');
      setSubmitting(false);
      setError(null);
    }
  }, [isOpen, ipList]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!cidr.trim()) {
      setError('CIDR is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const data = { name: name.trim(), cidr: cidr.trim(), description: description.trim() };
      const result = isEdit ? await updateIpList(ipList!.id, data) : await createIpList(data);
      onSaved(result);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  }, [name, cidr, description, isEdit, ipList, onSaved, onClose]);

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
        title={isEdit ? 'Edit IP List' : 'Create IP List'}
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
          <TextInput
            label="CIDR"
            value={cidr}
            onChange={setCidr}
            isRequired
            placeholder="10.0.0.0/8"
          />
          <TextArea
            label="Description"
            value={description}
            onChange={setDescription}
            isOptional
            rows={2}
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
          isDisabled={!name.trim() || !cidr.trim()}
        />
      </HStack>
    </Dialog>
  );
}
