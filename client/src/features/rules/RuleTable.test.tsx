import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Rule } from '../../api/policies.js';
import { RuleTable } from './RuleTable.js';

const mockRule: Rule = {
  id: 'rule-1',
  policy_id: 'pol-1',
  source: { filters: [] },
  destination: { filters: [] },
  services: [{ protocol: 'TCP', port: '443' }],
  action: 'allow',
  scope_type: 'intra',
  enabled: 1,
  position: 1,
  notes: '',
  logging: 0,
  stateless: 0,
};

const denyRule: Rule = {
  ...mockRule,
  id: 'rule-2',
  action: 'deny',
  position: 2,
};

const defaultProps = {
  rules: [mockRule, denyRule],
  scopeLabels: [{ key: 'env', value: 'prod' }],
  isLocked: false,
  provisionStatus: 'draft' as const,
  onUpdate: vi.fn(() => Promise.resolve()),
  onDelete: vi.fn(() => Promise.resolve()),
  onDuplicate: vi.fn(() => Promise.resolve()),
};

describe('RuleTable', () => {
  it('renders the action filter segmented control', () => {
    render(<RuleTable {...defaultProps} />);
    const filterGroup = screen.getByRole('radiogroup', { name: 'Filter by action' });
    expect(within(filterGroup).getByText('All')).toBeInTheDocument();
    expect(within(filterGroup).getByText('Allow')).toBeInTheDocument();
    expect(within(filterGroup).getByText('Deny')).toBeInTheDocument();
  });

  it('renders rule rows with service tokens', () => {
    render(<RuleTable {...defaultProps} />);
    expect(screen.getAllByText('TCP 443').length).toBeGreaterThanOrEqual(1);
  });

  it('shows action tokens for allow and deny rules', () => {
    render(<RuleTable {...defaultProps} />);
    expect(screen.getAllByText('Allow').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Deny').length).toBeGreaterThanOrEqual(2);
  });

  it('filters to only allow rules when Allow filter is clicked', async () => {
    const user = userEvent.setup();
    render(<RuleTable {...defaultProps} />);

    const filterGroup = screen.getByRole('radiogroup', { name: 'Filter by action' });
    await user.click(within(filterGroup).getByText('Allow'));

    const denyTokens = screen.queryAllByText('Deny');
    const denyOutsideFilter = denyTokens.filter(
      (el) => !filterGroup.contains(el),
    );
    expect(denyOutsideFilter.length).toBe(0);
  });

  it('renders with empty rules array', () => {
    render(<RuleTable {...defaultProps} rules={[]} />);
    const filterGroup = screen.getByRole('radiogroup', { name: 'Filter by action' });
    expect(filterGroup).toBeInTheDocument();
  });
});
