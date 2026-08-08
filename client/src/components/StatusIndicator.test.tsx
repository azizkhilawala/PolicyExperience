import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusIndicator } from './StatusIndicator.js';

describe('StatusIndicator', () => {
  it('renders "Enabled" when enabled is true', () => {
    render(<StatusIndicator enabled={true} />);
    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });

  it('renders "Disabled" when enabled is false', () => {
    render(<StatusIndicator enabled={false} />);
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });
});
