import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/connection.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { parseExpression } from '../lib/expression-parser.js';
import { validateRegex } from '../lib/regex-utils.js';
import {
  evaluateRules,
  matchesRule,
  computeTargetValue,
  buildWorkloadContext,
  type MappingRule,
} from '../lib/rule-engine.js';

const router = Router();

function logAudit(
  entityType: string,
  entityId: string,
  entityName: string,
  action: string,
  userId: string,
  details: Record<string, unknown> = {},
) {
  const db = getDb();
  db.prepare(
    `INSERT INTO audit_log (id, entity_type, entity_id, entity_name, action, performed_by, performed_at, details)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)`,
  ).run(uuid(), entityType, entityId, entityName, action, userId, JSON.stringify(details));
}

interface WorkloadRow {
  id: string;
  name: string;
  labels: string;
  cluster_id: string | null;
  namespace_id: string | null;
}

function getK8sWorkloadsWithContext() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT w.id, w.name, w.labels, w.cluster_id, w.namespace_id,
              c.name as cluster_name, n.name as namespace_name
       FROM workloads w
       LEFT JOIN k8s_clusters c ON w.cluster_id = c.id
       LEFT JOIN k8s_namespaces n ON w.namespace_id = n.id
       WHERE w.type = 'k8s_pod'`,
    )
    .all() as Array<WorkloadRow & { cluster_name: string | null; namespace_name: string | null }>;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    labels: JSON.parse(r.labels || '[]') as Array<{ key: string; value: string }>,
    cluster_name: r.cluster_name ?? '',
    namespace_name: r.namespace_name ?? '',
  }));
}

// GET /rules — list all mapping rules
router.get('/rules', (_req, res) => {
  const db = getDb();
  const rules = db
    .prepare('SELECT * FROM k8s_label_mapping_rules ORDER BY priority ASC')
    .all() as MappingRule[];

  const workloads = getK8sWorkloadsWithContext();
  const allResults = evaluateRules(rules, workloads);

  const enriched = rules.map((rule) => {
    const ruleResults = allResults.filter((r) => r.rule_id === rule.id);
    return {
      ...rule,
      conditions: JSON.parse((rule.conditions as string) || '[]'),
      matched_count: ruleResults.length,
      conflict_count: ruleResults.filter((r) => r.conflict).length,
    };
  });

  res.json({ data: enriched });
});

// POST /rules — create a mapping rule
router.post('/rules', (req, res) => {
  const user = (req as unknown as AuthenticatedRequest).user;
  const {
    name,
    description,
    enabled,
    priority,
    match_mode,
    conditions,
    condition_logic,
    expression,
    target_dimension,
    target_value_mode,
    target_value,
    target_source_field,
    target_transform,
    regex_pattern,
    regex_capture_group,
    conflict_behavior,
  } = req.body;

  if (!name?.trim()) {
    res.status(400).json({ error: 'Rule name is required' });
    return;
  }
  if (!match_mode || !['guided', 'expression'].includes(match_mode)) {
    res.status(400).json({ error: 'match_mode must be guided or expression' });
    return;
  }
  if (!target_dimension || !['role', 'app', 'env', 'loc'].includes(target_dimension)) {
    res.status(400).json({ error: 'target_dimension must be role, app, env, or loc' });
    return;
  }

  if (match_mode === 'expression' && expression) {
    try {
      parseExpression(expression);
    } catch (e) {
      res.status(400).json({ error: `Invalid expression: ${e instanceof Error ? e.message : String(e)}` });
      return;
    }
  }

  if (regex_pattern) {
    const v = validateRegex(regex_pattern);
    if (!v.valid) {
      res.status(400).json({ error: `Invalid regex: ${v.error}` });
      return;
    }
  }

  const id = uuid();
  const db = getDb();
  db.prepare(
    `INSERT INTO k8s_label_mapping_rules
     (id, name, description, enabled, priority, match_mode, conditions, condition_logic, expression,
      target_dimension, target_value_mode, target_value, target_source_field, target_transform,
      regex_pattern, regex_capture_group, conflict_behavior, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
  ).run(
    id,
    name.trim(),
    description ?? '',
    enabled ?? 1,
    priority ?? 0,
    match_mode,
    JSON.stringify(conditions ?? []),
    condition_logic ?? 'AND',
    expression ?? '',
    target_dimension,
    target_value_mode ?? 'static',
    target_value ?? '',
    target_source_field ?? '',
    target_transform ?? '',
    regex_pattern ?? '',
    regex_capture_group ?? 1,
    conflict_behavior ?? 'skip',
    user.id,
  );

  const rule = db.prepare('SELECT * FROM k8s_label_mapping_rules WHERE id = ?').get(id);
  logAudit('label_mapping_rule', id, name.trim(), 'created', user.id);
  res.status(201).json(rule);
});

