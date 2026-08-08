import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProvisionBadge } from './ProvisionBadge.js';

describe('ProvisionBadge', () => {
  it.each([
    ['draft', 'Draft'],
    ['provisioned', 'Provisioned'],
    ['pending', 'Pending'],
  ] as const)('renders "%s" as "%s"', (status, label) => {
    render(<ProvisionBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
