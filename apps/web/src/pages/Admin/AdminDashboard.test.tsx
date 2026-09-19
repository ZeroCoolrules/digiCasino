import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '../../api/client';
import { renderWithProviders } from '../../test/utils';
import { AdminDashboard } from './AdminDashboard';

function jsonResponse(body: unknown) {
  return Promise.resolve({
    ok: true,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  });
}

const SUMMARY_RESPONSE = {
  playerCount: 3,
  activeGameCount: 2,
  totalGameCount: 3,
  sessionCount: 10,
  completedSessionCount: 9,
  ledgerEntryCount: 20,
  totalCreditsInCirculation: 5000,
};

const ADMIN_GAMES_RESPONSE = {
  games: [
    {
      id: 'g1',
      slug: 'demo-slots',
      name: 'Demo Slots',
      description: 'A classic slot machine.',
      minBet: 10,
      maxBet: 100,
      isActive: true,
    },
  ],
};

const ADMIN_PLAYERS_RESPONSE = {
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

const AUDIT_LOG_RESPONSE = {
  entries: [
    {
      id: 'a1',
      adminUserId: 'admin-1',
      adminEmail: 'admin@example.com',
      action: 'CREDIT_ADJUSTMENT',
      targetUserId: 'u1',
      targetEmail: 'player@example.com',
      amount: 50,
      reason: 'Goodwill credit',
      createdAt: new Date().toISOString(),
    },
  ],
};

function mockAdminFetch(role: 'PLAYER' | 'ADMIN') {
  const fetchMock = vi.fn((url: string) => {
    if (url === `${API_BASE_URL}/auth/me`) {
      return jsonResponse({
        user: { id: 'admin-1', email: 'admin@example.com', role, createdAt: new Date().toISOString() },
        wallet: { balance: 0, currency: 'DEMO' },
      });
    }
    if (url === `${API_BASE_URL}/admin/reports/summary`) {
      return jsonResponse(SUMMARY_RESPONSE);
    }
    if (url === `${API_BASE_URL}/admin/games`) {
      return jsonResponse(ADMIN_GAMES_RESPONSE);
    }
    if (url === `${API_BASE_URL}/admin/players`) {
      return jsonResponse(ADMIN_PLAYERS_RESPONSE);
    }
    if (url === `${API_BASE_URL}/admin/audit-log`) {
      return jsonResponse(AUDIT_LOG_RESPONSE);
    }
    throw new Error(`Unexpected fetch call: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('AdminDashboard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it('shows an access-denied message for a guest', async () => {
    renderWithProviders(<AdminDashboard />);

    expect(await screen.findByText('You do not have access to this page.')).toBeInTheDocument();
  });

  it('shows an access-denied message for a logged-in non-admin player', async () => {
    window.localStorage.setItem('digicasino.authToken', 'fake-jwt-token');
    mockAdminFetch('PLAYER');

    renderWithProviders(<AdminDashboard />);

    expect(await screen.findByText('You do not have access to this page.')).toBeInTheDocument();
  });

  it('renders the dashboard sections with fetched data for an admin', async () => {
    window.localStorage.setItem('digicasino.authToken', 'fake-jwt-token');
    const fetchMock = mockAdminFetch('ADMIN');

    renderWithProviders(<AdminDashboard />);

    expect(await screen.findByRole('heading', { name: 'Admin dashboard' })).toBeInTheDocument();

    // Operational summary
    expect(await screen.findByText('5000')).toBeInTheDocument();
    expect(screen.getByText('Credits in circulation')).toBeInTheDocument();

    // Game management
    expect(await screen.findByText('Demo Slots')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();

    // Player management
    expect(await screen.findByText('500 DEMO')).toBeInTheDocument();
    expect((await screen.findAllByText('player@example.com')).length).toBeGreaterThan(0);

    // Audit log
    expect(await screen.findByText('Goodwill credit')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE_URL}/admin/reports/summary`,
        expect.objectContaining({ method: 'GET' }),
      );
    });
  });
});
