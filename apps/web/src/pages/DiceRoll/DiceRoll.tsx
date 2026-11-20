import { useEffect, useRef, useState } from 'react';
import { apiClient, type DiceRollResult, type Game as GameCatalogEntry } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/Button/Button';
import { Card } from '../../components/Card/Card';
import { Link } from '../../router/Router';
import styles from '../Game/Game.module.css';

type DiceDirection = 'UNDER' | 'OVER';

type RollOutcome = {
  payout: number;
  result: DiceRollResult | null;
};

export function DiceRoll() {
  const { token, wallet, setWallet } = useAuth();

  const [game, setGame] = useState<GameCatalogEntry | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  const [bet, setBet] = useState<number>(0);
  const [target, setTarget] = useState<number>(7);
  const [direction, setDirection] = useState<DiceDirection>('OVER');
  const [isRolling, setIsRolling] = useState(false);
  const [rollError, setRollError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<RollOutcome | null>(null);

  // Prevents duplicate settlement from rapid double-clicks.
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;

    apiClient
      .listGames()
      .then((res) => {
        if (cancelled) return;
        const found = res.games.find((g) => g.slug === 'dice-roll') ?? null;
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

  async function handleRoll() {
    if (!token || !game || inFlight.current) return;

    setRollError(null);
    setIsRolling(true);
    setOutcome(null);
    inFlight.current = true;

    try {
      const started = await apiClient.startGameSession(game.slug, bet, token, {
        target,
        direction,
      });
      const played = await apiClient.playGameSession(started.session.id, token);

      setOutcome({
        payout: played.session.payout ?? 0,
        result: played.session.result as DiceRollResult | null,
      });
      setWallet(played.wallet);
    } catch (err) {
      setRollError(err instanceof Error ? err.message : 'Roll failed.');
    } finally {
      setIsRolling(false);
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

  return (
    <main className={styles.page}>
      <Card>
        <h1 className={styles.title}>{game.name}</h1>

        {/* Rules panel — always visible */}
        <section aria-label="Game rules">
          <p>{game.description}</p>
          <ul style={{ margin: '0.5rem 0 0.5rem 1.25rem', lineHeight: '1.6' }}>
            <li>Pick a target number (2–11) and choose UNDER or OVER.</li>
            <li>Two dice are rolled. If the total beats your target, you win.</li>
            <li>Exact match always loses — no ties.</li>
            <li>Win pays <strong>1.9× your bet</strong> (rounded down).</li>
          </ul>
        </section>

        {wallet ? (
          <p className={styles.balance}>
            Balance: {wallet.balance} {wallet.currency}
          </p>
        ) : null}

        <div className={styles.field}>
          <label htmlFor="dice-target">Target number</label>
          <input
            id="dice-target"
            type="number"
            min={2}
            max={11}
            step={1}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            disabled={isRolling}
          />
          <span className={styles.hint}>2–11</span>
        </div>

        <div className={styles.field}>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Direction</span>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {(['UNDER', 'OVER'] as DiceDirection[]).map((d) => (
              <label key={d} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="dice-direction"
                  value={d}
                  checked={direction === d}
                  onChange={() => setDirection(d)}
                  disabled={isRolling}
                />
                {d}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="dice-bet">Bet amount</label>
          <input
            id="dice-bet"
            type="number"
            min={game.minBet}
            max={game.maxBet}
            step={1}
            value={bet}
            onChange={(e) => setBet(Number(e.target.value))}
            disabled={isRolling}
          />
          <span className={styles.hint}>
            Min {game.minBet} — Max {game.maxBet}
          </span>
        </div>

        {rollError ? (
          <p className={styles.error} role="alert">
            {rollError}
          </p>
        ) : null}

        <Button variant="primary" onClick={handleRoll} disabled={isRolling}>
          {isRolling ? 'Rolling…' : 'Roll Dice'}
        </Button>

        {outcome ? (
          <div className={styles.result} data-testid="roll-result">
            {outcome.result ? (
              <>
                <p className={styles.reels}>
                  🎲 {outcome.result.dice[0]} + {outcome.result.dice[1]} = <strong>{outcome.result.total}</strong>
                </p>
                <p>
                  Your pick: <strong>{outcome.result.direction} {outcome.result.target}</strong>
                </p>
              </>
            ) : null}
            <p>{outcome.payout > 0 ? `You won ${outcome.payout}!` : 'No win this time.'}</p>
          </div>
        ) : null}

        <Link to="/lobby">
          <Button variant="secondary">Back to lobby</Button>
        </Link>
      </Card>
    </main>
  );
}

export default DiceRoll;
