import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/Card/Card';
import { Link } from '../../router/Router';
import { Button } from '../../components/Button/Button';
import { OperationalSummary } from './OperationalSummary';
import { GameManagement } from './GameManagement';
import { PlayerManagement } from './PlayerManagement';
import { AuditLog } from './AuditLog';
import styles from './AdminDashboard.module.css';

/**
 * Admin dashboard (Task 003). Server-side authorization is the real enforcement mechanism (any
 * non-ADMIN request is rejected with 403 FORBIDDEN by the backend, per ADR-005 /
 * SYSTEM_ARCHITECTURE.md) -- this client-side role check is a UX nicety only, so a non-admin
 * doesn't see a broken dashboard full of failed requests.
 */
export function AdminDashboard() {
  const { user, token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className={styles.page}>
        <p>Checking session…</p>
      </main>
    );
  }

  if (!user || !token || user.role !== 'ADMIN') {
    return (
      <main className={styles.page}>
        <Card>
          <p role="alert">You do not have access to this page.</p>
          <Link to="/lobby">
            <Button variant="secondary">Back to lobby</Button>
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>Admin dashboard</h1>
        <Link to="/lobby">
          <Button variant="secondary">Back to lobby</Button>
        </Link>
      </header>

      <div className={styles.sections}>
        <OperationalSummary token={token} />
        <GameManagement token={token} />
        <PlayerManagement token={token} />
        <AuditLog token={token} />
      </div>
    </main>
  );
}

export default AdminDashboard;
