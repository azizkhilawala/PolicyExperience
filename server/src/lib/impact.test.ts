import { describe, it, expect } from 'vitest';
import { matchesScope } from './impact.js';

describe('matchesScope', () => {
  it('matches all workloads when scope is empty', () => {
    expect(matchesScope([{ key: 'app', value: 'HRM' }], [])).toBe(true);
    expect(matchesScope([], [])).toBe(true);
  });

  it('matches when workload has the exact label', () => {
    expect(
      matchesScope(
        [{ key: 'app', value: 'HRM' }],
        [{ key: 'app', value: 'HRM' }],
      ),
    ).toBe(true);
  });

  it('does not match when value differs', () => {
    expect(
      matchesScope(
        [{ key: 'app', value: 'ERP' }],
        [{ key: 'app', value: 'HRM' }],
      ),
    ).toBe(false);
  });

  it('does not match when key is missing', () => {
    expect(
      matchesScope(
        [{ key: 'role', value: 'web' }],
        [{ key: 'app', value: 'HRM' }],
      ),
    ).toBe(false);
  });

  it('matches when all scope labels are present', () => {
    expect(
      matchesScope(
        [
          { key: 'app', value: 'HRM' },
          { key: 'env', value: 'prod' },
          { key: 'role', value: 'web' },
        ],
        [
          { key: 'app', value: 'HRM' },
          { key: 'env', value: 'prod' },
        ],
      ),
    ).toBe(true);
  });

  it('does not match when only some scope labels are present', () => {
    expect(
      matchesScope(
        [
          { key: 'app', value: 'HRM' },
          { key: 'env', value: 'dev' },
        ],
        [
          { key: 'app', value: 'HRM' },
          { key: 'env', value: 'prod' },
        ],
      ),
    ).toBe(false);
  });

  it('matches when workload has extra labels beyond scope', () => {
    expect(
      matchesScope(
        [
          { key: 'app', value: 'HRM' },
          { key: 'env', value: 'prod' },
          { key: 'role', value: 'web' },
          { key: 'loc', value: 'us-east' },
        ],
        [{ key: 'app', value: 'HRM' }],
      ),
    ).toBe(true);
  });

  it('does not match when workload has no labels but scope is non-empty', () => {
    expect(
      matchesScope([], [{ key: 'app', value: 'HRM' }]),
    ).toBe(false);
  });
});
