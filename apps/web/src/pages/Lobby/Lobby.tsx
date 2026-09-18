import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { apiClient, type Game } from '../../api/client';
import { Button } from '../../components/Button/Button';
import { Card } from '../../components/Card/Card';
import { Link, useRouter } from '../../router/Router';
import styles from './Lobby.module.css';

export function Lobby() {
  const { user, isLoading, logout } = useAuth();
  const { navigate } = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [isLoadingGames, setIsLoadingGames] = useState(true);

  useEffect(() => {
    let cancelled = false;

    apiClient
      .listGames()
      .then((res) => {
        if (!cancelled) {
          setGames(res.games);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setGamesError(err instanceof Error ? err.message : 'Failed to load games.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingGames(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handlePlay(slug: string) {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(`/games/${slug}`);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>Lobby</h1>
        <div className={styles.headerActions}>
          {isLoading ? (
            <span className={styles.greeting}>Checking session…</span>
          ) : user ? (
            <>
              <span className={styles.greeting}>Signed in as {user.email}</span>
              <Link to="/transactions">
                <Button variant="secondary">Transaction history</Button>
              </Link>
              <Button variant="secondary" onClick={logout}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <span className={styles.greeting}>You are browsing as a guest</span>
              <Link to="/login">
                <Button variant="primary">Log in</Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {isLoadingGames ? (
        <p>Loading games…</p>
      ) : gamesError ? (
        <p role="alert" className={styles.greeting}>
          {gamesError}
        </p>
      ) : (
        <section className={styles.grid}>
          {games.map((game) => (
            <Card key={game.slug}>
              <h2 className={styles.gameName}>{game.name}</h2>
              <p>{game.description}</p>
              <p className={styles.badge}>
                Bet {game.minBet}–{game.maxBet}
              </p>
              <Button variant="primary" onClick={() => handlePlay(game.slug)}>
                {user ? 'Play' : 'Log in to play'}
              </Button>
            </Card>
          ))}
        </section>
      )}
    </main>
  );
}

export default Lobby;
