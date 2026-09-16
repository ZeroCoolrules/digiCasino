import { useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/Button/Button';
import { Card } from '../../components/Card/Card';
import { Link, useRouter } from '../../router/Router';
import styles from '../auth-form.module.css';

export function Login() {
  const { login } = useAuth();
  const { navigate } = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/lobby');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <Card>
        <form className={styles.form} onSubmit={handleSubmit} aria-label="Log in">
          <h1 className={styles.title}>Log in</h1>

          <div className={styles.field}>
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in…' : 'Log in'}
          </Button>

          <p className={styles.footer}>
            Don&apos;t have an account? <Link to="/register">Create one</Link>
          </p>
        </form>
      </Card>
    </main>
  );
}

export default Login;
