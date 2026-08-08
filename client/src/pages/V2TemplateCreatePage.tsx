import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { Breadcrumbs, BreadcrumbItem } from '@astryxdesign/core/Breadcrumbs';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { TextInput } from '@astryxdesign/core/TextInput';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Divider } from '@astryxdesign/core/Divider';
import { Spinner } from '@astryxdesign/core/Spinner';

import {
  fetchV2Template,
  createV2Template,
  updateV2Template,
  createV2TemplateRule,
} from '../api/v2-templates.js';
import type { V2TemplateRule } from '../api/v2-templates.js';
import type { V2Rule } from '../api/v2-policies.js';
import { V2RuleTable } from '../features/v2-rules/V2RuleTable.js';
import type { DraftRule } from '../features/v2-rules/V2RuleTable.js';
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

export default function V2TemplateCreatePage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Draft rules (create mode)
  const [ingressDraftRules, setIngressDraftRules] = useState<DraftRule[]>([]);
  const [egressDraftRules, setEgressDraftRules] = useState<DraftRule[]>([]);

  // API rules (edit mode)
  const [ingressRules, setIngressRules] = useState<V2Rule[]>([]);
  const [egressRules, setEgressRules] = useState<V2Rule[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);

  // Load existing template in edit mode
  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    fetchV2Template(id)
      .then((t) => {
        setName(t.name);
        setDescription(t.description ?? '');
        const rules = t.rules ?? [];
        setIngressRules(rules.filter((r) => r.direction === 'ingress').map(templateRuleToV2Rule));
        setEgressRules(rules.filter((r) => r.direction === 'egress').map(templateRuleToV2Rule));
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Failed to load template'))
      .finally(() => setLoading(false));
  }, [isEdit, id]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setFormError('Template name is required');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      if (isEdit && id) {
        await updateV2Template(id, { name: name.trim(), description: description.trim() });
        navigate(`/policy-v2/templates/${id}`);
      } else {
        const template = await createV2Template({
          name: name.trim(),
          description: description.trim(),
          source: 'user_created',
        });
        for (const rule of [...ingressDraftRules, ...egressDraftRules]) {
          await createV2TemplateRule(template.id, {
            direction: rule.direction,
            entity: rule.entity,
            services: rule.services,
            action: rule.action,
          });
        }
        navigate(`/policy-v2/templates/${template.id}`);
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : isEdit ? 'Failed to save template' : 'Failed to create template');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <HStack hAlign="center" padding={8}>
        <Spinner label="Loading template…" size="lg" />
      </HStack>
    );
  }

  if (loadError) {
    return (
      <VStack gap={3} padding={4}>
        <Banner status="error" title={loadError} container="section" />
      </VStack>
    );
  }

  return (
    <VStack gap={4} padding={4}>
      <Breadcrumbs>
        <BreadcrumbItem href="/policy-v2">Policy-v2</BreadcrumbItem>
        <BreadcrumbItem onClick={() => navigate('/policy-v2')}>Templates</BreadcrumbItem>
        <BreadcrumbItem isCurrent>{isEdit ? 'Edit Template' : 'Create Template'}</BreadcrumbItem>
      </Breadcrumbs>

      <Heading level={1}>{isEdit ? 'Edit Template' : 'Create Template'}</Heading>

      {formError ? (
        <Banner
          status="error"
          title={formError}
          isDismissable
          onDismiss={() => setFormError(null)}
        />
      ) : null}

      {/* Zone 1: Template Info */}
      <VStack gap={3}>
        <Heading level={2}>Template Info</Heading>
        <TextInput
          label="Name"
          value={name}
          onChange={setName}
          isRequired
          placeholder="Enter template name"
          width="100%"
          status={formError && !name.trim() ? { type: 'error', message: 'Template name is required' } : undefined}
        />
        <TextArea
          label="Description"
          value={description}
          onChange={setDescription}
          isOptional
          placeholder="Enter an optional description"
          rows={3}
        />
      </VStack>

      <Divider />

      {/* Zone 2: Ingress Rules */}
      <VStack gap={2}>
        <HStack gap={2} vAlign="center">
          <DirectionVisual direction="ingress" />
          <Heading level={2}>Ingress Rules</Heading>
        </HStack>
        {isEdit ? (
          <V2RuleTable
            policyId=""
            direction="ingress"
            rules={ingressRules}
            onRulesChanged={() => {
              fetchV2Template(id!)
                .then((t) => {
                  const rules = t.rules ?? [];
                  setIngressRules(rules.filter((r) => r.direction === 'ingress').map(templateRuleToV2Rule));
                  setEgressRules(rules.filter((r) => r.direction === 'egress').map(templateRuleToV2Rule));
                })
                .catch(() => {});
            }}
          />
        ) : (
          <V2RuleTable
            policyId=""
            direction="ingress"
            rules={[]}
            onRulesChanged={() => {}}
            draftMode
            draftRules={ingressDraftRules}
            onDraftRulesChange={setIngressDraftRules}
          />
        )}
      </VStack>

      <Divider />

      {/* Zone 3: Egress Rules */}
      <VStack gap={2}>
        <HStack gap={2} vAlign="center">
          <DirectionVisual direction="egress" />
          <Heading level={2}>Egress Rules</Heading>
        </HStack>
        {isEdit ? (
          <V2RuleTable
            policyId=""
            direction="egress"
            rules={egressRules}
            onRulesChanged={() => {
              fetchV2Template(id!)
                .then((t) => {
                  const rules = t.rules ?? [];
                  setIngressRules(rules.filter((r) => r.direction === 'ingress').map(templateRuleToV2Rule));
                  setEgressRules(rules.filter((r) => r.direction === 'egress').map(templateRuleToV2Rule));
                })
                .catch(() => {});
            }}
          />
        ) : (
          <V2RuleTable
            policyId=""
            direction="egress"
            rules={[]}
            onRulesChanged={() => {}}
            draftMode
            draftRules={egressDraftRules}
            onDraftRulesChange={setEgressDraftRules}
          />
        )}
      </VStack>

      <Divider />

      {/* Footer */}
      <HStack gap={2} hAlign="end">
        <Button
          label="Cancel"
          variant="ghost"
          onClick={() => navigate('/policy-v2')}
          isDisabled={submitting}
        />
        <Button
          label={isEdit ? 'Save Template' : 'Create Template'}
          variant="primary"
          onClick={handleSubmit}
          isDisabled={submitting}
          isLoading={submitting}
        />
      </HStack>
    </VStack>
  );
}
