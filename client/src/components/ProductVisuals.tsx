import type { ComponentType, SVGProps } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Box,
  Boxes,
  CheckCircle2,
  FileSearch,
  Globe2,
  Layers3,
  ListPlus,
  Lock,
  Minus,
  Network,
  PencilLine,
  Plus,
  Route,
  Shield,
  ShieldCheck,
  Tags,
} from 'lucide-react';

import { Icon } from '@astryxdesign/core/Icon';
import { HStack } from '@astryxdesign/core/HStack';

type AstryxIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export type ProductIconName =
  | 'add'
  | 'allWorkloads'
  | 'app'
  | 'arrowLeft'
  | 'arrowRight'
  | 'cluster'
  | 'diff'
  | 'label'
  | 'lock'
  | 'modified'
  | 'policy'
  | 'provision'
  | 'removed'
  | 'rules'
  | 'scope'
  | 'service'
  | 'template'
  | 'workload';

type ProductIconColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'disabled'
  | 'accent'
  | 'success'
  | 'error'
  | 'warning'
  | 'inherit';

type ProductIconSize = 'xsm' | 'sm' | 'md' | 'lg';

const icons = {
  add: Plus,
  allWorkloads: Globe2,
  app: Layers3,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  cluster: Boxes,
  diff: FileSearch,
  label: Tags,
  lock: Lock,
  modified: PencilLine,
  policy: Shield,
  provision: CheckCircle2,
  removed: Minus,
  rules: ListPlus,
  scope: Route,
  service: Network,
  template: ShieldCheck,
  workload: Box,
};

interface ProductIconProps {
  name: ProductIconName;
  color?: ProductIconColor;
  size?: ProductIconSize;
  label?: string;
}

export function ProductIcon({ name, color = 'secondary', size = 'sm', label }: ProductIconProps) {
  const IconComponent = icons[name] as unknown as AstryxIconComponent;

  return <Icon icon={IconComponent} color={color} size={size} label={label} />;
}

export function ProductIllustration({
  kind,
}: {
  kind: 'policies' | 'templates' | 'rules' | 'ingress' | 'egress';
}) {
  if (kind === 'rules') {
    return (
      <HStack gap={1} hAlign="center" vAlign="center">
        <ProductIcon name="allWorkloads" size="lg" color="tertiary" />
        <ProductIcon name="arrowRight" size="md" color="accent" />
        <ProductIcon name="service" size="lg" color="tertiary" />
      </HStack>
    );
  }

  if (kind === 'ingress') {
    return (
      <HStack gap={1} hAlign="center" vAlign="center">
        <ProductIcon name="allWorkloads" size="lg" color="tertiary" />
        <ProductIcon name="arrowRight" size="md" color="accent" />
        <ProductIcon name="workload" size="lg" color="secondary" />
      </HStack>
    );
  }

  if (kind === 'egress') {
    return (
      <HStack gap={1} hAlign="center" vAlign="center">
        <ProductIcon name="workload" size="lg" color="secondary" />
        <ProductIcon name="arrowRight" size="md" color="accent" />
        <ProductIcon name="allWorkloads" size="lg" color="tertiary" />
      </HStack>
    );
  }

  if (kind === 'templates') {
    return (
      <HStack gap={1} hAlign="center" vAlign="center">
        <ProductIcon name="template" size="lg" color="accent" />
        <ProductIcon name="rules" size="md" color="secondary" />
        <ProductIcon name="policy" size="lg" color="tertiary" />
      </HStack>
    );
  }

  return (
    <HStack gap={1} hAlign="center" vAlign="center">
      <ProductIcon name="policy" size="lg" color="accent" />
      <ProductIcon name="label" size="md" color="secondary" />
      <ProductIcon name="cluster" size="lg" color="tertiary" />
    </HStack>
  );
}