// GET /rules/:id — get rule detail
router.get('/rules/:id', (req, res) => {
  const db = getDb();
  const rule = db
    .prepare('SELECT * FROM k8s_label_mapping_rules WHERE id = ?')
    .get(req.params.id) as MappingRule | undefined;

  if (!rule) {
    res.status(404).json({ error: 'Rule not found' });
    return;
  }

  const workloads = getK8sWorkloadsWithContext();
  const results = evaluateRules([rule], workloads);

  res.json({
    ...rule,
    conditions: JSON.parse((rule.conditions as string) || '[]'),
    matched_count: results.length,
    conflict_count: results.filter((r) => r.conflict).length,
    evaluation_results: results,
  });
});

// PATCH /rules/:id — update rule
router.patch('/rules/:id', (req, res) => {
  const user = (req as unknown as AuthenticatedRequest).user;
  const db = getDb();
  const existing = db
    .prepare('SELECT * FROM k8s_label_mapping_rules WHERE id = ?')
    .get(req.params.id) as MappingRule | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Rule not found' });
    return;
  }

  const fields = [
    'name', 'description', 'enabled', 'priority', 'match_mode',
    'condition_logic', 'expression', 'target_dimension', 'target_value_mode',
    'target_value', 'target_source_field', 'target_transform',
    'regex_pattern', 'regex_capture_group', 'conflict_behavior',
  ];

  const updates: string[] = ['updated_at = datetime(\'now\')'];
  const values: unknown[] = [];

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  }

  if (req.body.conditions !== undefined) {
    updates.push('conditions = ?');
    values.push(JSON.stringify(req.body.conditions));
  }

  if (req.body.expression) {
    try {
      parseExpression(req.body.expression);
    } catch (e) {
      res.status(400).json({ error: `Invalid expression: ${e instanceof Error ? e.message : String(e)}` });
      return;
    }
  }

  if (req.body.regex_pattern) {
    const v = validateRegex(req.body.regex_pattern);
    if (!v.valid) {
      res.status(400).json({ error: `Invalid regex: ${v.error}` });
      return;
    }
  }

  values.push(req.params.id);
  db.prepare(`UPDATE k8s_label_mapping_rules SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare('SELECT * FROM k8s_label_mapping_rules WHERE id = ?').get(req.params.id);
  logAudit('label_mapping_rule', req.params.id, (updated as MappingRule).name, 'updated', user.id);
  res.json(updated);
});

// DELETE /rules/:id — delete rule
router.delete('/rules/:id', (req, res) => {
  const user = (req as unknown as AuthenticatedRequest).user;
  const db = getDb();
  const rule = db
    .prepare('SELECT * FROM k8s_label_mapping_rules WHERE id = ?')
    .get(req.params.id) as MappingRule | undefined;

  if (!rule) {
    res.status(404).json({ error: 'Rule not found' });
    return;
  }

  db.prepare('DELETE FROM workload_label_mappings WHERE rule_id = ?').run(req.params.id);
  db.prepare('DELETE FROM k8s_label_mapping_rules WHERE id = ?').run(req.params.id);
  logAudit('label_mapping_rule', req.params.id, rule.name, 'deleted', user.id);
  res.status(204).send();
});

// POST /rules/:id/preview — preview a specific rule's matches
router.post('/rules/:id/preview', (req, res) => {
  const db = getDb();
  const rule = db
    .prepare('SELECT * FROM k8s_label_mapping_rules WHERE id = ?')
    .get(req.params.id) as MappingRule | undefined;

  if (!rule) {
    res.status(404).json({ error: 'Rule not found' });
    return;
  }

  const workloads = getK8sWorkloadsWithContext();
  const results: Array<{
    workload_id: string;
    workload_name: string;
    cluster: string;
    namespace: string;
    k8s_labels: Record<string, string>;
    matched: boolean;
    proposed_dimension: string;
    proposed_value: string | null;
    current_labels: Array<{ key: string; value: string }>;
  }> = [];

  for (const wl of workloads) {
    const ctx = buildWorkloadContext(wl);
    const matched = matchesRule(rule, ctx);
    const proposedValue = matched ? computeTargetValue(rule, ctx) : null;

    results.push({
      workload_id: wl.id,
      workload_name: wl.name,
      cluster: wl.cluster_name,
      namespace: wl.namespace_name,
      k8s_labels: ctx.k8s_labels,
      matched,
      proposed_dimension: rule.target_dimension,
      proposed_value: proposedValue,
      current_labels: wl.labels,
    });
  }

  const matched = results.filter((r) => r.matched);
  const unmatched = results.filter((r) => !r.matched);

  res.json({
    total_workloads: results.length,
    matched_count: matched.length,
    unmatched_count: unmatched.length,
    matched: matched,
    unmatched: unmatched,
  });
});

// POST /preview-expression — validate and preview an expression without saving
router.post('/preview-expression', (req, res) => {
  const { expression } = req.body;

  if (!expression?.trim()) {
    res.status(400).json({ error: 'Expression is required' });
    return;
  }

  try {
    parseExpression(expression);
  } catch (e) {
    res.status(400).json({
      valid: false,
      error: e instanceof Error ? e.message : String(e),
    });
    return;
  }

  const workloads = getK8sWorkloadsWithContext();
  const tempRule: MappingRule = {
    id: 'preview',
    name: 'Preview',
    enabled: 1,
    priority: 0,
    match_mode: 'expression',
    conditions: '[]',
    condition_logic: 'AND',
    expression,
    target_dimension: 'app',
    target_value_mode: 'static',
    target_value: '',
    target_source_field: '',
    target_transform: '',
    regex_pattern: '',
    regex_capture_group: 1,
    conflict_behavior: 'skip',
  };

  const matched: Array<{ id: string; name: string; cluster: string; namespace: string; k8s_labels: Record<string, string> }> = [];
  for (const wl of workloads) {
    const ctx = buildWorkloadContext(wl);
    if (matchesRule(tempRule, ctx)) {
      matched.push({
        id: wl.id,
        name: wl.name,
        cluster: wl.cluster_name,
        namespace: wl.namespace_name,
        k8s_labels: ctx.k8s_labels,
      });
    }
  }

  res.json({
    valid: true,
    matched_count: matched.length,
    total_workloads: workloads.length,
    matched,
  });
});

// POST /evaluate — run all enabled rules and store mappings
router.post('/evaluate', (req, res) => {
  const user = (req as unknown as AuthenticatedRequest).user;
  const db = getDb();

  const rules = db
    .prepare('SELECT * FROM k8s_label_mapping_rules WHERE enabled = 1 ORDER BY priority ASC')
    .all() as MappingRule[];

  const workloads = getK8sWorkloadsWithContext();
  const results = evaluateRules(rules, workloads);

  db.prepare('DELETE FROM workload_label_mappings').run();

  const insert = db.prepare(
    `INSERT INTO workload_label_mappings
     (id, workload_id, rule_id, label_dimension, label_value, provenance, conflict, conflict_detail, evaluated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
  );

  const insertMany = db.transaction(() => {
    for (const r of results) {
      insert.run(
        uuid(),
        r.workload_id,
        r.rule_id,
        r.label_dimension,
        r.proposed_value,
        r.provenance,
        r.conflict ? 1 : 0,
        r.conflict_detail,
      );
    }
  });
  insertMany();

  logAudit('label_mapping', 'system', 'Evaluate All', 'evaluated', user.id, {
    rules_count: rules.length,
    results_count: results.length,
  });

  res.json({
    rules_evaluated: rules.length,
    workloads_evaluated: workloads.length,
    mappings_created: results.length,
    conflicts: results.filter((r) => r.conflict).length,
  });
});

