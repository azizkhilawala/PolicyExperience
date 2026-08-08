import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/mocks/server.js';
import { renderWithProviders } from '../../test/render.js';
import { RuleEditor } from './RuleEditor.js';

const mockRule = {
  id: 'rule-1',
  policy_id: 'pol-1',
  source: { filters: [] },
  destination: { filters: [] },
  services: [{ protocol: 'TCP', port: '443' }],
  action: 'allow' as const,
  scope_type: 'intra' as const,
  enabled: 1,
  position: 1,
  notes: '',
  logging: 0,
  stateless: 0,
};

const defaultProps = {
  policyId: 'pol-1',
  scopeLabels: [{ key: 'env', value: 'production' }],
  isLocked: false,
  provisionStatus: 'draft' as const,
};

describe('RuleEditor', () => {
  it('shows loading spinner initially', () => {
    server.use(
      http.get('/api/policies/pol-1/rules', () =>
        new Promise(() => {}),
      ),
    );

    renderWithProviders(<RuleEditor {...defaultProps} />);
    expect(screen.getByText('Loading rules…')).toBeInTheDocument();
  });

  it('shows empty state when no rules exist', async () => {
    server.use(
      http.get('/api/policies/pol-1/rules', () => HttpResponse.json([])),
    );

    renderWithProviders(<RuleEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('No rules yet')).toBeInTheDocument();
    });
  });

  it('shows Add Rule button', async () => {
    server.use(
      http.get('/api/policies/pol-1/rules', () => HttpResponse.json([])),
    );

    renderWithProviders(<RuleEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Add Rule')).toBeInTheDocument();
    });
  });

  it('disables Add Rule when policy is locked', async () => {
    server.use(
      http.get('/api/policies/pol-1/rules', () => HttpResponse.json([])),
    );

    renderWithProviders(<RuleEditor {...defaultProps} isLocked={true} />);

    await waitFor(() => {
      const addButton = screen.getByText('Add Rule').closest('button');
      expect(addButton).toHaveAttribute('aria-disabled', 'true');
    });
  });

  it('shows error banner when API fails', async () => {
    server.use(
      http.get('/api/policies/pol-1/rules', () =>
        HttpResponse.json({ error: 'Connection refused' }, { status: 500 }),
      ),
    );

    renderWithProviders(<RuleEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Connection refused')).toBeInTheDocument();
    });
  });

  it('renders rules when data is returned', async () => {
    server.use(
      http.get('/api/policies/pol-1/rules', () =>
        HttpResponse.json([mockRule]),
      ),
    );

    renderWithProviders(<RuleEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Rules')).toBeInTheDocument();
      expect(screen.queryByText('No rules yet')).not.toBeInTheDocument();
    });
  });

  it('shows pending provision warning', async () => {
    server.use(
      http.get('/api/policies/pol-1/rules', () => HttpResponse.json([])),
    );

    renderWithProviders(
      <RuleEditor {...defaultProps} provisionStatus="pending" />,
    );

    await waitFor(() => {
      expect(
        screen.getByText('This policy has un-provisioned changes.'),
      ).toBeInTheDocument();
    });
  });
});
