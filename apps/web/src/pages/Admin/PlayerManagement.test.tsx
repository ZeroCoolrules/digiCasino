import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '../../api/client';
import { PlayerManagement } from './PlayerManagement';

function jsonResponse(body: unknown) {
  return Promise.resolve({
    ok: true,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  });
}

const PLAYERS_RESPONSE = {
  players: [
    {
      id: 'u1',
      email: 'player@example.com',
      role: 'PLAYER',
      createdAt: new Date().toISOString(),
      wallet: { balance: 500, currency: 'DEMO' },
    },
  ],
};

describe('PlayerManagement', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists players fetched from the admin API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(PLAYERS_RESPONSE)));

    render(<PlayerManagement token="fake-jwt-token" />);

    expect(await screen.findByText('player@example.com')).toBeInTheDocument();
    expect(screen.getByText('500 DEMO')).toBeInTheDocument();
  });

  it('submits a credit adjustment with the correct URL and body, then shows the new balance', async () => {
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url === `${API_BASE_URL}/admin/players`) {
        return jsonResponse(PLAYERS_RESPONSE);
      }
      if (url === `${API_BASE_URL}/admin/players/u1/credit-adjustments` && options?.method === 'POST') {
        return jsonResponse({
          wallet: { balance: 550, currency: 'DEMO' },
          auditLogEntry: {
            id: 'a1',
            action: 'CREDIT_ADJUSTMENT',
            targetUserId: 'u1',
            amount: 50,
            reason: 'Goodwill credit',
            createdAt: new Date().toISOString(),
          },
        });
      }
      throw new Error(`Unexpected fetch call: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<PlayerManagement token="fake-jwt-token" />);

    await screen.findByText('player@example.com');

    await userEvent.type(
      screen.getByRole('spinbutton', { name: 'Adjustment amount for player@example.com' }),
      '50',
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Adjustment reason for player@example.com' }),
      'Goodwill credit',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE_URL}/admin/players/u1/credit-adjustments`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ type: 'CREDIT', amount: 50, reason: 'Goodwill credit' }),
        }),
      );
    });

    expect(await screen.findByText('New balance: 550 DEMO')).toBeInTheDocument();
  });
});
