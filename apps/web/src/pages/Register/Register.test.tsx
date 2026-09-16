import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '../../api/client';
import { renderWithProviders } from '../../test/utils';
import { Register } from './Register';

describe('Register', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          token: 'fake-jwt-token',
          user: { id: '1', email: 'newplayer@example.com', createdAt: new Date().toISOString() },
        }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the registration form', () => {
    renderWithProviders(<Register />);

    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('calls the API client with the entered credentials on submit', async () => {
    renderWithProviders(<Register />);

    await userEvent.type(screen.getByLabelText('Email'), 'newplayer@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'super-secret');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/auth/register`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'newplayer@example.com', password: 'super-secret' }),
        }),
      );
    });
  });
});
