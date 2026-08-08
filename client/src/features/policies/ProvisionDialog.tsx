import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Button } from '@astryxdesign/core/Button';
import { Text } from '@astryxdesign/core/Text';
import { Token } from '@astryxdesign/core/Token';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Banner } from '@astryxdesign/core/Banner';
import { Divider } from '@astryxdesign/core/Divider';
import { useToast } from '@astryxdesign/core/Toast';

import {
  provisionPreview,
  provisionCommit,
  type ProvisionDiff,
  type ProvisionDiffRule,
  type RuleEndpoint,
} from '../../api/policies.js';
import { ProductIcon } from '../../components/ProductVisuals.js';
import { getFilterColor, getDisplayValue } from '../rules/endpointDisplay.js';

interface ProvisionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  policyId: string;
  onProvisioned: () => void;
}

function EndpointTokens({ endpoint }: { endpoint?: RuleEndpoint }) {
  if (!endpoint?.filters || endpoint.filters.length === 0) {
    return <Text type="supporting">Any</Text>;
  }
  return (
    <HStack gap={1} wrap="wrap">
      {endpoint.filters.map((f, i) => (
        <Token key={i} label={getDisplayValue(f)} color={getFilterColor(f.field)} size="sm" />
      ))}
    </HStack>
  );
}

function RuleSummary({ rule }: { rule: ProvisionDiffRule }) {
  const services = rule.services ?? [];

  return (
    <HStack gap={2} vAlign="center" wrap="wrap">
      <EndpointTokens endpoint={rule.source} />
      <ProductIcon name="arrowRight" size="sm" color="tertiary" />
      <EndpointTokens endpoint={rule.destination} />
      {services.length > 0 && (
        <>
          <Text type="supporting">on</Text>
          <HStack gap={1} wrap="wrap">
            {services.map((s, i) => (
              <Token
                key={i}
                label={s.port ? `${s.protocol}/${s.port}` : s.protocol}
                color="gray"
                size="sm"
              />
            ))}
          </HStack>
        </>
      )}
      <Token
        label={rule.action.toUpperCase()}
        color={rule.action === 'allow' ? 'green' : 'red'}
        size="sm"
      />
    </HStack>
  );
}

