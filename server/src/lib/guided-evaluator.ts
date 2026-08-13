import type { WorkloadContext } from './expression-evaluator.js';
import { safeRegexTest } from './regex-utils.js';

export interface GuidedCondition {
  field: string;
  operator: string;
  value: string;
}

function resolveGuidedField(ctx: WorkloadContext, field: string): string | undefined {
  if (field.startsWith('k8s.labels.')) {
    const key = field.slice('k8s.labels.'.length);
    return ctx.k8s_labels[key];
  }
  if (field.startsWith('k8s.annotations.')) {
    const key = field.slice('k8s.annotations.'.length);
    return ctx.k8s_annotations[key];
  }
  const key = field as keyof WorkloadContext;
  const val = ctx[key];
  if (typeof val === 'string') return val;
  return undefined;
}

export function evaluateCondition(condition: GuidedCondition, ctx: WorkloadContext): boolean {
  const fieldVal = resolveGuidedField(ctx, condition.field);
  const { operator, value } = condition;

  switch (operator) {
    case 'is':
    case '==':
      return fieldVal === value;
    case 'is_not':
    case '!=':
      return fieldVal !== value;
    case 'contains':
      return fieldVal !== undefined && fieldVal.includes(value);
    case 'does_not_contain':
      return fieldVal === undefined || !fieldVal.includes(value);
    case 'starts_with':
      return fieldVal !== undefined && fieldVal.startsWith(value);
    case 'ends_with':
      return fieldVal !== undefined && fieldVal.endsWith(value);
    case 'matches_regex':
    case '=~':
      return fieldVal !== undefined && safeRegexTest(value, fieldVal);
    case 'does_not_match_regex':
    case '!~':
      return fieldVal === undefined || !safeRegexTest(value, fieldVal);
    case 'exists':
      return fieldVal !== undefined && fieldVal !== '';
    case 'does_not_exist':
      return fieldVal === undefined || fieldVal === '';
    case 'in': {
      if (fieldVal === undefined) return false;
      const list = value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      return list.includes(fieldVal);
    }
    case 'not_in': {
      if (fieldVal === undefined) return true;
      const list = value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      return !list.includes(fieldVal);
    }
    default:
      return false;
  }
}

export function evaluateGuidedConditions(
  conditions: GuidedCondition[],
  logic: 'AND' | 'OR',
  ctx: WorkloadContext,
): boolean {
  if (conditions.length === 0) return true;

  if (logic === 'AND') {
    return conditions.every((c) => evaluateCondition(c, ctx));
  }
  return conditions.some((c) => evaluateCondition(c, ctx));
}
