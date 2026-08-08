import { HStack } from '@astryxdesign/core/HStack';

import { ProductIcon } from '../../components/ProductVisuals.js';

interface DirectionVisualProps {
  direction: 'ingress' | 'egress';
}

export function DirectionVisual({ direction }: DirectionVisualProps) {
  if (direction === 'ingress') {
    return (
      <HStack gap={0.5} vAlign="center">
        <ProductIcon name="allWorkloads" size="sm" color="tertiary" />
        <ProductIcon name="arrowRight" size="sm" color="accent" />
        <ProductIcon name="scope" size="sm" color="secondary" />
      </HStack>
    );
  }

  return (
    <HStack gap={0.5} vAlign="center">
      <ProductIcon name="scope" size="sm" color="secondary" />
      <ProductIcon name="arrowRight" size="sm" color="accent" />
      <ProductIcon name="allWorkloads" size="sm" color="tertiary" />
    </HStack>
  );
}
