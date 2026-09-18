import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '../../api/client';
import { renderWithProviders } from '../../test/utils';
import { Transactions } from './Transactions';

function jsonResponse(body: unknown) {
  return {
    ok: true,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  };
}

describe('Transactions', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it('prompts guests to log in', async () => {
    window.localStorage.clear();
    renderWithProviders(<Transactions />);

    expect(await screen.findByText('You need to log in to view your transaction history.')).toBeInTheDocument();
  });

  it('renders the transaction list for a logged-in user', async () => {
    window.localStorage.setItem('digicasino.authToken', 'fake-jwt-token');

    const fetchMock = vi.fn((url: string) => {
      if (url === `${API_BASE_URL}/auth/me`) {
        return Promise.resolve(
          jsonResponse({
            user: { id: '1', email: 'player@example.com', createdAt: new Date().toISOString() },
            wallet: { balance: 990, currency: 'DEMO' },
          }),
        );
      }
      if (url === `${API_BASE_URL}/wallet/transactions`) {
        return Promise.resolve(
          jsonResponse({
            transactions: [
              { id: 't2', type: 'DEBIT', amount: 10, reason: 'game_session_bet:sess-1', createdAt: new Date().toISOString() },
              { id: 't1', type: 'CREDIT', amount: 1000, reason: 'initial_demo_grant', createdAt: new Date().toISOString() },
            ],
          }),
        );
      }
      throw new Error(`Unexpected fetch call: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<Transactions />);

    expect(await screen.findByText('game_session_bet:sess-1')).toBeInTheDocument();
    expect(screen.getByText('initial_demo_grant')).toBeInTheDocument();
  });
});
