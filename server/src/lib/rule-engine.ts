import { parseExpression } from './expression-parser.js';
import { evaluateAST, type WorkloadContext } from './expression-evaluator.js';
import { evaluateGuidedConditions, type GuidedCondition } from './guided-evaluator.js';
import { extractCaptureGroup, applyTransform } from './regex-utils.js';

export interface MappingRule {
  id: string;
  name: string;
  enabled: number;
  priority: number;
  match_mode: 'guided' | 'expression';
  conditions: string;
  condition_logic: 'AND' | 'OR';
  expression: string;
  target_dimension: 'role' | 'app' | 'env' | 'loc';
  target_value_mode: 'static' | 'copy' | 'regex_capture' | 'transform';
  target_value: string;
  target_source_field: string;
  target_transform: string;
  regex_pattern: string;
  regex_capture_group: number;
  conflict_behavior: 'skip' | 'overwrite_mapped' | 'flag' | 'priority_wins';
}

export interface EvaluationResult {
  workload_id: string;
  workload_name: string;
  rule_id: string;
  rule_name: string;
  matched: boolean;
  label_dimension: string;
  proposed_value: string;
  current_value: string;
  conflict: boolean;
  conflict_detail: string;
  provenance: string;
}

export function buildWorkloadContext(workload: {
  name: string;
  labels: Array<{ key: string; value: string }>;
  cluster_name?: string;
  namespace_name?: string;
}): WorkloadContext {
  const k8sLabels: Record<string, string> = {};
  for (const l of workload.labels) {
    k8sLabels[l.key] = l.value;
  }

  return {
    cluster: workload.cluster_name ?? '',
    namespace: workload.namespace_name ?? '',
    deployment: k8sLabels['deployment'] ?? k8sLabels['app'] ?? '',
    pod: workload.name,
    service: k8sLabels['service'] ?? '',
    node: '',
    container_image: '',
    workload_name: workload.name,
    k8s_labels: k8sLabels,
    k8s_annotations: {},
  };
}

export function matchesRule(rule: MappingRule, ctx: WorkloadContext): boolean {
  if (rule.match_mode === 'expression') {
    if (!rule.expression.trim()) return false;
    try {
      const ast = parseExpression(rule.expression);
      return evaluateAST(ast, ctx);
    } catch {
      return false;
    }
  }

  let conditions: GuidedCondition[];
  try {
    conditions = JSON.parse(rule.conditions);
  } catch {
    return false;
  }

  if (!Array.isArray(conditions) || conditions.length === 0) return false;
  return evaluateGuidedConditions(conditions, rule.condition_logic, ctx);
}

function resolveFieldValue(ctx: WorkloadContext, fieldSpec: string): string | undefined {
  if (fieldSpec.startsWith('k8s.labels.')) {
    return ctx.k8s_labels[fieldSpec.slice('k8s.labels.'.length)];
  }
  if (fieldSpec.startsWith('k8s.labels["')) {
    const key = fieldSpec.slice('k8s.labels["'.length, -2);
    return ctx.k8s_labels[key];
  }
  const key = fieldSpec as keyof WorkloadContext;
  const val = ctx[key];
  if (typeof val === 'string') return val;
  return undefined;
}

export function computeTargetValue(
  rule: MappingRule,
  ctx: WorkloadContext,
): string | null {
  switch (rule.target_value_mode) {
    case 'static':
      return rule.target_value || null;

    case 'copy': {
      const val = resolveFieldValue(ctx, rule.target_source_field);
      if (!val) return null;
      if (rule.target_transform) return applyTransform(val, rule.target_transform);
      return val;
    }

    case 'regex_capture': {
      const sourceVal = resolveFieldValue(ctx, rule.target_source_field || 'namespace');
      if (!sourceVal) return null;
      const captured = extractCaptureGroup(
        rule.regex_pattern,
        sourceVal,
        rule.regex_capture_group,
      );
      if (!captured) return null;
      if (rule.target_transform) return applyTransform(captured, rule.target_transform);
      return captured;
    }

    case 'transform': {
      const val = resolveFieldValue(ctx, rule.target_source_field);
      if (!val) return null;
      return applyTransform(val, rule.target_transform);
    }

    default:
      return null;
  }
}

export function evaluateRules(
  rules: MappingRule[],
  workloads: Array<{
    id: string;
    name: string;
    labels: Array<{ key: string; value: string }>;
    cluster_name?: string;
    namespace_name?: string;
    illumio_labels?: Record<string, { value: string; provenance: string }>;
  }>,
): EvaluationResult[] {
  const sortedRules = [...rules]
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority);

  const results: EvaluationResult[] = [];

  for (const workload of workloads) {
    const ctx = buildWorkloadContext(workload);
    const assignedDimensions: Record<
      string,
      { value: string; rule_id: string; provenance: string }
    > = {};

    if (workload.illumio_labels) {
      for (const [dim, info] of Object.entries(workload.illumio_labels)) {
        assignedDimensions[dim] = {
          value: info.value,
          rule_id: '',
          provenance: info.provenance,
        };
      }
    }

    for (const rule of sortedRules) {
      const matched = matchesRule(rule, ctx);
      if (!matched) continue;

      const proposedValue = computeTargetValue(rule, ctx);
      if (!proposedValue) continue;

      const dim = rule.target_dimension;
      const existing = assignedDimensions[dim];
      let conflict = false;
      let conflictDetail = '';

      if (existing) {
        if (existing.provenance === 'manual') {
          conflict = true;
          conflictDetail = `Manual label "${existing.value}" already exists for ${dim}`;
          if (rule.conflict_behavior !== 'flag') continue;
        } else if (existing.value !== proposedValue) {
          conflict = true;
          conflictDetail = `Conflicts with existing mapped value "${existing.value}" from ${existing.provenance}`;

          switch (rule.conflict_behavior) {
            case 'skip':
              continue;
            case 'priority_wins':
              break;
            case 'overwrite_mapped':
              break;
            case 'flag':
              break;
          }
        } else {
          continue;
        }
      }

      results.push({
        workload_id: workload.id,
        workload_name: workload.name,
        rule_id: rule.id,
        rule_name: rule.name,
        matched: true,
        label_dimension: dim,
        proposed_value: proposedValue,
        current_value: existing?.value ?? '',
        conflict,
        conflict_detail: conflictDetail,
        provenance: 'mapping-rule',
      });

      if (!conflict || rule.conflict_behavior !== 'flag') {
        assignedDimensions[dim] = {
          value: proposedValue,
          rule_id: rule.id,
          provenance: 'mapping-rule',
        };
      }
    }
  }

  return results;
}
