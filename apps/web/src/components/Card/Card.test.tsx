import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from './Card';

describe('Card', () => {
  it('renders its children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders an optional title', () => {
    render(<Card title="My Title">Card content</Card>);
    expect(screen.getByRole('heading', { name: 'My Title' })).toBeInTheDocument();
  });
});
