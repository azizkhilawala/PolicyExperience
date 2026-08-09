import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server.js';
import { mockV2Policy, mockV2Template } from '../test/mocks/handlers.js';
import { renderWithProviders } from '../test/render.js';
import V2PolicyListPage from './V2PolicyListPage.js';

describe('V2PolicyListPage', () => {
  it('shows Policies and Templates tabs', () => {
    renderWithProviders(<V2PolicyListPage />);
    expect(screen.getByRole('button', { name: 'Policies' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Templates' })).toBeInTheDocument();
  });

  it('shows Create Policy button on Policies tab', () => {
    renderWithProviders(<V2PolicyListPage />);
    expect(screen.getByText('Create Policy')).toBeInTheDocument();
  });

  it('shows a policy row when API returns data', async () => {
    server.use(http.get('/api/v2/policies', () => HttpResponse.json([mockV2Policy])));

    renderWithProviders(<V2PolicyListPage />);

    await waitFor(() => {
      expect(screen.getByText('V2 Segmentation Policy')).toBeInTheDocument();
    });
  });

  it('shows empty state when no policies exist', async () => {
    server.use(http.get('/api/v2/policies', () => HttpResponse.json([])));

    renderWithProviders(<V2PolicyListPage />);

    await waitFor(() => {
      expect(screen.getByText('No v2 policies found')).toBeInTheDocument();
    });
  });

  it('switches to Templates tab and shows Create Template button', async () => {
    const user = userEvent.setup();

    renderWithProviders(<V2PolicyListPage />);

    await user.click(screen.getByRole('button', { name: 'Templates' }));

    await waitFor(() => {
      expect(screen.getByText('Create Template')).toBeInTheDocument();
    });
  });

  it('shows template data on Templates tab', async () => {
    const user = userEvent.setup();

    server.use(http.get('/api/v2/templates', () => HttpResponse.json([mockV2Template])));

    renderWithProviders(<V2PolicyListPage />);

    await user.click(screen.getByRole('button', { name: 'Templates' }));

    await waitFor(() => {
      expect(screen.getByText('Web Server Template')).toBeInTheDocument();
    });
  });

  it('shows empty templates state when no templates exist', async () => {
    const user = userEvent.setup();

    server.use(http.get('/api/v2/templates', () => HttpResponse.json([])));

    renderWithProviders(<V2PolicyListPage />);

    await user.click(screen.getByRole('button', { name: 'Templates' }));

    await waitFor(() => {
      expect(screen.getByText('No templates found')).toBeInTheDocument();
    });
  });
});
