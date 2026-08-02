import { HStack } from '@astryxdesign/core/HStack';
import { Token } from '@astryxdesign/core/Token';

import type { PolicyLabel } from '../../api/policies.js';

interface GhostTokensProps {
  labels: PolicyLabel[];
}

export function GhostTokens({ labels }: GhostTokensProps) {
  if (labels.length === 0) return null;

  return (
    <HStack gap={0.5} wrap="wrap">
      {labels.map((l, i) => (
        <Token
          key={`${l.key}-${l.value}-${i}`}
          label={`${l.key}: ${l.value}`}
          color="gray"
          isDisabled
          size="sm"
        />
      ))}
    </HStack>
  );
}
