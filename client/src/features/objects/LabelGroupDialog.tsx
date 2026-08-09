import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Banner } from '@astryxdesign/core/Banner';
import { Token } from '@astryxdesign/core/Token';

import type { ObjLabelGroup } from '../../api/objects.js';
import { createLabelGroup, updateLabelGroup } from '../../api/objects.js';
import type { Label } from '../../api/labels.js';
import { useLabels } from '../../hooks/useLabels.js';

interface LabelGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (labelGroup: ObjLabelGroup) => void;
  labelGroup?: ObjLabelGroup;
}

export function LabelGroupDialog({ isOpen, onClose, onSaved, labelGroup }: LabelGroupDialogProps) {
  const isEdit = !!labelGroup;
  const allLabels = useLabels();
  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(labelGroup?.name ?? '');
      setSelectedIds(labelGroup?.label_ids ?? []);
      setSubmitting(false);
      setError(null);
    }
  }, [isOpen, labelGroup]);

  const labelOptions = allLabels
    .filter((l: Label) => !selectedIds.includes(l.id))
    .map((l: Label) => ({ value: l.id, label: `${l.key}=${l.value}` }));

  const handleAddLabel = useCallback(
    (labelId: string) => {
      if (labelId && !selectedIds.includes(labelId)) {
        setSelectedIds((prev) => [...prev, labelId]);
      }
    },
    [selectedIds],
  );

  const handleRemoveLabel = useCallback((labelId: string) => {
    setSelectedIds((prev) => prev.filter((id) => id !== labelId));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (selectedIds.length === 0) {
      setError('At least one label is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const data = { name: name.trim(), label_ids: selectedIds };
      const result = isEdit
        ? await updateLabelGroup(labelGroup!.id, data)
        : await createLabelGroup(data);
      onSaved(result);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  }, [name, selectedIds, isEdit, labelGroup, onSaved, onClose]);

  const resolveLabelName = (id: string): string => {
    const label = allLabels.find((l: Label) => l.id === id);
    return label ? `${label.key}=${label.value}` : id;
  };

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
        title={isEdit ? 'Edit Label Group' : 'Create Label Group'}
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
          <Selector
            label="Add Label"
            options={labelOptions}
            value=""
            onChange={handleAddLabel}
            placeholder="Select a label…"
          />
        </FormLayout>
        {selectedIds.length > 0 && (
          <HStack gap={0.5} wrap="wrap">
            {selectedIds.map((id) => (
              <Token
                key={id}
                label={resolveLabelName(id)}
                color="purple"
                size="sm"
                onRemove={() => handleRemoveLabel(id)}
              />
            ))}
          </HStack>
        )}
      </VStack>
      <HStack padding={4} hAlign="end" gap={2}>
        <Button label="Cancel" variant="secondary" onClick={onClose} isDisabled={submitting} />
        <Button
          label={isEdit ? 'Save' : 'Create'}
          variant="primary"
          onClick={handleSubmit}
          isLoading={submitting}
          isDisabled={!name.trim() || selectedIds.length === 0}
        />
      </HStack>
    </Dialog>
  );
}
