import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { render } from '@testing-library/react';
import { server } from '../../test/mocks/server.js';
import { ImpactPreview } from './ImpactPreview.js';

const mockImpactResult = {
  total: 5,
  workloads: [
    {
      id: 'w1',
      name: 'hrm-web-01',
      hostname: 'hrm-web-01.illumio.internal',
      ip: '10.1.1.1',
      type: 'vm',
      labels: [
        { key: 'app', value: 'HRM' },
        { key: 'role', value: 'web' },
      ],
      enforcement_mode: 'full',
      managed: 1,
      online: 1,
    },
  ],
  by_label: { app: { HRM: 5 }, role: { web: 2, api: 3 } },
};

describe('ImpactPreview', () => {
  it('shows workload count after API resolves', async () => {
    server.use(
      http.post('/api/impact/compute', () =>
        HttpResponse.json(mockImpactResult),
      ),
    );

    render(
      <ImpactPreview scopeLabels={[{ key: 'app', value: 'HRM' }]} />,
    );

    await waitFor(() => {
      expect(screen.getByText('5 workloads')).toBeInTheDocument();
    });
  });

  it('shows "No workloads matched" for empty result', async () => {
    server.use(
      http.post('/api/impact/compute', () =>
        HttpResponse.json({ total: 0, workloads: [], by_label: {} }),
      ),
    );

    render(
      <ImpactPreview scopeLabels={[{ key: 'app', value: 'NONEXISTENT' }]} />,
    );

    await waitFor(() => {
      expect(screen.getByText('No workloads matched')).toBeInTheDocument();
    });
  });
});
