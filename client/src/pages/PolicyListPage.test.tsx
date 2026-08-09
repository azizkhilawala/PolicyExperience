import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server.js';
import { mockPolicy } from '../test/mocks/handlers.js';
import { renderWithProviders } from '../test/render.js';
import PolicyListPage from './PolicyListPage.js';

describe('PolicyListPage', () => {
  it('shows loading spinner initially', () => {
    renderWithProviders(<PolicyListPage />);
    expect(screen.getByText('Loading policies…')).toBeInTheDocument();
  });

  it('shows empty state when API returns no policies', async () => {
    server.use(
      http.get('/api/policies', () =>
        HttpResponse.json({ data: [], total: 0, page: 1, limit: 50, totalPages: 0 }),
      ),
    );

    renderWithProviders(<PolicyListPage />);

    await waitFor(() => {
      expect(screen.getByText('No policies found')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Create Policy').length).toBeGreaterThanOrEqual(1);
  });

  it('shows a policy row when API returns data', async () => {
    server.use(
      http.get('/api/policies', () =>
        HttpResponse.json({ data: [mockPolicy], total: 1, page: 1, limit: 50, totalPages: 1 }),
      ),
    );

    renderWithProviders(<PolicyListPage />);

    await waitFor(() => {
      expect(screen.getByText('Production Policy')).toBeInTheDocument();
    });
  });

  it('shows tab filters', async () => {
    renderWithProviders(<PolicyListPage />);

    expect(screen.getByRole('button', { name: 'All Policies' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Organizational' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Application' })).toBeInTheDocument();
  });
});