// GET /coverage — coverage statistics
router.get('/coverage', (_req, res) => {
  const db = getDb();

  const totalK8s = (
    db.prepare("SELECT count(*) as c FROM workloads WHERE type = 'k8s_pod'").get() as { c: number }
  ).c;

  const mappings = db
    .prepare(
      `SELECT workload_id, label_dimension, label_value, conflict
       FROM workload_label_mappings`,
    )
    .all() as Array<{
    workload_id: string;
    label_dimension: string;
    label_value: string;
    conflict: number;
  }>;

  const workloadDims = new Map<string, Set<string>>();
  const conflictWorkloads = new Set<string>();

  for (const m of mappings) {
    if (!workloadDims.has(m.workload_id)) workloadDims.set(m.workload_id, new Set());
    workloadDims.get(m.workload_id)!.add(m.label_dimension);
    if (m.conflict) conflictWorkloads.add(m.workload_id);
  }

  const requiredDims = ['role', 'app', 'env', 'loc'];
  let fullyMapped = 0;
  let partiallyMapped = 0;

  for (const [, dims] of workloadDims) {
    if (requiredDims.every((d) => dims.has(d))) {
      fullyMapped++;
    } else {
      partiallyMapped++;
    }
  }

  const mapped = workloadDims.size;
  const unmapped = totalK8s - mapped;

  const rulesCount = (
    db.prepare('SELECT count(*) as c FROM k8s_label_mapping_rules').get() as { c: number }
  ).c;
  const enabledRules = (
    db.prepare('SELECT count(*) as c FROM k8s_label_mapping_rules WHERE enabled = 1').get() as {
      c: number;
    }
  ).c;

  const dimensionCoverage: Record<string, number> = {};
  for (const dim of requiredDims) {
    const covered = new Set<string>();
    for (const [wId, dims] of workloadDims) {
      if (dims.has(dim)) covered.add(wId);
    }
    dimensionCoverage[dim] = covered.size;
  }

  res.json({
    total_k8s_workloads: totalK8s,
    fully_mapped: fullyMapped,
    partially_mapped: partiallyMapped,
    unmapped,
    conflicts: conflictWorkloads.size,
    total_rules: rulesCount,
    enabled_rules: enabledRules,
    dimension_coverage: dimensionCoverage,
  });
});

