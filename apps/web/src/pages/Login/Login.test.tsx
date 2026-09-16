import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '../../api/client';
import { renderWithProviders } from '../../test/utils';
import { Login } from './Login';

describe('Login', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          token: 'fake-jwt-token',
          user: { id: '1', email: 'player@example.com', createdAt: new Date().toISOString() },
        }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the login form', () => {
    renderWithProviders(<Login />);

    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('calls the API client with the entered credentials on submit', async () => {
    renderWithProviders(<Login />);

    await userEvent.type(screen.getByLabelText('Email'), 'player@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'super-secret');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/auth/login`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'player@example.com', password: 'super-secret' }),
        }),
      );
    });
  });
});