export function ProvisionDialog({ isOpen, onOpenChange, policyId, onProvisioned }: ProvisionDialogProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [diff, setDiff] = useState<ProvisionDiff | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    setDiff(null);
    try {
      const result = await provisionPreview(policyId);
      setDiff(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load provision preview');
    } finally {
      setLoading(false);
    }
  }, [isOpen, policyId]);

  useEffect(() => {
    if (isOpen) {
      void loadPreview();
    }
  }, [isOpen, loadPreview]);

  const handleClose = useCallback(() => {
    if (!committing) {
      onOpenChange(false);
    }
  }, [committing, onOpenChange]);

  const handleProvision = useCallback(async () => {
    setCommitting(true);
    setError(null);
    try {
      await provisionCommit(policyId);
      toast({
        body: 'Policy provisioned successfully.',
        type: 'info',
        isAutoHide: true,
        uniqueID: `provision-success-${policyId}`,
      });
      onProvisioned();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Provisioning failed');
    } finally {
      setCommitting(false);
    }
  }, [policyId, onProvisioned, toast]);

  const totalChanges = diff
    ? diff.added.length + diff.modified.length + diff.removed.length
    : 0;

  return (
    <Dialog isOpen={isOpen} onOpenChange={handleClose} purpose="form" width={640}>
      <DialogHeader title="Provision Policy" onOpenChange={handleClose} />

      <VStack gap={3} padding={4}>
        {error && (
          <Banner
            status="error"
            title={error}
            isDismissable
            onDismiss={() => setError(null)}
          />
        )}

        {loading && (
          <HStack hAlign="center" padding={4}>
            <Spinner label="Loading diff…" size="md" />
          </HStack>
        )}

        {!loading && diff && totalChanges === 0 && (
          <Banner status="info" title="No changes to provision. The policy is already up to date." />
        )}

        {!loading && diff && totalChanges > 0 && (
          <VStack gap={3}>
            <Text type="supporting">
              Review the following changes before provisioning. This action cannot be undone.
            </Text>

            {diff.added.length > 0 && (
              <VStack gap={2}>
                <HStack gap={1} vAlign="center">
                  <ProductIcon name="add" size="sm" color="success" />
                  <Text weight="medium" style={{ color: 'var(--color-positive)' }}>
                    Added ({diff.added.length})
                  </Text>
                </HStack>
                <VStack gap={1}>
                  {diff.added.map((rule) => (
                    <HStack key={rule.id} gap={2} vAlign="center" padding={2} style={{
                      background: 'var(--color-surface-positive)',
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      <ProductIcon name="add" size="sm" color="success" label="Added rule" />
                      <Text type="supporting" style={{ minWidth: 24 }}>#{rule.position}</Text>
                      <RuleSummary rule={rule} />
                    </HStack>
                  ))}
                </VStack>
              </VStack>
            )}

            {diff.added.length > 0 && (diff.modified.length > 0 || diff.removed.length > 0) && (
              <Divider />
            )}

            {diff.modified.length > 0 && (
              <VStack gap={2}>
                <HStack gap={1} vAlign="center">
                  <ProductIcon name="modified" size="sm" color="warning" />
                  <Text weight="medium" style={{ color: 'var(--color-warning)' }}>
                    Modified ({diff.modified.length})
                  </Text>
                </HStack>
                <VStack gap={1}>
                  {diff.modified.map(({ before, after }) => (
                    <VStack key={after.id} gap={0} padding={2} style={{
                      background: 'var(--color-surface-warning)',
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      <HStack gap={2} vAlign="center">
                        <ProductIcon name="modified" size="sm" color="warning" label="Modified rule" />
                        <Text type="supporting" style={{ minWidth: 24 }}>#{before.position}</Text>
                        <VStack gap={0} style={{ opacity: 0.6, textDecoration: 'line-through' }}>
                          <RuleSummary rule={before} />
                        </VStack>
                      </HStack>
                      <HStack gap={2} vAlign="center">
                        <ProductIcon name="provision" size="sm" color="success" label="Updated rule" />
                        <Text type="supporting" style={{ minWidth: 24 }}>#{after.position}</Text>
                        <RuleSummary rule={after} />
                      </HStack>
                    </VStack>
                  ))}
                </VStack>
              </VStack>
            )}

            {diff.modified.length > 0 && diff.removed.length > 0 && (
              <Divider />
            )}

            {diff.removed.length > 0 && (
              <VStack gap={2}>
                <HStack gap={1} vAlign="center">
                  <ProductIcon name="removed" size="sm" color="error" />
                  <Text weight="medium" style={{ color: 'var(--color-negative)' }}>
                    Removed ({diff.removed.length})
                  </Text>
                </HStack>
                <VStack gap={1}>
                  {diff.removed.map((rule) => (
                    <HStack key={rule.id} gap={2} vAlign="center" padding={2} style={{
                      background: 'var(--color-surface-negative)',
                      borderRadius: 'var(--radius-sm)',
                      opacity: 0.8,
                    }}>
                      <ProductIcon name="removed" size="sm" color="error" label="Removed rule" />
                      <Text type="supporting" style={{ minWidth: 24, textDecoration: 'line-through' }}>#{rule.position}</Text>
                      <VStack gap={0} style={{ textDecoration: 'line-through', color: 'var(--color-negative)' }}>
                        <RuleSummary rule={rule} />
                      </VStack>
                    </HStack>
                  ))}
                </VStack>
              </VStack>
            )}
          </VStack>
        )}
      </VStack>

      <HStack padding={4} hAlign="end" gap={2}>
        <Button
          label="Cancel"
          variant="ghost"
          onClick={handleClose}
          isDisabled={committing}
        />
        <Button
          label="Provision"
          variant="primary"
          icon={<ProductIcon name="provision" color="inherit" />}
          onClick={handleProvision}
          isLoading={committing}
          isDisabled={loading || !!error || totalChanges === 0}
        />
      </HStack>
    </Dialog>
  );
}
