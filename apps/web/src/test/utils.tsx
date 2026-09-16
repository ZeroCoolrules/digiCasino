import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { AuthProvider } from '../auth/AuthContext';
import { RouterProvider } from '../router/Router';

export function renderWithProviders(ui: ReactElement) {
  return render(
    <RouterProvider>
      <AuthProvider>{ui}</AuthProvider>
    </RouterProvider>,
  );
}
