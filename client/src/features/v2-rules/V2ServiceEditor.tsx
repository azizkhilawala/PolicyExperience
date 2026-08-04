import { useState, useEffect, useCallback } from 'react';
import { Selector } from '@astryxdesign/core/Selector';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Token } from '@astryxdesign/core/Token';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';

import type { V2RuleService } from '../../api/v2-policies.js';
import type { VirtualService } from '../../api/policies.js';
import { fetchVirtualServices } from '../../api/policies.js';

interface V2ServiceEditorProps {
  value: V2RuleService[];
  onChange: (services: V2RuleService[]) => void;
  isDisabled?: boolean;
}

const PROTOCOL_OPTIONS = [
  { value: 'TCP', label: 'TCP' },
  { value: 'UDP', label: 'UDP' },
];

function serviceLabel(s: V2RuleService): string {
  if (s.type === 'named') return s.name;
  return `${s.protocol}/${s.port}`;
}

export function V2ServiceEditor({ value, onChange, isDisabled }: V2ServiceEditorProps) {
  const [mode, setMode] = useState<'pick' | 'custom'>('pick');
  const [virtualServices, setVirtualServices] = useState<VirtualService[]>([]);
  const [protocol, setProtocol] = useState<string>('TCP');
  const [port, setPort] = useState<string>('');

  useEffect(() => {
    fetchVirtualServices().then(setVirtualServices).catch(() => {});
  }, []);

  const selectorOptions = [
    { value: 'all', label: 'All Services' },
    ...virtualServices.map((vs) => ({
      value: vs.id,
      label: `${vs.name} (TCP/${vs.port})`,
    })),
    { type: 'divider' as const },
    { value: '__custom__', label: 'Add custom port…' },
  ];

  const handleSelectorChange = useCallback(
    (selectedValue: string) => {
      if (selectedValue === '__custom__') {
        setMode('custom');
        return;
      }
      if (selectedValue === 'all') {
        onChange([...value, { type: 'named', name: 'All Services' }]);
        return;
      }
      const vs = virtualServices.find((v) => v.id === selectedValue);
      if (vs) {
        onChange([...value, { type: 'named', name: vs.name }]);
      }
    },
    [value, onChange, virtualServices]
  );

  const handleAddCustom = useCallback(() => {
    if (!port.trim()) return;
    onChange([...value, { type: 'port', protocol, port: port.trim() }]);
    setPort('');
    setMode('pick');
  }, [value, onChange, protocol, port]);

  const handleCancelCustom = useCallback(() => {
    setPort('');
    setProtocol('TCP');
    setMode('pick');
  }, []);

  const handleRemove = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange]
  );

  return (
    <VStack gap={1}>
      {value.length > 0 && (
        <HStack gap={0.5} wrap="wrap">
          {value.map((s, i) => (
            <Token
              key={i}
              label={serviceLabel(s)}
              color="default"
              size="sm"
              onRemove={isDisabled ? undefined : () => handleRemove(i)}
            />
          ))}
        </HStack>
      )}

      {mode === 'pick' ? (
        <Selector
          label="Add service"
          isLabelHidden
          options={selectorOptions}
          value=""
          onChange={handleSelectorChange}
          placeholder="Add service…"
          size="sm"
          isDisabled={isDisabled}
        />
      ) : (
        <HStack gap={1} vAlign="end">
          <Selector
            label="Protocol"
            isLabelHidden
            options={PROTOCOL_OPTIONS}
            value={protocol}
            onChange={setProtocol}
            size="sm"
          />
          <TextInput
            label="Port"
            isLabelHidden
            value={port}
            onChange={setPort}
            placeholder="e.g. 443"
            size="sm"
          />
          <Button label="Add" variant="primary" size="sm" onClick={handleAddCustom} />
          <Button label="Cancel" variant="ghost" size="sm" onClick={handleCancelCustom} />
        </HStack>
      )}
    </VStack>
  );
}
