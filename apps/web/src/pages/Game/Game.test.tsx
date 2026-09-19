import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '../../api/client';
import { renderWithProviders } from '../../test/utils';
import { Game } from './Game';

const GAME_CATALOG_RESPONSE = {
  games: [
    { slug: 'demo-slots', name: 'Demo Slots', description: 'A classic slot machine.', minBet: 10, maxBet: 100 },
  ],
};

function jsonResponse(body: unknown) {
  return {
    ok: true,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  };
}

describe('Game', () => {
  beforeEach(() => {
    window.localStorage.setItem('digicasino.authToken', 'fake-jwt-token');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it('prompts guests to log in instead of showing the bet form', async () => {
    window.localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(GAME_CATALOG_RESPONSE)));

    renderWithProviders(<Game slug="demo-slots" />);

    expect(await screen.findByText('You need to log in to play.')).toBeInTheDocument();
  });

  it('loads the game, submits a bet, and shows the spin result', async () => {
    // URL-based rather than call-order-based: AuthContext's /auth/me hydration and Game's
    // listGames() both fire on mount and their relative order is not guaranteed.
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url === `${API_BASE_URL}/auth/me`) {
        return Promise.resolve(
          jsonResponse({
            user: { id: '1', email: 'player@example.com', createdAt: new Date().toISOString() },
            wallet: { balance: 1000, currency: 'DEMO' },
          }),
        );
      }
      if (url === `${API_BASE_URL}/games`) {
        return Promise.resolve(jsonResponse(GAME_CATALOG_RESPONSE));
      }
      if (url === `${API_BASE_URL}/games/demo-slots/sessions` && options?.method === 'POST') {
        return Promise.resolve(
          jsonResponse({ session: { id: 'sess-1', gameId: 'g1', status: 'PENDING', bet: 10, payout: null, result: null } }),
        );
      }
      if (url === `${API_BASE_URL}/games/sessions/sess-1/play` && options?.method === 'POST') {
        return Promise.resolve(
          jsonResponse({
            session: {
              id: 'sess-1',
              gameId: 'g1',
              status: 'COMPLETED',
              bet: 10,
              payout: 100,
              result: { reels: ['SEVEN', 'SEVEN', 'SEVEN'], payout: 100 },
            },
            wallet: { balance: 1090, currency: 'DEMO' },
          }),
        );
      }
      throw new Error(`Unexpected fetch call: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<Game slug="demo-slots" />);

    expect(await screen.findByRole('heading', { name: 'Demo Slots' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Spin' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE_URL}/games/demo-slots/sessions`,
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ bet: 10 }) }),
      );
    });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE_URL}/games/sessions/sess-1/play`,
        expect.objectContaining({ method: 'POST' }),
      );
    });

    expect(await screen.findByText('You won 100!')).toBeInTheDocument();
    expect(await screen.findByText('Balance: 1090 DEMO')).toBeInTheDocument();
  });
});
