import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '../../api/client';
import { renderWithProviders } from '../../test/utils';
import { Lobby } from './Lobby';

function mockGamesFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        games: [
          { slug: 'demo-slots', name: 'Demo Slots', description: 'A classic slot machine.', minBet: 10, maxBet: 100 },
        ],
      }),
    }),
  );
}

describe('Lobby', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockGamesFetch();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches and renders the live game catalog for a guest', async () => {
    renderWithProviders(<Lobby />);

    expect(screen.getByRole('heading', { name: 'Lobby' })).toBeInTheDocument();
    expect(screen.getByText('You are browsing as a guest')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/games`, expect.objectContaining({ method: 'GET' }));
    });

    expect(await screen.findByText('Demo Slots')).toBeInTheDocument();
    expect(screen.getByText('A classic slot machine.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log in to play' })).toBeInTheDocument();
  });
});
