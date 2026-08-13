import { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Token } from '@astryxdesign/core/Token';
import { Button } from '@astryxdesign/core/Button';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Card } from '@astryxdesign/core/Card';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Banner } from '@astryxdesign/core/Banner';
import { Icon } from '@astryxdesign/core/Icon';
import { Pencil } from 'lucide-react';

import { useApi } from '../hooks/useApi.js';
import {
  fetchMappingRule,
  type MappingRule,
  DIMENSION_LABELS,
  VALUE_MODE_LABELS,
  CONFLICT_LABELS,
} from '../api/label-mapping.js';
import { RulePreview } from '../features/label-mapping/RulePreview.js';

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <HStack gap={2} vAlign="start">
      <Text weight="medium" style={{ minWidth: 140 }}>{label}</Text>
      {children}
    </HStack>
  );
}

export default function LabelMappingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fetcher = useCallback(() => fetchMappingRule(id!), [id]);
  const { data: rule, loading, error } = useApi<MappingRule>(fetcher, [id]);

  if (loading) {
    return (
      <HStack hAlign="center" padding={8}>
        <Spinner label="Loading rule…" size="lg" />
      </HStack>
    );
  }
  if (error) return <Banner status="error" title={error} />;
  if (!rule) return <Banner status="error" title="Rule not found" />;

  const conditions = Array.isArray(rule.conditions) ? rule.conditions : [];

  return (
    <VStack gap={4} padding={4}>
      <HStack hAlign="between" vAlign="center">
        <HStack gap={2} vAlign="center">
          <Button
            label="Back"
            variant="ghost"
            size="sm"
            icon={<Icon icon="chevronLeft" />}
            onClick={() => navigate('/label-mapping')}
          />
          <Heading level={1}>{rule.name}</Heading>
          <StatusDot
            variant={rule.enabled ? 'success' : 'neutral'}
            label={rule.enabled ? 'Enabled' : 'Disabled'}
          />
        </HStack>
        <Button
          label="Edit"
          variant="secondary"
          icon={<Icon icon={Pencil} />}
          onClick={() => navigate(`/label-mapping/${id}/edit`)}
        />
      </HStack>

      {rule.description && (
        <Text type="supporting" color="secondary">{rule.description}</Text>
      )}

      <Card padding={4}>
        <VStack gap={2}>
          <Heading level={3}>Configuration</Heading>
          <DetailRow label="Priority">
            <Text>{rule.priority}</Text>
          </DetailRow>
          <DetailRow label="Match Mode">
            <Token
              label={rule.match_mode === 'guided' ? 'Guided' : 'Expression'}
              color={rule.match_mode === 'guided' ? 'blue' : 'purple'}
              size="sm"
            />
          </DetailRow>

          {rule.match_mode === 'expression' && rule.expression && (
            <DetailRow label="Expression">
              <Text
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: 'var(--font-size-sm, 13px)',
                }}
              >
                {rule.expression}
              </Text>
            </DetailRow>
          )}

          {rule.match_mode === 'guided' && conditions.length > 0 && (
            <DetailRow label="Conditions">
              <VStack gap={1}>
                {conditions.map((c, i) => (
                  <HStack key={i} gap={1} vAlign="center">
                    {i > 0 && <Token label={rule.condition_logic} color="gray" size="sm" />}
                    <Token label={c.field} color="blue" size="sm" />
                    <Token label={c.operator} color="gray" size="sm" />
                    {c.value && <Token label={c.value} color="default" size="sm" />}
                  </HStack>
                ))}
              </VStack>
            </DetailRow>
          )}

          <DetailRow label="Target Dimension">
            <Token
              label={DIMENSION_LABELS[rule.target_dimension] ?? rule.target_dimension}
              color="teal"
              size="sm"
            />
          </DetailRow>
          <DetailRow label="Value Mode">
            <Text>{VALUE_MODE_LABELS[rule.target_value_mode] ?? rule.target_value_mode}</Text>
          </DetailRow>

          {rule.target_value_mode === 'static' && rule.target_value && (
            <DetailRow label="Static Value">
              <Token label={rule.target_value} color="green" size="sm" />
            </DetailRow>
          )}

          {(rule.target_value_mode === 'copy' || rule.target_value_mode === 'regex_capture' || rule.target_value_mode === 'transform') && rule.target_source_field && (
            <DetailRow label="Source Field">
              <Text>{rule.target_source_field}</Text>
            </DetailRow>
          )}

          {rule.target_value_mode === 'regex_capture' && rule.regex_pattern && (
            <DetailRow label="Regex Pattern">
              <Text style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                /{rule.regex_pattern}/ (group {rule.regex_capture_group})
              </Text>
            </DetailRow>
          )}

          {rule.target_transform && (
            <DetailRow label="Transform">
              <Text>{rule.target_transform}</Text>
            </DetailRow>
          )}

          <DetailRow label="Conflict Behavior">
            <Text>{CONFLICT_LABELS[rule.conflict_behavior] ?? rule.conflict_behavior}</Text>
          </DetailRow>

          <DetailRow label="Matched">
            <HStack gap={1}>
              <Token label={`${rule.matched_count ?? 0} matched`} color="green" size="sm" />
              {(rule.conflict_count ?? 0) > 0 && (
                <Token label={`${rule.conflict_count} conflicts`} color="red" size="sm" />
              )}
            </HStack>
          </DetailRow>
        </VStack>
      </Card>

      <RulePreview ruleId={id!} />
    </VStack>
  );
}
