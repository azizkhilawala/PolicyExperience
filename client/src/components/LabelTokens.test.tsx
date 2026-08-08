import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LabelTokens } from './LabelTokens.js';

describe('LabelTokens', () => {
  it('renders "All workloads" when labels is empty', () => {
    render(<LabelTokens labels={[]} />);
    expect(screen.getByText('All workloads')).toBeInTheDocument();
  });

  it('renders "All workloads" when labels is null-ish', () => {
    render(<LabelTokens labels={null as any} />);
    expect(screen.getByText('All workloads')).toBeInTheDocument();
  });

  it('renders key=value tokens for each label', () => {
    const labels = [
      { key: 'app', value: 'web' },
      { key: 'env', value: 'prod' },
    ];
    render(<LabelTokens labels={labels} />);
    expect(screen.getByText('app=web')).toBeInTheDocument();
    expect(screen.getByText('env=prod')).toBeInTheDocument();
  });
});
