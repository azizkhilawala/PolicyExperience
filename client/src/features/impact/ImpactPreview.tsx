import { useState, useEffect, useRef } from 'react';
import { Token } from '@astryxdesign/core/Token';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { computeImpact, type ImpactResult } from '../../api/impact.js';
import { ImpactDialog } from './ImpactDialog.js';

interface ImpactPreviewProps {
  scopeLabels: Array<{ key: string; value: string }>;
}

export function ImpactPreview({ scopeLabels }: ImpactPreviewProps) {
  const [result, setResult] = useState<ImpactResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setLoading(true);
      computeImpact(scopeLabels)
        .then(setResult)
        .catch(() => setResult(null))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [JSON.stringify(scopeLabels)]);

  if (loading) return <Skeleton width={100} height={24} />;
  if (!result) return null;

  const label =
    result.total === 0
      ? 'No workloads matched'
      : `${result.total} workload${result.total === 1 ? '' : 's'}`;

  return (
    <>
      <Tooltip content={`${result.total} workloads match this scope`}>
        <Token
          label={label}
          color={result.total === 0 ? 'gray' : 'blue'}
          size="sm"
          onClick={() => result.total > 0 && setDialogOpen(true)}
        />
      </Tooltip>
      {dialogOpen && result && (
        <ImpactDialog
          result={result}
          isOpen={dialogOpen}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </>
  );
}
