import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/Button/Button';
import { Card } from '../../components/Card/Card';
import { Link } from '../../router/Router';
import styles from './Lobby.module.css';

// Static placeholder catalog — the real game catalog is built in Task 002/003.
const COMING_SOON_GAMES = ['Demo Slots', 'Demo Blackjack', 'Demo Roulette', 'Demo Poker'];

export function Lobby() {
  const { user, isLoading, logout } = useAuth();

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

      <section className={styles.grid}>
        {COMING_SOON_GAMES.map((gameName) => (
          <Card key={gameName}>
            <h2 className={styles.gameName}>{gameName}</h2>
            <span className={styles.badge}>Coming soon</span>
          </Card>
        ))}
      </section>
    </main>
  );
}

export default Lobby;
