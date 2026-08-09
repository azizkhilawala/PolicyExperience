import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { server } from '../test/mocks/server.js';
import { mockLabels } from '../test/mocks/handlers.js';
import { LabelsProvider } from '../hooks/useLabels.js';
import { ScopeSearch } from './ScopeSearch.js';

function Wrapper({ children }: { children: ReactNode }) {
  return <LabelsProvider>{children}</LabelsProvider>;
}

describe('ScopeSearch', () => {
  it('renders the search input', async () => {
    server.use(http.get('/api/labels', () => HttpResponse.json(mockLabels)));

    render(
      <Wrapper>
        <ScopeSearch labels={[]} onChange={() => {}} />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add scope labels…')).toBeInTheDocument();
    });
  });

  it('renders with existing labels', async () => {
    server.use(http.get('/api/labels', () => HttpResponse.json(mockLabels)));

    render(
      <Wrapper>
        <ScopeSearch labels={[{ key: 'env', value: 'production' }]} onChange={() => {}} />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('production')).toBeInTheDocument();
    });
  });

  it('renders in disabled state', async () => {
    server.use(http.get('/api/labels', () => HttpResponse.json(mockLabels)));

    render(
      <Wrapper>
        <ScopeSearch labels={[]} onChange={() => {}} isDisabled />
      </Wrapper>,
    );

    await waitFor(() => {
      const input = screen.getByPlaceholderText('Add scope labels…');
      expect(input).toBeInTheDocument();
    });
  });
});
