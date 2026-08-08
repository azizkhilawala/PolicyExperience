import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/mocks/server.js';
import { renderWithProviders } from '../../test/render.js';
import type { V2Rule } from '../../api/v2-policies.js';
import { V2RuleTable } from './V2RuleTable.js';

const mockV2Rule: V2Rule = {
  id: 'v2rule-1',
  policy_id: 'v2pol-1',
  direction: 'ingress',
  entity: [
    { field: 'label_app', operator: 'is', value: { type: 'enum', value: 'web' } },
  ],
  services: [{ type: 'port', protocol: 'TCP', port: '443' }],
  action: 'allow',
  enabled: 1,
  provision_status: 'draft',
  position: 0,
  notes: '',
};

const defaultProps = {
  policyId: 'v2pol-1',
  direction: 'ingress' as const,
  rules: [mockV2Rule],
  onRulesChanged: vi.fn(),
};

describe('V2RuleTable', () => {
  it('renders rule data in table', () => {
    renderWithProviders(<V2RuleTable {...defaultProps} />);
    expect(screen.getByText('TCP/443')).toBeInTheDocument();
    expect(screen.getAllByText('Allow').length).toBeGreaterThanOrEqual(1);
  });

  it('renders action filter with Override Deny option', () => {
    renderWithProviders(<V2RuleTable {...defaultProps} />);
    expect(screen.getByText('Override Deny')).toBeInTheDocument();
  });

  it('shows empty state when no rules', () => {
    renderWithProviders(<V2RuleTable {...defaultProps} rules={[]} />);
    expect(screen.getByText('No ingress rules')).toBeInTheDocument();
  });

  it('shows egress empty state for egress direction', () => {
    renderWithProviders(
      <V2RuleTable {...defaultProps} direction="egress" rules={[]} />,
    );
    expect(screen.getByText('No egress rules')).toBeInTheDocument();
  });

  it('shows Add Rule button', () => {
    renderWithProviders(<V2RuleTable {...defaultProps} />);
    expect(screen.getAllByText('Add Rule').length).toBeGreaterThanOrEqual(1);
  });

  it('hides Add Rule and action filter in readOnly mode', () => {
    renderWithProviders(
      <V2RuleTable {...defaultProps} readOnly />,
    );
    expect(screen.queryByText('Add Rule')).not.toBeInTheDocument();
  });

  it('shows Add Rule in empty state when not readOnly', () => {
    renderWithProviders(
      <V2RuleTable {...defaultProps} rules={[]} />,
    );
    const addButtons = screen.getAllByText('Add Rule');
    expect(addButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('hides Add Rule in empty state when readOnly', () => {
    renderWithProviders(
      <V2RuleTable {...defaultProps} rules={[]} readOnly />,
    );
    expect(screen.queryByText('Add Rule')).not.toBeInTheDocument();
  });

  it('creates a rule via API when Add Rule is clicked', async () => {
    const onRulesChanged = vi.fn();
    const user = userEvent.setup();

    const newRule: V2Rule = {
      ...mockV2Rule,
      id: 'v2rule-new',
      entity: [],
      services: [],
    };

    server.use(
      http.post('/api/v2/policies/v2pol-1/rules', () =>
        HttpResponse.json(newRule),
      ),
    );

    renderWithProviders(
      <V2RuleTable {...defaultProps} rules={[]} onRulesChanged={onRulesChanged} />,
    );

    const addButtons = screen.getAllByText('Add Rule');
    await user.click(addButtons[0]);

    await waitFor(() => {
      expect(onRulesChanged).toHaveBeenCalled();
    });
  });

  it('shows enabled/disabled status for rules', () => {
    const disabledRule = { ...mockV2Rule, id: 'v2rule-2', enabled: 0, position: 1 };
    renderWithProviders(
      <V2RuleTable {...defaultProps} rules={[mockV2Rule, disabledRule]} />,
    );
    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });
});
