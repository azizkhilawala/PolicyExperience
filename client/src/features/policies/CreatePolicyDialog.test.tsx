import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/mocks/server.js';
import { renderWithProviders } from '../../test/render.js';
import { CreatePolicyDialog } from './CreatePolicyDialog.js';

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onCreated: vi.fn(),
};

describe('CreatePolicyDialog', () => {
  it('renders dialog with form fields when open', async () => {
    renderWithProviders(<CreatePolicyDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Create Policy')).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/Policy Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByText('Create Draft')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('shows validation error when submitting without a name', async () => {
    const user = userEvent.setup();

    renderWithProviders(<CreatePolicyDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Create Draft')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Create Draft'));

    await waitFor(() => {
      expect(screen.getByText('Policy name is required')).toBeInTheDocument();
    });
  });

  it('submits successfully and calls onCreated', async () => {
    const onCreated = vi.fn();
    const user = userEvent.setup();

    const createdPolicy = {
      id: 'new-1',
      name: 'Test Policy',
      description: '',
      type: 'organizational',
      scope: [],
      enabled: 1,
      provision_status: 'draft',
      is_locked: 0,
      locked_by: null,
      locked_at: null,
      created_by: 'user-1',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };

    server.use(http.post('/api/policies', () => HttpResponse.json(createdPolicy)));

    renderWithProviders(<CreatePolicyDialog {...defaultProps} onCreated={onCreated} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Policy Name/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/Policy Name/i), 'Test Policy');
    await user.click(screen.getByText('Create Draft'));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith(createdPolicy);
    });
  });

  it('shows error banner when API fails', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('/api/policies', () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 }),
      ),
    );

    renderWithProviders(<CreatePolicyDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Policy Name/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/Policy Name/i), 'Fail Policy');
    await user.click(screen.getByText('Create Draft'));

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<CreatePolicyDialog {...defaultProps} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
