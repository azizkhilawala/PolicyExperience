import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { Breadcrumbs, BreadcrumbItem } from '@astryxdesign/core/Breadcrumbs';
import { Banner } from '@astryxdesign/core/Banner';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Button } from '@astryxdesign/core/Button';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Divider } from '@astryxdesign/core/Divider';
import { Spinner } from '@astryxdesign/core/Spinner';

import { useApi } from '../hooks/useApi.js';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';
import { fetchPolicy, deletePolicy } from '../api/policies.js';
import { LabelTokens } from '../components/LabelTokens.js';
import { ProvisionBadge } from '../components/ProvisionBadge.js';
import { StatusIndicator } from '../components/StatusIndicator.js';
import { RuleEditor } from '../features/rules/RuleEditor.js';
import { ProvisionDialog } from '../features/policies/ProvisionDialog.js';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function PolicyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, users } = useAuth();
  const { data: policy, loading, error, refetch } = useApi(() => fetchPolicy(id!), [id]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [provisionOpen, setProvisionOpen] = useState(false);

  if (loading) {
    return (
      <HStack hAlign="center" padding={8}>
        <Spinner label="Loading policy…" size="lg" />
      </HStack>
    );
  }

  if (error || !policy) {
    return (
      <VStack gap={3} padding={4}>
        <Banner status="error" title={error ?? 'Policy not found'} container="section" />
      </VStack>
    );
  }

  const lockedByUser = policy.locked_by ? users.find((u) => u.id === policy.locked_by) : null;
  const lockedByName = lockedByUser?.name ?? policy.locked_by ?? 'Unknown';
  const isAdmin = user?.role === 'global_admin';
  const typeLabel = policy.type === 'organizational' ? 'Organizational' : 'Application';

  return (
    <VStack gap={4} padding={4}>
      <Breadcrumbs>
        <BreadcrumbItem href="/policies">Policies</BreadcrumbItem>
        <BreadcrumbItem isCurrent>{policy.name}</BreadcrumbItem>
      </Breadcrumbs>

      {!!policy.is_locked && (
        <Banner
          status="warning"
          container="section"
          title={`Locked by ${lockedByName} on ${formatDate(policy.locked_at)}. This policy is skipped during provisioning.`}
          endContent={
            <Button
              label="Unlock"
              variant="secondary"
              size="sm"
              isDisabled={!isAdmin}
              tooltip={!isAdmin ? 'Only global admins can unlock rulesets' : undefined}
              onClick={async () => {
                try {
                  setActionError(null);
                  await apiFetch(`/api/policies/${id}/unlock`, { method: 'POST' });
                  refetch();
                } catch (e) {
                  setActionError(e instanceof Error ? e.message : 'Action failed');
                }
              }}
            />
          }
        />
      )}

      {!!actionError && (
        <Banner
          status="error"
          title={actionError}
          isDismissable
          onDismiss={() => setActionError(null)}
        />
      )}

      <HStack hAlign="between" vAlign="center">
        <VStack gap={0.5}>
          <Heading level={1}>{policy.name}</Heading>
          <HStack gap={1} vAlign="center">
            <Text type="supporting">{typeLabel} Policy ·</Text>
            <ProvisionBadge status={policy.provision_status} />
          </HStack>
        </VStack>
        <HStack gap={2} vAlign="center">
          <Button
            label="Provision"
            variant="primary"
            isDisabled={!!policy.is_locked || policy.provision_status === 'provisioned'}
            tooltip={
              policy.is_locked
                ? 'Unlock policy before provisioning'
                : policy.provision_status === 'provisioned'
                  ? 'Already provisioned'
                  : undefined
            }
            onClick={() => setProvisionOpen(true)}
          />
          <MoreMenu
            items={[
              { label: 'Edit', onClick: () => {} },
              {
                label: policy.is_locked ? 'Unlock' : 'Lock',
                onClick: async () => {
                  try {
                    setActionError(null);
                    await apiFetch(`/api/policies/${id}/${policy.is_locked ? 'unlock' : 'lock'}`, {
                      method: 'POST',
                    });
                    refetch();
                  } catch (e) {
                    setActionError(e instanceof Error ? e.message : 'Action failed');
                  }
                },
              },
              {
                label: policy.enabled ? 'Disable' : 'Enable',
                onClick: async () => {
                  try {
                    setActionError(null);
                    await apiFetch(`/api/policies/${id}`, {
                      method: 'PATCH',
                      body: JSON.stringify({ enabled: !policy.enabled }),
                    });
                    refetch();
                  } catch (e) {
                    setActionError(e instanceof Error ? e.message : 'Action failed');
                  }
                },
              },
              { type: 'divider' as const },
              {
                label: 'Delete',
                onClick: async () => {
                  try {
                    setActionError(null);
                    await deletePolicy(id!);
                    navigate('/policies');
                  } catch (e) {
                    setActionError(e instanceof Error ? e.message : 'Action failed');
                  }
                },
              },
            ]}
          />
        </HStack>
      </HStack>

      {policy.description && (
        <Text color="secondary">{policy.description}</Text>
      )}

      <MetadataList columns="multi">
        <MetadataListItem label="Scope">
          <LabelTokens labels={policy.scope} />
        </MetadataListItem>
        <MetadataListItem label="Status">
          <StatusIndicator enabled={!!policy.enabled} />
        </MetadataListItem>
        <MetadataListItem label="Created">
          <Text>{formatDate(policy.created_at)}</Text>
        </MetadataListItem>
        <MetadataListItem label="Last Modified">
          <Text>{formatDate(policy.updated_at)}</Text>
        </MetadataListItem>
      </MetadataList>

      <Divider />

      <RuleEditor
        policyId={policy.id}
        scopeLabels={policy.scope}
        isLocked={!!policy.is_locked}
        provisionStatus={policy.provision_status}
        onRulesChanged={refetch}
      />

      <ProvisionDialog
        isOpen={provisionOpen}
        onOpenChange={setProvisionOpen}
        policyId={policy.id}
        onProvisioned={() => {
          setProvisionOpen(false);
          refetch();
        }}
      />
    </VStack>
  );
}
