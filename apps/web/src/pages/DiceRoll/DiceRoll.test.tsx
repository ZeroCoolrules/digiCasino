import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '../../api/client';
import { renderWithProviders } from '../../test/utils';
import { DiceRoll } from './DiceRoll';

const DICE_CATALOG_RESPONSE = {
  games: [
    {
      slug: 'dice-roll',
      name: 'Dice Roll',
      description: 'Roll two dice and bet on the total.',
      minBet: 10,
      maxBet: 500,
      gameType: 'dice-roll',
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

describe('DiceRoll', () => {
  beforeEach(() => {
    window.localStorage.setItem('digicasino.authToken', 'fake-jwt-token');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it('prompts guests to log in instead of showing the bet form', async () => {
    window.localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(DICE_CATALOG_RESPONSE)));

    renderWithProviders(<DiceRoll />);

    expect(await screen.findByText('You need to log in to play.')).toBeInTheDocument();
  });

  it('renders rules, target input, direction radios, and bet amount', async () => {
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
        return Promise.resolve(jsonResponse(DICE_CATALOG_RESPONSE));
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<DiceRoll />);

    expect(await screen.findByRole('heading', { name: 'Dice Roll' })).toBeInTheDocument();
    expect(screen.getByLabelText('Target number')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'UNDER' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'OVER' })).toBeInTheDocument();
    expect(screen.getByLabelText('Bet amount')).toBeInTheDocument();
  });

  it('submits a bet with move and shows the win result', async () => {
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
        return Promise.resolve(jsonResponse(DICE_CATALOG_RESPONSE));
      }
      if (url === `${API_BASE_URL}/games/dice-roll/sessions` && options?.method === 'POST') {
        // Verify move is included in the request body.
        const body = JSON.parse(options.body as string) as { bet: number; move: unknown };
        expect(body.move).toBeTruthy();
        return Promise.resolve(
          jsonResponse({
            session: { id: 'sess-dice-1', gameId: 'g2', status: 'PENDING', bet: 10, payout: null, result: null },
          }),
        );
      }
      if (url === `${API_BASE_URL}/games/sessions/sess-dice-1/play` && options?.method === 'POST') {
        return Promise.resolve(
          jsonResponse({
            session: {
              id: 'sess-dice-1',
              gameId: 'g2',
              status: 'COMPLETED',
              bet: 10,
              payout: 19,
              result: { dice: [4, 4], total: 8, direction: 'OVER', target: 7, payout: 19 },
            },
            wallet: { balance: 1009, currency: 'DEMO' },
          }),
        );
      }
      throw new Error(`Unexpected fetch call: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<DiceRoll />);
    expect(await screen.findByRole('heading', { name: 'Dice Roll' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Roll Dice' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE_URL}/games/dice-roll/sessions`,
        expect.objectContaining({ method: 'POST' }),
      );
    });

    expect(await screen.findByText('You won 19!')).toBeInTheDocument();
    expect(await screen.findByText('Balance: 1009 DEMO')).toBeInTheDocument();
  });

  it('shows an error when the API rejects the bet', async () => {
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
        return Promise.resolve(jsonResponse(DICE_CATALOG_RESPONSE));
      }
      if (url === `${API_BASE_URL}/games/dice-roll/sessions` && options?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 400,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ error: { message: 'Insufficient balance.', code: 'INSUFFICIENT_BALANCE' } }),
        });
      }
      throw new Error(`Unexpected fetch call: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<DiceRoll />);
    expect(await screen.findByRole('heading', { name: 'Dice Roll' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Roll Dice' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Insufficient balance.');
  });
});
