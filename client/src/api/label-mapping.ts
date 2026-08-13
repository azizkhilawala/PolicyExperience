import { apiFetch } from './client.js';

export interface GuidedCondition {
  field: string;
  operator: string;
  value: string;
}

export interface MappingRule {
  id: string;
  name: string;
  description: string;
  enabled: number;
  priority: number;
  match_mode: 'guided' | 'expression';
  conditions: GuidedCondition[];
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
  created_by: string;
  created_at: string;
  updated_at: string;
  matched_count?: number;
  conflict_count?: number;
}

export interface PreviewWorkload {
  workload_id: string;
  workload_name: string;
  cluster: string;
  namespace: string;
  k8s_labels: Record<string, string>;
  matched: boolean;
  proposed_dimension: string;
  proposed_value: string | null;
  current_labels: Array<{ key: string; value: string }>;
}

export interface PreviewResult {
  total_workloads: number;
  matched_count: number;
  unmatched_count: number;
  matched: PreviewWorkload[];
  unmatched: PreviewWorkload[];
}

export interface ExpressionPreviewResult {
  valid: boolean;
  error?: string;
  matched_count?: number;
  total_workloads?: number;
  matched?: Array<{
    id: string;
    name: string;
    cluster: string;
    namespace: string;
    k8s_labels: Record<string, string>;
  }>;
}

export interface CoverageStats {
  total_k8s_workloads: number;
  fully_mapped: number;
  partially_mapped: number;
  unmapped: number;
  conflicts: number;
  total_rules: number;
  enabled_rules: number;
  dimension_coverage: Record<string, number>;
}

export interface EvaluateResult {
  rules_evaluated: number;
  workloads_evaluated: number;
  mappings_created: number;
  conflicts: number;
}

export async function fetchMappingRules(): Promise<MappingRule[]> {
  const res = await apiFetch<{ data: MappingRule[] }>('/api/label-mapping/rules');
  return res.data;
}

export async function fetchMappingRule(id: string): Promise<MappingRule> {
  return apiFetch<MappingRule>(`/api/label-mapping/rules/${id}`);
}

