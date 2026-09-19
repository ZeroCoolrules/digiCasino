import { useEffect, useState } from 'react';
import { apiClient, type Transaction } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/Button/Button';
import { Card } from '../../components/Card/Card';
import { Link } from '../../router/Router';
import styles from './Transactions.module.css';

export function Transactions() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    apiClient
      .listTransactions(token)
      .then((res) => {
        if (!cancelled) {
          setTransactions(res.transactions);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load transaction history.');
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

  if (!token) {
    return (
      <main className={styles.page}>
        <Card>
          <p>You need to log in to view your transaction history.</p>
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
        <h1>Transaction history</h1>
        <Link to="/lobby">
          <Button variant="secondary">Back to lobby</Button>
        </Link>
      </header>

      {isLoading ? (
        <p>Loading transactions…</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : transactions.length === 0 ? (
        <p>No transactions yet.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Type</th>
              <th>Amount</th>
              <th>Reason</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.type}</td>
                <td>{entry.amount}</td>
                <td>{entry.reason}</td>
                <td>{new Date(entry.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

export default Transactions;
