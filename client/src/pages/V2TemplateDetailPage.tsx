import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

import { Breadcrumbs, BreadcrumbItem } from '@astryxdesign/core/Breadcrumbs';
import { Banner } from '@astryxdesign/core/Banner';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Button } from '@astryxdesign/core/Button';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Token } from '@astryxdesign/core/Token';
import { Divider } from '@astryxdesign/core/Divider';
import { Spinner } from '@astryxdesign/core/Spinner';

import { useApi } from '../hooks/useApi.js';
import { fetchV2Template, deleteV2Template } from '../api/v2-templates.js';
import type { V2TemplateRule } from '../api/v2-templates.js';
import type { V2Rule } from '../api/v2-policies.js';
import { V2RuleTable } from '../features/v2-rules/V2RuleTable.js';
import { DirectionVisual } from '../features/v2-rules/DirectionVisual.js';

function templateRuleToV2Rule(r: V2TemplateRule): V2Rule {
  return {
    id: r.id,
    policy_id: '',
    direction: r.direction,
    entity: r.entity,
    services: r.services,
    action: r.action,
    enabled: r.enabled,
    provision_status: 'draft',
    position: r.position,
    notes: r.notes,
  };
}

export default function V2TemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: template, loading, error } = useApi(() => fetchV2Template(id!), [id]);
  const [actionError, setActionError] = useState<string | null>(null);

  if (loading) {
    return (
      <HStack hAlign="center" padding={8}>
        <Spinner label="Loading template…" size="lg" />
      </HStack>
    );
  }

  if (error || !template) {
    return (
      <VStack gap={3} padding={4}>
        <Banner status="error" title={error ?? 'Template not found'} container="section" />
      </VStack>
    );
  }

  const ingressRules = (template.rules ?? [])
    .filter((r) => r.direction === 'ingress')
    .map(templateRuleToV2Rule);

  const egressRules = (template.rules ?? [])
    .filter((r) => r.direction === 'egress')
    .map(templateRuleToV2Rule);

  const handleDelete = async () => {
    try {
      setActionError(null);
      await deleteV2Template(id!);
      navigate('/policy-v2');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  return (
    <VStack gap={4} padding={4}>
      <Breadcrumbs>
        <BreadcrumbItem href="/policy-v2">Policy-v2</BreadcrumbItem>
        <BreadcrumbItem onClick={() => navigate('/policy-v2')}>Templates</BreadcrumbItem>
        <BreadcrumbItem isCurrent>{template.name}</BreadcrumbItem>
      </Breadcrumbs>

      {!!actionError && (
        <Banner
          status="error"
          title={actionError}
          isDismissable
          onDismiss={() => setActionError(null)}
        />
      )}

      <HStack hAlign="between" vAlign="center">
        <HStack gap={2} vAlign="center">
          <Heading level={1}>{template.name}</Heading>
          <Token
            label={template.source === 'illumio_suggested' ? 'Illumio Suggested' : 'User Created'}
            color={template.source === 'illumio_suggested' ? 'orange' : 'blue'}
            size="sm"
          />
        </HStack>
        <HStack gap={2} vAlign="center">
          <Button
            label="Edit"
            variant="secondary"
            onClick={() => navigate(`/policy-v2/templates/${id}/edit`)}
          />
          <MoreMenu
            items={[
              {
                label: 'Delete',
                onClick: handleDelete,
              },
            ]}
          />
        </HStack>
      </HStack>

      {template.description ? (
        <Text color="secondary">{template.description}</Text>
      ) : null}

      <Divider />

      {/* Linked Policies */}
      <VStack gap={2}>
        <Heading level={2}>Linked Policies</Heading>
        {(template.linked_policies ?? []).length === 0 ? (
          <Text color="secondary">No policies are linked to this template.</Text>
        ) : (
          <VStack gap={1}>
            {(template.linked_policies ?? []).map((p) => (
              <Link key={p.id} to={`/policy-v2/${p.id}`}>
                <Text>{p.name}</Text>
              </Link>
            ))}
          </VStack>
        )}
      </VStack>

      <Divider />

      {/* Ingress Rules */}
      <VStack gap={3}>
        <HStack gap={2} vAlign="center">
          <Heading level={2}>Ingress Rules</Heading>
          <DirectionVisual direction="ingress" />
        </HStack>
        <V2RuleTable
          policyId=""
          direction="ingress"
          rules={ingressRules}
          onRulesChanged={() => {}}
          readOnly
        />
      </VStack>

      <Divider />

      {/* Egress Rules */}
      <VStack gap={3}>
        <HStack gap={2} vAlign="center">
          <Heading level={2}>Egress Rules</Heading>
          <DirectionVisual direction="egress" />
        </HStack>
        <V2RuleTable
          policyId=""
          direction="egress"
          rules={egressRules}
          onRulesChanged={() => {}}
          readOnly
        />
      </VStack>
    </VStack>
  );
}
