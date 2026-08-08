import { HStack } from '@astryxdesign/core/HStack';

interface DirectionVisualProps {
  direction: 'ingress' | 'egress';
}

function GlobeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="8" stroke="var(--color-gray-600)" strokeWidth="1.5" fill="none" />
      <ellipse cx="10" cy="10" rx="4" ry="8" stroke="var(--color-gray-600)" strokeWidth="1.2" fill="none" />
      <line x1="2" y1="10" x2="18" y2="10" stroke="var(--color-gray-600)" strokeWidth="1.2" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="14" height="14" rx="2" stroke="var(--color-blue-600)" strokeWidth="1.5" fill="var(--color-blue-100)" />
      <line x1="10" y1="3" x2="10" y2="17" stroke="var(--color-blue-600)" strokeWidth="1" opacity="0.4" />
      <line x1="3" y1="10" x2="17" y2="10" stroke="var(--color-blue-600)" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="24" height="12" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="0" y1="6" x2="18" y2="6" stroke="var(--color-gray-500)" strokeWidth="1.5" />
      <polyline points="15,2 20,6 15,10" stroke="var(--color-gray-500)" strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function DirectionVisual({ direction }: DirectionVisualProps) {
  if (direction === 'ingress') {
    return (
      <HStack gap={0.5} vAlign="center">
        <GlobeIcon />
        <ArrowIcon />
        <BoxIcon />
      </HStack>
    );
  }
  return (
    <HStack gap={0.5} vAlign="center">
      <BoxIcon />
      <ArrowIcon />
      <GlobeIcon />
    </HStack>
  );
}
