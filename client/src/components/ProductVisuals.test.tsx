import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductIcon, ProductIllustration } from './ProductVisuals.js';

describe('ProductIcon', () => {
  it('renders a policy icon', () => {
    render(<ProductIcon name="policy" label="Policy" />);
    expect(screen.getByLabelText('Policy')).toBeInTheDocument();
  });

  it('renders with default color and size', () => {
    const { container } = render(<ProductIcon name="rules" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});

describe('ProductIllustration', () => {
  it.each(['policies', 'templates', 'rules', 'ingress', 'egress'] as const)(
    'renders %s illustration without crashing',
    (kind) => {
      const { container } = render(<ProductIllustration kind={kind} />);
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThanOrEqual(2);
    },
  );
});
