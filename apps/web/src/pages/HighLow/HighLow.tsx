import { useEffect, useRef, useState } from 'react';
import { apiClient, type HighLowResult, type Game as GameCatalogEntry } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/Button/Button';
import { Card } from '../../components/Card/Card';
import { Link } from '../../router/Router';
import styles from '../Game/Game.module.css';

type HighLowDirection = 'HIGHER' | 'LOWER';

const CARD_LABELS: Record<number, string> = {
  1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
  8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K',
};

type HighLowOutcome = {
  payout: number;
  result: HighLowResult | null;
};

export function HighLow() {
  const { token, wallet, setWallet } = useAuth();

  const [game, setGame] = useState<GameCatalogEntry | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  const [bet, setBet] = useState<number>(0);
  const [direction, setDirection] = useState<HighLowDirection>('HIGHER');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<HighLowOutcome | null>(null);

  // Prevents duplicate settlement from rapid double-clicks.
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;

    apiClient
      .listGames()
      .then((res) => {
        if (cancelled) return;
        const found = res.games.find((g) => g.slug === 'high-low') ?? null;
        setGame(found);
        if (found) setBet(found.minBet);
      })
      .catch((err) => {
        if (!cancelled) {
          setCatalogError(err instanceof Error ? err.message : 'Failed to load game.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCatalog(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handlePlay() {
    if (!token || !game || inFlight.current) return;

    setPlayError(null);
    setIsPlaying(true);
    setOutcome(null);
    inFlight.current = true;

    try {
      const started = await apiClient.startGameSession(game.slug, bet, token, { direction });
      const played = await apiClient.playGameSession(started.session.id, token);

      setOutcome({
        payout: played.session.payout ?? 0,
        result: played.session.result as HighLowResult | null,
      });
      setWallet(played.wallet);
    } catch (err) {
      setPlayError(err instanceof Error ? err.message : 'Play failed.');
    } finally {
      setIsPlaying(false);
      inFlight.current = false;
    }
  }

  if (!token) {
    return (
      <main className={styles.page}>
        <Card>
          <p>You need to log in to play.</p>
          <Link to="/login">
            <Button variant="primary">Log in</Button>
          </Link>
        </Card>
      </main>
    );
  }

  if (isLoadingCatalog) {
    return (
      <main className={styles.page}>
        <p>Loading game…</p>
      </main>
    );
  }

  if (catalogError || !game) {
    return (
      <main className={styles.page}>
        <p role="alert">{catalogError ?? 'Game not found.'}</p>
        <Link to="/lobby">
          <Button variant="secondary">Back to lobby</Button>
        </Link>
      </main>
    );
  }

  const outcomeLabel =
    outcome?.result?.outcome === 'WIN'
      ? `You won ${outcome.payout}!`
      : outcome?.result?.outcome === 'PUSH'
        ? `Push — tie! Your bet of ${outcome.payout} is returned.`
        : 'No win this time.';

  return (
    <main className={styles.page}>
      <Card>
        <h1 className={styles.title}>{game.name}</h1>

        {/* Rules panel — always visible */}
        <section aria-label="Game rules">
          <p>{game.description}</p>
          <ul style={{ margin: '0.5rem 0 0.5rem 1.25rem', lineHeight: '1.6' }}>
            <li>A card (Ace=1 through King=13) is revealed.</li>
            <li>Guess whether the next card is <strong>HIGHER</strong> or <strong>LOWER</strong>.</li>
            <li>
              <strong>Tie rule:</strong> equal cards are a <em>Push</em> — your bet is returned, no win, no loss.
            </li>
            <li>Win pays <strong>1.9× your bet</strong> (rounded down).</li>
          </ul>
        </section>

        {wallet ? (
          <p className={styles.balance}>
            Balance: {wallet.balance} {wallet.currency}
          </p>
        ) : null}

        <div className={styles.field}>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Your guess</span>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {(['HIGHER', 'LOWER'] as HighLowDirection[]).map((d) => (
              <label key={d} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="highlow-direction"
                  value={d}
                  checked={direction === d}
                  onChange={() => setDirection(d)}
                  disabled={isPlaying}
                />
                {d}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="highlow-bet">Bet amount</label>
          <input
            id="highlow-bet"
            type="number"
            min={game.minBet}
            max={game.maxBet}
            step={1}
            value={bet}
            onChange={(e) => setBet(Number(e.target.value))}
            disabled={isPlaying}
          />
          <span className={styles.hint}>
            Min {game.minBet} — Max {game.maxBet}
          </span>
        </div>

        {playError ? (
          <p className={styles.error} role="alert">
            {playError}
          </p>
        ) : null}

        <Button variant="primary" onClick={handlePlay} disabled={isPlaying}>
          {isPlaying ? 'Dealing…' : 'Deal Card'}
        </Button>

        {outcome ? (
          <div className={styles.result} data-testid="highlow-result">
            {outcome.result ? (
              <>
                <p className={styles.reels}>
                  🃏 {CARD_LABELS[outcome.result.startCard] ?? outcome.result.startCard}{' '}
                  → {CARD_LABELS[outcome.result.nextCard] ?? outcome.result.nextCard}
                </p>
                <p>
                  You guessed <strong>{outcome.result.direction}</strong> — outcome:{' '}
                  <strong>{outcome.result.outcome}</strong>
                </p>
              </>
            ) : null}
            <p>{outcomeLabel}</p>
          </div>
        ) : null}

        <Link to="/lobby">
          <Button variant="secondary">Back to lobby</Button>
        </Link>
      </Card>
    </main>
  );
}

export default HighLow;
