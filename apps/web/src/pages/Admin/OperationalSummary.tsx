import { useEffect, useState } from 'react';
import { apiClient, type OperationalSummary as OperationalSummaryData } from '../../api/client';
import { Card } from '../../components/Card/Card';
import styles from './AdminDashboard.module.css';

export interface OperationalSummaryProps {
  token: string;
}

const STATS: Array<{ key: keyof OperationalSummaryData; label: string }> = [
  { key: 'playerCount', label: 'Players' },
  { key: 'activeGameCount', label: 'Active games' },
  { key: 'totalGameCount', label: 'Total games' },
  { key: 'sessionCount', label: 'Sessions' },
  { key: 'completedSessionCount', label: 'Completed sessions' },
  { key: 'ledgerEntryCount', label: 'Ledger entries' },
  { key: 'totalCreditsInCirculation', label: 'Credits in circulation' },
];

/** GET /admin/reports/summary — basic operational reporting, fetched independently of other sections. */
export function OperationalSummary({ token }: OperationalSummaryProps) {
  const [summary, setSummary] = useState<OperationalSummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    apiClient
      .adminGetSummary(token)
      .then((result) => {
        if (!cancelled) {
          setSummary(result);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load operational summary.');
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
    <Card title="Operational summary">
      {isLoading ? (
        <p>Loading summary…</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : summary ? (
        <div className={styles.statGrid}>
          {STATS.map(({ key, label }) => (
            <div key={key} className={styles.stat}>
              <span className={styles.statValue}>{summary[key]}</span>
              <span className={styles.statLabel}>{label}</span>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

export default OperationalSummary;
