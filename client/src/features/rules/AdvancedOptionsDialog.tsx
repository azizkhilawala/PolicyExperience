import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';

import type { Rule } from '../../api/policies.js';
import { AdvancedOptions } from './AdvancedOptions.js';

interface AdvancedOptionsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  rule: Rule;
  onSave: (
    ruleId: string,
    data: { notes: string; logging: boolean; stateless: boolean },
  ) => Promise<void>;
}

export function AdvancedOptionsDialog({
  isOpen,
  onOpenChange,
  rule,
  onSave,
}: AdvancedOptionsDialogProps) {
  const [notes, setNotes] = useState(rule.notes ?? '');
  const [logging, setLogging] = useState(Boolean(rule.logging));
  const [stateless, setStateless] = useState(Boolean(rule.stateless));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNotes(rule.notes ?? '');
      setLogging(Boolean(rule.logging));
      setStateless(Boolean(rule.stateless));
    }
  }, [isOpen, rule.id, rule.notes, rule.logging, rule.stateless]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(rule.id, { notes, logging, stateless });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }, [rule.id, notes, logging, stateless, onSave, onOpenChange]);

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={480} purpose="form">
      <VStack gap={3} padding={3}>
        <DialogHeader
          title={`Advanced Options — Rule #${rule.position}`}
          onOpenChange={onOpenChange}
        />
        <AdvancedOptions
          notes={notes}
          onNotesChange={setNotes}
          logging={logging}
          onLoggingChange={setLogging}
          stateless={stateless}
          onStatelessChange={setStateless}
        />
        <HStack gap={1} hAlign="end">
          <Button
            label="Cancel"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            isDisabled={saving}
          />
          <Button label="Save" variant="primary" onClick={handleSave} isDisabled={saving} />
        </HStack>
      </VStack>
    </Dialog>
  );
}
