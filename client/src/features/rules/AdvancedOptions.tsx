import { FormLayout } from '@astryxdesign/core/FormLayout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Switch } from '@astryxdesign/core/Switch';

interface AdvancedOptionsProps {
  notes: string;
  onNotesChange: (value: string) => void;
  logging: boolean;
  onLoggingChange: (value: boolean) => void;
  stateless: boolean;
  onStatelessChange: (value: boolean) => void;
}

export function AdvancedOptions({
  notes,
  onNotesChange,
  logging,
  onLoggingChange,
  stateless,
  onStatelessChange,
}: AdvancedOptionsProps) {
  return (
    <FormLayout>
      <TextInput
        label="Notes"
        value={notes}
        onChange={onNotesChange}
        placeholder="Optional rule note…"
        isOptional
      />
      <Switch
        label="Enable logging"
        value={logging}
        onChange={onLoggingChange}
      />
      <Switch
        label="Stateless connection"
        value={stateless}
        onChange={onStatelessChange}
      />
    </FormLayout>
  );
}