// GET /field-values — distinct values for a given workload field
router.get('/field-values', (req, res) => {
  const field = req.query.field as string;
  if (!field) {
    res.status(400).json({ error: 'field query parameter is required' });
    return;
  }

  const db = getDb();
  let values: string[] = [];

  if (field === 'namespace') {
    values = (db.prepare('SELECT DISTINCT name FROM k8s_namespaces ORDER BY name').all() as Array<{ name: string }>)
      .map((r) => r.name);
  } else if (field === 'cluster') {
    values = (db.prepare('SELECT DISTINCT name FROM k8s_clusters ORDER BY name').all() as Array<{ name: string }>)
      .map((r) => r.name);
  } else if (field === 'workload_name' || field === 'deployment' || field === 'pod') {
    values = (db.prepare("SELECT DISTINCT name FROM workloads WHERE type = 'k8s_pod' ORDER BY name").all() as Array<{ name: string }>)
      .map((r) => r.name);
  } else if (field === 'node') {
    values = (db.prepare("SELECT DISTINCT hostname FROM workloads WHERE type = 'k8s_pod' ORDER BY hostname").all() as Array<{ hostname: string }>)
      .map((r) => r.hostname);
  } else if (field.startsWith('k8s.labels.') || field.startsWith('k8s.annotations.')) {
    const labelKey = field.startsWith('k8s.labels.') ? field.slice(11) : field.slice(17);
    const workloads = db.prepare("SELECT labels FROM workloads WHERE type = 'k8s_pod'").all() as Array<{ labels: string }>;
    const valuesSet = new Set<string>();
    for (const w of workloads) {
      const labels = JSON.parse(w.labels || '[]') as Array<{ key: string; value: string }>;
      for (const l of labels) {
        if (l.key === labelKey) valuesSet.add(l.value);
      }
    }
    values = [...valuesSet].sort();
  } else {
    values = [];
  }

  res.json({ field, values });
});

export default router;
