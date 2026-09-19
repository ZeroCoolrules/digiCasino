import { useEffect, useState } from 'react';
import { apiClient, type Game as GameCatalogEntry, type SpinResult } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/Button/Button';
import { Card } from '../../components/Card/Card';
import { Link } from '../../router/Router';
import styles from './Game.module.css';

export interface GameProps {
  slug: string;
}

type SpinOutcome = { payout: number; result: SpinResult | null };

export function Game({ slug }: GameProps) {
  const { token, wallet, setWallet } = useAuth();

  const [game, setGame] = useState<GameCatalogEntry | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  const [bet, setBet] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinError, setSpinError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<SpinOutcome | null>(null);

  useEffect(() => {
    let cancelled = false;

    apiClient
      .listGames()
      .then((res) => {
        if (cancelled) return;
        const found = res.games.find((entry) => entry.slug === slug) ?? null;
        setGame(found);
        if (found) {
          setBet(found.minBet);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setCatalogError(err instanceof Error ? err.message : 'Failed to load game.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingCatalog(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function handleSpin() {
    if (!token || !game) return;

    setSpinError(null);
    setIsSpinning(true);
    setOutcome(null);

    try {
      const started = await apiClient.startGameSession(game.slug, bet, token);
      const played = await apiClient.playGameSession(started.session.id, token);

      setOutcome({ payout: played.session.payout ?? 0, result: played.session.result });
      setWallet(played.wallet);
    } catch (err) {
      setSpinError(err instanceof Error ? err.message : 'Spin failed.');
    } finally {
      setIsSpinning(false);
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
        <p>{game.description}</p>

        {wallet ? (
          <p className={styles.balance}>
            Balance: {wallet.balance} {wallet.currency}
          </p>
        ) : null}

        <div className={styles.field}>
          <label htmlFor="bet-amount">Bet amount</label>
          <input
            id="bet-amount"
            type="number"
            min={game.minBet}
            max={game.maxBet}
            step={1}
            value={bet}
            onChange={(event) => setBet(Number(event.target.value))}
            disabled={isSpinning}
          />
          <span className={styles.hint}>
            Min {game.minBet} — Max {game.maxBet}
          </span>
        </div>

        {spinError ? (
          <p className={styles.error} role="alert">
            {spinError}
          </p>
        ) : null}

        <Button variant="primary" onClick={handleSpin} disabled={isSpinning}>
          {isSpinning ? 'Spinning…' : 'Spin'}
        </Button>

        {outcome ? (
          <div className={styles.result} data-testid="spin-result">
            <p className={styles.reels}>{outcome.result?.reels.join(' | ') ?? '—'}</p>
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

export default Game;
