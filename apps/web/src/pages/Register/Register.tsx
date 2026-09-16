import { useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/Button/Button';
import { Card } from '../../components/Card/Card';
import { Link, useRouter } from '../../router/Router';
import styles from '../auth-form.module.css';

export function Register() {
  const { register } = useAuth();
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
      await register(email, password);
      navigate('/lobby');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <Card>
        <form className={styles.form} onSubmit={handleSubmit} aria-label="Register">
          <h1 className={styles.title}>Create your account</h1>

          <div className={styles.field}>
            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
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
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>

          <p className={styles.footer}>
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </form>
      </Card>
    </main>
  );
}

export default Register;
