import { useState, useEffect } from 'react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Button } from '@astryxdesign/core/Button';
import { Selector } from '@astryxdesign/core/Selector';
import { Text } from '@astryxdesign/core/Text';
import { fetchLabels, type Label } from '../../api/labels.js';

interface WorkloadLabelEditorProps {
  labels: Array<{ key: string; value: string }>;
  onSave: (labels: Array<{ key: string; value: string }>) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export function WorkloadLabelEditor({
  labels: initialLabels,
  onSave,
  onCancel,
  isSaving,
}: WorkloadLabelEditorProps) {
  const [labels, setLabels] = useState(initialLabels);
  const [allLabels, setAllLabels] = useState<Label[]>([]);

  useEffect(() => {
    fetchLabels().then(setAllLabels).catch(() => {});
  }, []);

  const dimensions = [...new Set(allLabels.map((l) => l.key))].sort();
  const usedDimensions = new Set(labels.map((l) => l.key));
  const availableDimensions = dimensions.filter((d) => !usedDimensions.has(d));

  function updateLabel(index: number, value: string) {
    const updated = [...labels];
    updated[index] = { ...updated[index], value };
    setLabels(updated);
  }

  function removeLabel(index: number) {
    setLabels(labels.filter((_, i) => i !== index));
  }

  function addLabel(key: string) {
    const values = allLabels.filter((l) => l.key === key);
    if (values.length > 0) {
      setLabels([...labels, { key, value: values[0].value }]);
    }
  }

  return (
    <VStack gap={2}>
      {labels.map((label, i) => (
        <HStack key={label.key} gap={1} vAlign="center">
          <Text weight="medium" style={{ minWidth: 80 }}>
            {label.key}
          </Text>
          <Selector
            label={label.key}
            options={allLabels
              .filter((l) => l.key === label.key)
              .map((l) => ({ value: l.value, label: l.value }))}
            value={label.value}
            onChange={(v) => updateLabel(i, v)}
          />
          <Button
            label="Remove"
            variant="tertiary"
            size="sm"
            onClick={() => removeLabel(i)}
          />
        </HStack>
      ))}

      {availableDimensions.length > 0 && (
        <Selector
          label="Add label dimension"
          options={availableDimensions.map((d) => ({ value: d, label: d }))}
          value=""
          onChange={(v) => addLabel(v)}
        />
      )}

      <HStack gap={1}>
        <Button
          label="Save Labels"
          variant="primary"
          size="sm"
          onClick={() => onSave(labels)}
          isLoading={isSaving}
        />
        <Button
          label="Cancel"
          variant="secondary"
          size="sm"
          onClick={onCancel}
          isDisabled={isSaving}
        />
      </HStack>
    </VStack>
  );
}
