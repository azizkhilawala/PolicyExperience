import type Database from 'better-sqlite3';

export interface LabelPair {
  key: string;
  value: string;
}

export interface ImpactWorkload {
  id: string;
  name: string;
  hostname: string;
  ip: string;
  type: string;
  labels: LabelPair[];
  enforcement_mode: string;
  managed: number;
  online: number;
}

export interface ImpactResult {
  total: number;
  workloads: ImpactWorkload[];
  by_label: Record<string, Record<string, number>>;
}

export function matchesScope(
  workloadLabels: LabelPair[],
  scopeLabels: LabelPair[],
): boolean {
  if (scopeLabels.length === 0) return true;
  return scopeLabels.every((scope) =>
    workloadLabels.some(
      (wl) => wl.key === scope.key && wl.value === scope.value,
    ),
  );
}

export function computeImpact(
  db: Database.Database,
  scopeLabels: LabelPair[],
): ImpactResult {
  const rows = db
    .prepare(
      'SELECT id, name, hostname, ip, type, labels, enforcement_mode, managed, online FROM workloads ORDER BY name',
    )
    .all() as Array<{
    id: string;
    name: string;
    hostname: string;
    ip: string;
    type: string;
    labels: string;
    enforcement_mode: string;
    managed: number;
    online: number;
  }>;

  const matched: ImpactWorkload[] = [];
  const byLabel: Record<string, Record<string, number>> = {};

  for (const row of rows) {
    const labels: LabelPair[] = JSON.parse(row.labels);
    if (!matchesScope(labels, scopeLabels)) continue;

    matched.push({
      id: row.id,
      name: row.name,
      hostname: row.hostname,
      ip: row.ip,
      type: row.type,
      labels,
      enforcement_mode: row.enforcement_mode,
      managed: row.managed,
      online: row.online,
    });

    for (const l of labels) {
      if (!byLabel[l.key]) byLabel[l.key] = {};
      byLabel[l.key][l.value] = (byLabel[l.key][l.value] ?? 0) + 1;
    }
  }

  return { total: matched.length, workloads: matched, by_label: byLabel };
}
