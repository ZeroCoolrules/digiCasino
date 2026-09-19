import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '../../api/client';
import { renderWithProviders } from '../../test/utils';
import { Lobby } from './Lobby';

const GAMES_RESPONSE = {
  games: [
    { slug: 'demo-slots', name: 'Demo Slots', description: 'A classic slot machine.', minBet: 10, maxBet: 100 },
  ],
};

function jsonResponse(body: unknown) {
  return Promise.resolve({
    ok: true,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  });
}

function mockGamesFetch() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(GAMES_RESPONSE)));
}

function mockSignedInFetch(role: 'PLAYER' | 'ADMIN') {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url === `${API_BASE_URL}/auth/me`) {
        return jsonResponse({
          user: { id: '1', email: 'player@example.com', role, createdAt: new Date().toISOString() },
          wallet: { balance: 1000, currency: 'DEMO' },
        });
      }
      if (url === `${API_BASE_URL}/games`) {
        return jsonResponse(GAMES_RESPONSE);
      }
      throw new Error(`Unexpected fetch call: ${url}`);
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

  it('shows an admin dashboard link for an admin user', async () => {
    window.localStorage.setItem('digicasino.authToken', 'fake-jwt-token');
    mockSignedInFetch('ADMIN');

    renderWithProviders(<Lobby />);

    expect(await screen.findByRole('link', { name: 'Admin dashboard' })).toBeInTheDocument();
  });

  it('does not show an admin dashboard link for a regular player', async () => {
    window.localStorage.setItem('digicasino.authToken', 'fake-jwt-token');
    mockSignedInFetch('PLAYER');

    renderWithProviders(<Lobby />);

    expect(await screen.findByText('Signed in as player@example.com')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin dashboard' })).not.toBeInTheDocument();
  });
});
