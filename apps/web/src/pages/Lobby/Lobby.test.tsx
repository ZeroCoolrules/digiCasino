import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/utils';
import { Lobby } from './Lobby';

describe('Lobby', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the lobby with placeholder games for a guest', () => {
    renderWithProviders(<Lobby />);

    expect(screen.getByRole('heading', { name: 'Lobby' })).toBeInTheDocument();
    expect(screen.getByText('You are browsing as a guest')).toBeInTheDocument();
    expect(screen.getByText('Demo Slots')).toBeInTheDocument();
  });
});
