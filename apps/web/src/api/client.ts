/**
 * Minimal fetch-based API client for the digiCasino backend.
 *
 * Conventions (see SYSTEM_ARCHITECTURE.md "API conventions"):
 * - Base path: /api/v1
 * - JSON request/response bodies.
 * - Errors: { "error": { "message": string, "code": string } }
 * - Auth: POST /auth/register, POST /auth/login (returns a JWT),
 *   GET /auth/me (requires "Authorization: Bearer <token>").
 *
 * NOTE: apps/api is being implemented in parallel by the Backend Agent.
 * The exact response shapes below are this frontend's assumption of the
 * contract documented in SYSTEM_ARCHITECTURE.md and may need reconciling
 * once the backend lands. See the frontend agent's final report for
 * details on what was assumed.
 */

const DEFAULT_API_BASE_URL = 'http://localhost:4000/api/v1';

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? DEFAULT_API_BASE_URL;

export interface ApiErrorBody {
  error: {
    message: string;
    code: string;
  };
}

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

/** The authenticated user, as returned by /auth/me, /auth/login, /auth/register. */
export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
}

/** The player's demo wallet, as returned by /auth/me and /auth/register. */
export interface Wallet {
  balance: number;
  currency: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

/**
 * /auth/register does NOT issue a token (by backend design, see
 * apps/api/README.md) -- it creates the user + their starting wallet, and
 * the caller is expected to log in afterwards to obtain a token.
 */
export interface RegisterResponse {
  user: AuthUser;
  wallet: Wallet;
}

export interface MeResponse {
  user: AuthUser;
  wallet: Wallet;
}

export interface RegisterPayload {
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

/** A catalog entry, as returned by GET /games. */
export interface Game {
  slug: string;
  name: string;
  description: string;
  minBet: number;
  maxBet: number;
}

export interface ListGamesResponse {
  games: Game[];
}

/** The server-side spin outcome, once a session has been played. */
export interface SpinResult {
  reels: string[];
  payout: number;
}

export interface GameSession {
  id: string;
  gameId: string;
  status: 'PENDING' | 'COMPLETED';
  bet: number;
  payout: number | null;
  result: SpinResult | null;
}

export interface StartSessionResponse {
  session: GameSession;
}

export interface PlaySessionResponse {
  session: GameSession;
  wallet: Wallet;
}

/** A single ledger entry, as returned by GET /wallet/transactions. */
export interface Transaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  reason: string;
  createdAt: string;
}

export interface ListTransactionsResponse {
  transactions: Transaction[];
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await response.json() : undefined;

  if (!response.ok) {
    const errorBody = body as ApiErrorBody | undefined;
    throw new ApiError(
      errorBody?.error?.message ?? 'Request failed',
      errorBody?.error?.code ?? 'UNKNOWN_ERROR',
      response.status,
    );
  }

  return body as T;
}

export function register(payload: RegisterPayload): Promise<RegisterResponse> {
  return request<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function login(payload: LoginPayload): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function me(token: string): Promise<MeResponse> {
  return request<MeResponse>('/auth/me', { method: 'GET' }, token);
}

/** GET /games — the active game catalog. No auth required. */
export function listGames(): Promise<ListGamesResponse> {
  return request<ListGamesResponse>('/games', { method: 'GET' });
}

/**
 * POST /games/:slug/sessions — starts a new session, immediately debiting `bet` from the
 * player's wallet. Returns the PENDING session; call `playGameSession` next to resolve it.
 */
export function startGameSession(slug: string, bet: number, token: string): Promise<StartSessionResponse> {
  return request<StartSessionResponse>(
    `/games/${slug}/sessions`,
    { method: 'POST', body: JSON.stringify({ bet }) },
    token,
  );
}

/**
 * POST /games/sessions/:id/play — resolves a PENDING session server-side and returns the
 * outcome plus the updated wallet balance. Calling this twice for the same session returns a
 * 409 ApiError (code SESSION_ALREADY_SETTLED) on the second call.
 */
export function playGameSession(sessionId: string, token: string): Promise<PlaySessionResponse> {
  return request<PlaySessionResponse>(`/games/sessions/${sessionId}/play`, { method: 'POST' }, token);
}

/** GET /wallet/transactions — the authenticated user's ledger entries, newest first. */
export function listTransactions(token: string): Promise<ListTransactionsResponse> {
  return request<ListTransactionsResponse>('/wallet/transactions', { method: 'GET' }, token);
}

export const apiClient = {
  register,
  login,
  me,
  listGames,
  startGameSession,
  playGameSession,
  listTransactions,
};

export default apiClient;