export async function createMappingRule(
  data: Partial<MappingRule>,
): Promise<MappingRule> {
  return apiFetch<MappingRule>('/api/label-mapping/rules', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMappingRule(
  id: string,
  data: Partial<MappingRule>,
): Promise<MappingRule> {
  return apiFetch<MappingRule>(`/api/label-mapping/rules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteMappingRule(id: string): Promise<void> {
  await apiFetch(`/api/label-mapping/rules/${id}`, { method: 'DELETE' });
}

export async function previewRule(id: string): Promise<PreviewResult> {
  return apiFetch<PreviewResult>(`/api/label-mapping/rules/${id}/preview`, {
    method: 'POST',
  });
}

export async function previewExpression(
  expression: string,
): Promise<ExpressionPreviewResult> {
  return apiFetch<ExpressionPreviewResult>('/api/label-mapping/preview-expression', {
    method: 'POST',
    body: JSON.stringify({ expression }),
  });
}

export async function evaluateMappings(): Promise<EvaluateResult> {
  return apiFetch<EvaluateResult>('/api/label-mapping/evaluate', {
    method: 'POST',
  });
}

export async function fetchCoverage(): Promise<CoverageStats> {
  return apiFetch<CoverageStats>('/api/label-mapping/coverage');
}

export async function fetchFieldValues(field: string): Promise<string[]> {
  const res = await apiFetch<{ field: string; values: string[] }>(
    `/api/label-mapping/field-values?field=${encodeURIComponent(field)}`,
  );
  return res.values;
}

const GUIDED_TO_EXPR: Record<string, string> = {
  is: '==',
  is_not: '!=',
  contains: 'contains',
  does_not_contain: '!~',
  starts_with: 'starts_with',
  ends_with: 'ends_with',
  matches_regex: '=~',
  does_not_match_regex: '!~',
  in: 'in',
  not_in: 'not_in',
};

const EXPR_TO_GUIDED: Record<string, string> = {
  '==': 'is',
  '!=': 'is_not',
  'contains': 'contains',
  'starts_with': 'starts_with',
  'ends_with': 'ends_with',
  '=~': 'matches_regex',
  '!~': 'does_not_match_regex',
  'in': 'in',
  'not_in': 'not_in',
};

function formatField(field: string): string {
  if (field.startsWith('k8s.labels.')) {
    const key = field.slice(11);
    return `k8s.labels["${key}"]`;
  }
  if (field.startsWith('k8s.annotations.')) {
    const key = field.slice(16);
    return `k8s.annotations["${key}"]`;
  }
  return field;
}

export function formatConditionsAsExpression(
  conditions: GuidedCondition[],
  logic: 'AND' | 'OR',
): string {
  if (!conditions || conditions.length === 0) return '';
  return conditions
    .map((c) => {
      const f = formatField(c.field);
      if (c.operator === 'exists') return `exists(${f})`;
      if (c.operator === 'does_not_exist') return `NOT exists(${f})`;
      const op = GUIDED_TO_EXPR[c.operator] ?? c.operator;
      if (c.operator === 'in' || c.operator === 'not_in') {
        const items = c.value.split(',').map((v) => `"${v.trim()}"`).join(', ');
        return `${f} ${op} [${items}]`;
      }
      return `${f} ${op} "${c.value}"`;
    })
    .join(` ${logic} `);
}

function normalizeField(raw: string): string {
  const bracketMatch = raw.match(/^(k8s\.labels|k8s\.annotations)\["(.+?)"\]$/);
  if (bracketMatch) return `${bracketMatch[1]}.${bracketMatch[2]}`;
  return raw;
}

interface ParseResult {
  conditions: GuidedCondition[];
  logic: 'AND' | 'OR';
}

export function parseExpressionToConditions(expr: string): ParseResult | null {
  if (!expr.trim()) return null;
  try {
    let logic: 'AND' | 'OR' = 'AND';
    const logicMatch = expr.match(/\b(AND|OR)\b/);
    if (logicMatch) logic = logicMatch[1] as 'AND' | 'OR';

    const parts = expr.split(new RegExp(`\\s+${logic}\\s+`));
    const conditions: GuidedCondition[] = [];

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      const existsMatch = trimmed.match(/^exists\((.+)\)$/);
      if (existsMatch) {
        conditions.push({ field: normalizeField(existsMatch[1].trim()), operator: 'exists', value: '' });
        continue;
      }

      const notExistsMatch = trimmed.match(/^NOT\s+exists\((.+)\)$/);
      if (notExistsMatch) {
        conditions.push({ field: normalizeField(notExistsMatch[1].trim()), operator: 'does_not_exist', value: '' });
        continue;
      }

      const inMatch = trimmed.match(/^(.+?)\s+(in|not_in)\s+\[(.+)\]$/);
      if (inMatch) {
        const field = normalizeField(inMatch[1].trim());
        const op = EXPR_TO_GUIDED[inMatch[2]] ?? inMatch[2];
        const vals = inMatch[3].split(',').map((v) => v.trim().replace(/^"|"$/g, '')).join(', ');
        conditions.push({ field, operator: op, value: vals });
        continue;
      }

      const compMatch = trimmed.match(/^(.+?)\s+(==|!=|=~|!~|contains|starts_with|ends_with)\s+"(.+)"$/);
      if (compMatch) {
        const field = normalizeField(compMatch[1].trim());
        const op = EXPR_TO_GUIDED[compMatch[2]] ?? compMatch[2];
        conditions.push({ field, operator: op, value: compMatch[3] });
        continue;
      }

      return null;
    }

    if (conditions.length === 0) return null;
    return { conditions, logic };
  } catch {
    return null;
  }
}

export function getRuleExpression(rule: MappingRule): string {
  if (rule.match_mode === 'expression') return rule.expression || '';
  const conditions = Array.isArray(rule.conditions)
    ? rule.conditions
    : typeof rule.conditions === 'string'
      ? JSON.parse(rule.conditions || '[]')
      : [];
  return formatConditionsAsExpression(conditions, rule.condition_logic);
}

export const DIMENSION_LABELS: Record<string, string> = {
  role: 'Role',
  app: 'Application',
  env: 'Environment',
  loc: 'Location',
};

export const VALUE_MODE_LABELS: Record<string, string> = {
  static: 'Static Value',
  copy: 'Copy from Source',
  regex_capture: 'Regex Capture',
  transform: 'Transform',
};

export const CONFLICT_LABELS: Record<string, string> = {
  skip: 'Skip if exists',
  overwrite_mapped: 'Overwrite mapped',
  flag: 'Flag for review',
  priority_wins: 'Priority wins',
};
