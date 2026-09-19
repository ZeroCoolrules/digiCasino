import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '../../api/client';
import { renderWithProviders } from '../../test/utils';
import { Profile } from './Profile';

function jsonResponse(body: unknown) {
  return Promise.resolve({
    ok: true,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  });
}

function errorResponse(status: number, message: string, code: string) {
  return Promise.resolve({
    ok: false,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => ({ error: { message, code } }),
  });
}

const ME_RESPONSE = {
  user: { id: 'u1', email: 'player@example.com', role: 'PLAYER', createdAt: '2024-01-15T00:00:00.000Z' },
  wallet: { balance: 990, currency: 'DEMO' },
};

const PROFILE_RESPONSE = {
  user: { id: 'u1', email: 'player@example.com', role: 'PLAYER', createdAt: '2024-01-15T00:00:00.000Z' },
  wallet: { balance: 990, currency: 'DEMO' },
  stats: {
    totalSessions: 12,
    totalWagered: 500,
    totalPayout: 420,
    netResult: -80,
  },
};

function mockProfileFetch() {
  const fetchMock = vi.fn((url: string) => {
    if (url === `${API_BASE_URL}/auth/me`) {
      return jsonResponse(ME_RESPONSE);
    }
    if (url === `${API_BASE_URL}/profile`) {
      return jsonResponse(PROFILE_RESPONSE);
    }
    throw new Error(`Unexpected fetch call: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('Profile', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it('prompts guests to log in', async () => {
    window.localStorage.clear();
    renderWithProviders(<Profile />);

    expect(await screen.findByText('You need to log in to view your profile.')).toBeInTheDocument();
  });

  it('renders fetched profile data for a logged-in user', async () => {
    window.localStorage.setItem('digicasino.authToken', 'fake-jwt-token');
    mockProfileFetch();

    renderWithProviders(<Profile />);

    expect(await screen.findByText('player@example.com')).toBeInTheDocument();
    expect(screen.getByText('PLAYER')).toBeInTheDocument();
    expect(screen.getByText('990 DEMO')).toBeInTheDocument();

    // Stats
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('420')).toBeInTheDocument();
    expect(screen.getByText('-80')).toBeInTheDocument();
  });

  it('shows a validation error and does not call the API when passwords do not match', async () => {
    window.localStorage.setItem('digicasino.authToken', 'fake-jwt-token');
    const fetchMock = mockProfileFetch();

    renderWithProviders(<Profile />);

    await screen.findByText('player@example.com');

    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'oldpassword' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'newpassword123' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'somethingelse' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByText('New password and confirmation do not match.')).toBeInTheDocument();

    expect(
      fetchMock.mock.calls.some(([url]) => url === `${API_BASE_URL}/profile/password`),
    ).toBe(false);
  });

  it('submits a valid password change and shows a success message', async () => {
    window.localStorage.setItem('digicasino.authToken', 'fake-jwt-token');

    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url === `${API_BASE_URL}/auth/me`) {
        return jsonResponse(ME_RESPONSE);
      }
      if (url === `${API_BASE_URL}/profile`) {
        return jsonResponse(PROFILE_RESPONSE);
      }
      if (url === `${API_BASE_URL}/profile/password` && options?.method === 'PATCH') {
        return jsonResponse({ success: true });
      }
      throw new Error(`Unexpected fetch call: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<Profile />);

    await screen.findByText('player@example.com');

    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'oldpassword' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'newpassword123' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'newpassword123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByText('Password changed successfully.')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE_URL}/profile/password`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ currentPassword: 'oldpassword', newPassword: 'newpassword123' }),
        }),
      );
    });
  });

  it('shows the server error message when the password change fails', async () => {
    window.localStorage.setItem('digicasino.authToken', 'fake-jwt-token');

    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url === `${API_BASE_URL}/auth/me`) {
        return jsonResponse(ME_RESPONSE);
      }
      if (url === `${API_BASE_URL}/profile`) {
        return jsonResponse(PROFILE_RESPONSE);
      }
      if (url === `${API_BASE_URL}/profile/password` && options?.method === 'PATCH') {
        return errorResponse(401, 'Incorrect current password', 'INVALID_CREDENTIALS');
      }
      throw new Error(`Unexpected fetch call: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<Profile />);

    await screen.findByText('player@example.com');

    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'wrongpassword' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'newpassword123' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'newpassword123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByText('Incorrect current password')).toBeInTheDocument();
  });
});
