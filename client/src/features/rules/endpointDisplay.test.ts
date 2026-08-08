import { describe, it, expect } from 'vitest';
import { getFilterColor, fieldLabel, isNegatedOperator, getDisplayValue } from './endpointDisplay.js';

describe('getFilterColor', () => {
  it('returns purple for label_group', () => {
    expect(getFilterColor('label_group')).toBe('purple');
  });

  it('returns default for label_ prefix', () => {
    expect(getFilterColor('label_app')).toBe('default');
  });

  it('returns orange for ip_list', () => {
    expect(getFilterColor('ip_list')).toBe('orange');
  });

  it('returns default for unknown field', () => {
    expect(getFilterColor('unknown_field')).toBe('default');
  });
});

describe('fieldLabel', () => {
  it('returns mapped labels for known fields', () => {
    expect(fieldLabel('label_role')).toBe('Role');
    expect(fieldLabel('ip_list')).toBe('IP List');
    expect(fieldLabel('workload')).toBe('Workload');
    expect(fieldLabel('k8s_cluster')).toBe('Cluster');
  });

  it('returns title-cased fallback for unknown fields', () => {
    expect(fieldLabel('label_custom')).toBe('Custom');
  });
});

describe('isNegatedOperator', () => {
  it('returns true for negated operators', () => {
    expect(isNegatedOperator('is_not')).toBe(true);
    expect(isNegatedOperator('is_none_of')).toBe(true);
    expect(isNegatedOperator('does_not_exist')).toBe(true);
    expect(isNegatedOperator('does_not_match')).toBe(true);
  });

  it('returns false for non-negated operators', () => {
    expect(isNegatedOperator('is')).toBe(false);
    expect(isNegatedOperator('is_any_of')).toBe(false);
    expect(isNegatedOperator('exists')).toBe(false);
  });
});

describe('getDisplayValue', () => {
  it('formats enum filter with = operator', () => {
    const result = getDisplayValue({
      field: 'label_app',
      operator: 'is',
      value: { type: 'enum', value: 'web' },
    });
    expect(result).toBe('App=web');
  });

  it('formats empty value filter', () => {
    const result = getDisplayValue({
      field: 'label_role',
      operator: 'exists',
      value: { type: 'empty' },
    });
    expect(result).toBe('Role exists');
  });

  it('formats enum_list filter', () => {
    const result = getDisplayValue({
      field: 'label_env',
      operator: 'is_any_of',
      value: { type: 'enum_list', value: ['prod', 'staging'] },
    });
    expect(result).toBe('Env in [prod, staging]');
  });

  it('formats entity_list filter', () => {
    const result = getDisplayValue({
      field: 'workload',
      operator: 'is',
      value: { type: 'entity_list', value: [{ id: 'w1', label: 'Server A' }] },
    });
    expect(result).toBe('Server A');
  });

  it('formats negated entity_list filter', () => {
    const result = getDisplayValue({
      field: 'workload',
      operator: 'is_not',
      value: { type: 'entity_list', value: [{ id: 'w1', label: 'Server A' }] },
    });
    expect(result).toBe('Workload: is not Server A');
  });

  it('handles null value', () => {
    const result = getDisplayValue({
      field: 'label_app',
      operator: 'is',
      value: null,
    });
    expect(result).toBe('App =');
  });
});
