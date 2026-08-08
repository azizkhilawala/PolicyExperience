import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActionToken } from './ActionToken.js';

describe('ActionToken', () => {
  it('renders Allow token', () => {
    render(<ActionToken action="allow" />);
    expect(screen.getByText('Allow')).toBeInTheDocument();
  });

  it('renders Deny token', () => {
    render(<ActionToken action="deny" />);
    expect(screen.getByText('Deny')).toBeInTheDocument();
  });

  it('renders Override Deny token with wrapper styling', () => {
    render(<ActionToken action="override_deny" />);
    expect(screen.getByText('Override Deny')).toBeInTheDocument();
  });
});
