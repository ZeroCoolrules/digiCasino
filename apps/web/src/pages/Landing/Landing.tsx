import { Button } from '../../components/Button/Button';
import { Link } from '../../router/Router';
import styles from './Landing.module.css';

export function Landing() {
  return (
    <main className={styles.hero}>
      <h1 className={styles.title}>digiCasino</h1>
      <p className={styles.subtitle}>
        A demo casino platform. Play with virtual credits — no real-money
        wagering, ever.
      </p>
      <div className={styles.actions}>
        <Link to="/register">
          <Button variant="primary">Create a free account</Button>
        </Link>
        <Link to="/login">
          <Button variant="secondary">Log in</Button>
        </Link>
      </div>
      <p className={styles.disclaimer}>
        digiCasino uses demo/virtual credits only. There is no real-money
        wagering, deposits, or withdrawals.
      </p>
    </main>
  );
}

export default Landing;
