import { useEffect, useState, type FormEvent } from 'react';
import { apiClient, type ProfileResponse } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/Button/Button';
import { Card } from '../../components/Card/Card';
import { Link } from '../../router/Router';
import styles from './Profile.module.css';

const MIN_PASSWORD_LENGTH = 8;

export function Profile() {
  const { token } = useAuth();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      setIsLoadingProfile(false);
      return;
    }

    let cancelled = false;

    apiClient
      .getProfile(token)
      .then((res) => {
        if (!cancelled) {
          setProfile(res);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setProfileError(err instanceof Error ? err.message : 'Failed to load profile.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingProfile(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (!token) {
      setPasswordError('You need to log in to change your password.');
      return;
    }

    setIsSubmittingPassword(true);
    try {
      await apiClient.changePassword({ currentPassword, newPassword }, token);
      setPasswordSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setIsSubmittingPassword(false);
    }
  }

  if (!token) {
    return (
      <main className={styles.page}>
        <Card>
          <p>You need to log in to view your profile.</p>
          <Link to="/login">
            <Button variant="primary">Log in</Button>
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>Profile</h1>
        <Link to="/lobby">
          <Button variant="secondary">Back to lobby</Button>
        </Link>
      </header>

      {isLoadingProfile ? (
        <p>Loading profile…</p>
      ) : profileError ? (
        <p role="alert">{profileError}</p>
      ) : profile ? (
        <div className={styles.sections}>
          <Card>
            <h2 className={styles.sectionTitle}>Account</h2>
            <dl className={styles.infoList}>
              <dt>Email</dt>
              <dd>{profile.user.email}</dd>
              <dt>Role</dt>
              <dd>{profile.user.role}</dd>
              <dt>Member since</dt>
              <dd>{new Date(profile.user.createdAt).toLocaleDateString()}</dd>
              <dt>Balance</dt>
              <dd>
                {profile.wallet.balance} {profile.wallet.currency}
              </dd>
            </dl>
          </Card>

          <Card>
            <h2 className={styles.sectionTitle}>Lifetime stats</h2>
            <div className={styles.statGrid}>
              <div className={styles.stat}>
                <span className={styles.statValue}>{profile.stats.totalSessions}</span>
                <span className={styles.statLabel}>Sessions played</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{profile.stats.totalWagered}</span>
                <span className={styles.statLabel}>Total wagered</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{profile.stats.totalPayout}</span>
                <span className={styles.statLabel}>Total payout</span>
              </div>
              <div className={styles.stat}>
                <span
                  className={
                    profile.stats.netResult >= 0
                      ? `${styles.statValue} ${styles.netPositive}`
                      : `${styles.statValue} ${styles.netNegative}`
                  }
                >
                  {profile.stats.netResult >= 0 ? '+' : ''}
                  {profile.stats.netResult}
                </span>
                <span className={styles.statLabel}>Net result</span>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className={styles.sectionTitle}>Change password</h2>
            <form className={styles.form} onSubmit={handlePasswordSubmit} aria-label="Change password">
              <div className={styles.field}>
                <label htmlFor="current-password">Current password</label>
                <input
                  id="current-password"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="new-password">New password</label>
                <input
                  id="new-password"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="confirm-password">Confirm new password</label>
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>

              {passwordError ? (
                <p className={styles.error} role="alert">
                  {passwordError}
                </p>
              ) : null}

              {passwordSuccess ? <p className={styles.success}>{passwordSuccess}</p> : null}

              <Button type="submit" variant="primary" disabled={isSubmittingPassword}>
                {isSubmittingPassword ? 'Changing password…' : 'Change password'}
              </Button>
            </form>
          </Card>
        </div>
      ) : null}
    </main>
  );
}

export default Profile;
