import { useState, useEffect, useRef } from 'react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Icon } from '@astryxdesign/core/Icon';

import { previewExpression, type ExpressionPreviewResult } from '../../api/label-mapping.js';

interface ExpressionEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const SNIPPETS = [
  { label: 'Namespace equals', code: 'namespace == "production"' },
  { label: 'Label exists', code: 'exists(k8s.labels["app"])' },
  { label: 'Label match', code: 'k8s.labels["app"] == "frontend"' },
  { label: 'Regex match', code: 'k8s.labels["app"] =~ "^api-"' },
  { label: 'Complex', code: 'namespace == "prod" AND k8s.labels["tier"] == "web"' },
];

export function ExpressionEditor({ value, onChange }: ExpressionEditorProps) {
  const [preview, setPreview] = useState<ExpressionPreviewResult | null>(null);
  const [validating, setValidating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!value.trim()) {
      setPreview(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setValidating(true);
      try {
        const result = await previewExpression(value);
        setPreview(result);
      } catch (e) {
        setPreview({ valid: false, error: e instanceof Error ? e.message : 'Validation failed' });
      }
      setValidating(false);
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  return (
    <VStack gap={2}>
      <Text weight="medium">Expression</Text>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder='e.g. namespace == "production" AND exists(k8s.labels["app"])'
        rows={4}
        style={{
          width: '100%',
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: 'var(--font-size-sm, 13px)',
          padding: 'var(--spacing-2, 8px)',
          borderRadius: 'var(--radius-md, 6px)',
          border: '1px solid var(--color-border-default, #d1d5db)',
          backgroundColor: 'var(--color-bg-subtle, #f9fafb)',
          color: 'var(--color-text-default, #111827)',
          resize: 'vertical',
        }}
      />

      <HStack gap={1} wrap="wrap">
        {SNIPPETS.map((s) => (
          <Button
            key={s.label}
            label={s.label}
            variant="ghost"
            size="sm"
            onClick={() => onChange(value ? `${value} AND ${s.code}` : s.code)}
          />
        ))}
      </HStack>

      {validating && <Text type="supporting">Validating…</Text>}

      {preview && !validating && (
        preview.valid ? (
          <HStack gap={1} vAlign="center">
            <Icon icon="success" color="success" />
            <Text type="supporting">
              Valid — matches {preview.matched_count} of {preview.total_workloads} workloads
            </Text>
          </HStack>
        ) : (
          <Banner status="error" title={preview.error ?? 'Invalid expression'} />
        )
      )}
    </VStack>
  );
}
