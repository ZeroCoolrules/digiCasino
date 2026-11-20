import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '../../api/client';
import { renderWithProviders } from '../../test/utils';
import { HighLow } from './HighLow';

const HIGHLOW_CATALOG_RESPONSE = {
  games: [
    {
      slug: 'high-low',
      name: 'High-Low Cards',
      description: 'Guess whether the next card is higher or lower.',
      minBet: 10,
      maxBet: 500,
      gameType: 'high-low',
    },
  ],
};

function jsonResponse(body: unknown) {
  return {
    ok: true,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  };
}

describe('HighLow', () => {
  beforeEach(() => {
    window.localStorage.setItem('digicasino.authToken', 'fake-jwt-token');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it('prompts guests to log in instead of showing the bet form', async () => {
    window.localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(HIGHLOW_CATALOG_RESPONSE)));

    renderWithProviders(<HighLow />);

    expect(await screen.findByText('You need to log in to play.')).toBeInTheDocument();
  });

  it('renders rules, direction radios, and bet amount', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === `${API_BASE_URL}/auth/me`) {
        return Promise.resolve(
          jsonResponse({
            user: { id: '1', email: 'player@example.com', role: 'PLAYER', createdAt: new Date().toISOString() },
            wallet: { balance: 1000, currency: 'DEMO' },
          }),
        );
      }
      if (url === `${API_BASE_URL}/games`) {
        return Promise.resolve(jsonResponse(HIGHLOW_CATALOG_RESPONSE));
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<HighLow />);

    expect(await screen.findByRole('heading', { name: 'High-Low Cards' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'HIGHER' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'LOWER' })).toBeInTheDocument();
    expect(screen.getByLabelText('Bet amount')).toBeInTheDocument();
    // Tie rule must be visible before the player commits.
    expect(screen.getByText(/Tie rule/i)).toBeInTheDocument();
  });

  it('submits a bet with direction and shows the WIN result', async () => {
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url === `${API_BASE_URL}/auth/me`) {
        return Promise.resolve(
          jsonResponse({
            user: { id: '1', email: 'player@example.com', role: 'PLAYER', createdAt: new Date().toISOString() },
            wallet: { balance: 1000, currency: 'DEMO' },
          }),
        );
      }
      if (url === `${API_BASE_URL}/games`) {
        return Promise.resolve(jsonResponse(HIGHLOW_CATALOG_RESPONSE));
      }
      if (url === `${API_BASE_URL}/games/high-low/sessions` && options?.method === 'POST') {
        return Promise.resolve(
          jsonResponse({
            session: { id: 'sess-hl-1', gameId: 'g3', status: 'PENDING', bet: 10, payout: null, result: null },
          }),
        );
      }
      if (url === `${API_BASE_URL}/games/sessions/sess-hl-1/play` && options?.method === 'POST') {
        return Promise.resolve(
          jsonResponse({
            session: {
              id: 'sess-hl-1',
              gameId: 'g3',
              status: 'COMPLETED',
              bet: 10,
              payout: 19,
              result: { startCard: 5, nextCard: 9, direction: 'HIGHER', outcome: 'WIN', payout: 19 },
            },
            wallet: { balance: 1009, currency: 'DEMO' },
          }),
        );
      }
      throw new Error(`Unexpected fetch call: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<HighLow />);
    expect(await screen.findByRole('heading', { name: 'High-Low Cards' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Deal Card' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE_URL}/games/high-low/sessions`,
        expect.objectContaining({ method: 'POST' }),
      );
    });

    expect(await screen.findByTestId('highlow-result')).toBeInTheDocument();
    expect(await screen.findByText('You won 19!')).toBeInTheDocument();
    expect(await screen.findByText('Balance: 1009 DEMO')).toBeInTheDocument();
  });

  it('shows a PUSH (tie) message when cards are equal', async () => {
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url === `${API_BASE_URL}/auth/me`) {
        return Promise.resolve(
          jsonResponse({
            user: { id: '1', email: 'player@example.com', role: 'PLAYER', createdAt: new Date().toISOString() },
            wallet: { balance: 1000, currency: 'DEMO' },
          }),
        );
      }
      if (url === `${API_BASE_URL}/games`) {
        return Promise.resolve(jsonResponse(HIGHLOW_CATALOG_RESPONSE));
      }
      if (url === `${API_BASE_URL}/games/high-low/sessions` && options?.method === 'POST') {
        return Promise.resolve(
          jsonResponse({
            session: { id: 'sess-hl-2', gameId: 'g3', status: 'PENDING', bet: 10, payout: null, result: null },
          }),
        );
      }
      if (url === `${API_BASE_URL}/games/sessions/sess-hl-2/play` && options?.method === 'POST') {
        return Promise.resolve(
          jsonResponse({
            session: {
              id: 'sess-hl-2',
              gameId: 'g3',
              status: 'COMPLETED',
              bet: 10,
              payout: 10,
              result: { startCard: 7, nextCard: 7, direction: 'HIGHER', outcome: 'PUSH', payout: 10 },
            },
            wallet: { balance: 1000, currency: 'DEMO' },
          }),
        );
      }
      throw new Error(`Unexpected fetch call: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<HighLow />);
    expect(await screen.findByRole('heading', { name: 'High-Low Cards' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Deal Card' }));

    expect(await screen.findByText(/Push — tie!/i)).toBeInTheDocument();
    expect(await screen.findByText('Balance: 1000 DEMO')).toBeInTheDocument();
  });

  it('shows a loss message when the guess is wrong', async () => {
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url === `${API_BASE_URL}/auth/me`) {
        return Promise.resolve(
          jsonResponse({
            user: { id: '1', email: 'player@example.com', role: 'PLAYER', createdAt: new Date().toISOString() },
            wallet: { balance: 1000, currency: 'DEMO' },
          }),
        );
      }
      if (url === `${API_BASE_URL}/games`) {
        return Promise.resolve(jsonResponse(HIGHLOW_CATALOG_RESPONSE));
      }
      if (url === `${API_BASE_URL}/games/high-low/sessions` && options?.method === 'POST') {
        return Promise.resolve(
          jsonResponse({
            session: { id: 'sess-hl-3', gameId: 'g3', status: 'PENDING', bet: 10, payout: null, result: null },
          }),
        );
      }
      if (url === `${API_BASE_URL}/games/sessions/sess-hl-3/play` && options?.method === 'POST') {
        return Promise.resolve(
          jsonResponse({
            session: {
              id: 'sess-hl-3',
              gameId: 'g3',
              status: 'COMPLETED',
              bet: 10,
              payout: 0,
              result: { startCard: 9, nextCard: 3, direction: 'HIGHER', outcome: 'LOSS', payout: 0 },
            },
            wallet: { balance: 990, currency: 'DEMO' },
          }),
        );
      }
      throw new Error(`Unexpected fetch call: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<HighLow />);
    expect(await screen.findByRole('heading', { name: 'High-Low Cards' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Deal Card' }));

    expect(await screen.findByText('No win this time.')).toBeInTheDocument();
    expect(await screen.findByText('Balance: 990 DEMO')).toBeInTheDocument();
  });
});
