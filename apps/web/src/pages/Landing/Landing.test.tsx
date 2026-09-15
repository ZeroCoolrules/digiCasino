import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/utils';
import { Landing } from './Landing';

describe('Landing', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the hero heading and calls-to-action', () => {
    renderWithProviders(<Landing />);

    expect(screen.getByRole('heading', { name: 'digiCasino' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create a free account/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument();
  });
});
