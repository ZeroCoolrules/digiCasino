import { useEffect, useState } from 'react';
import { apiClient, type AuditLogEntry } from '../../api/client';
import { Card } from '../../components/Card/Card';
import styles from './AdminDashboard.module.css';

export interface AuditLogProps {
  token: string;
}

/** GET /admin/audit-log — read-only, tamper-evident log of every admin action, newest first. */
export function AuditLog({ token }: AuditLogProps) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    apiClient
      .adminListAuditLog(token)
      .then((result) => {
        if (!cancelled) {
          setEntries(result.entries);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load audit log.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <Card title="Audit log">
      {isLoading ? (
        <p>Loading audit log…</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : entries.length === 0 ? (
        <p>No audit log entries yet.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Admin</th>
              <th>Action</th>
              <th>Target</th>
              <th>Amount</th>
              <th>Reason</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.adminEmail}</td>
                <td>{entry.action}</td>
                <td>{entry.targetEmail ?? '—'}</td>
                <td>{entry.amount ?? '—'}</td>
                <td>{entry.reason}</td>
                <td>{new Date(entry.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

export default AuditLog;
