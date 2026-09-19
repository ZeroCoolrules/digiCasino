import { useEffect, useState, type FormEvent } from 'react';
import { apiClient, type AdminPlayer, type CreditAdjustmentPayload } from '../../api/client';
import { Button } from '../../components/Button/Button';
import { Card } from '../../components/Card/Card';
import styles from './AdminDashboard.module.css';

export interface PlayerManagementProps {
  token: string;
}

interface AdjustmentForm {
  type: 'CREDIT' | 'DEBIT';
  amount: string;
  reason: string;
}

type RowMessage = { type: 'success' | 'error'; text: string };

const EMPTY_FORM: AdjustmentForm = { type: 'CREDIT', amount: '', reason: '' };

/**
 * GET /admin/players + POST /admin/players/:userId/credit-adjustments — player overview and
 * audited demo-credit adjustments (routed through the wallet module server-side, per ADR-005).
 */
export function PlayerManagement({ token }: PlayerManagementProps) {
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [forms, setForms] = useState<Record<string, AdjustmentForm>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, RowMessage>>({});

  useEffect(() => {
    let cancelled = false;

    apiClient
      .adminListPlayers(token)
      .then((result) => {
        if (!cancelled) {
          setPlayers(result.players);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load players.');
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

  function getForm(userId: string): AdjustmentForm {
    return forms[userId] ?? EMPTY_FORM;
  }

  function updateForm(userId: string, patch: Partial<AdjustmentForm>) {
    setForms((prev) => ({ ...prev, [userId]: { ...getForm(userId), ...patch } }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>, userId: string) {
    event.preventDefault();
    const form = getForm(userId);

    setSubmittingId(userId);
    setMessages((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });

    try {
      const payload: CreditAdjustmentPayload = {
        type: form.type,
        amount: Number(form.amount),
        reason: form.reason,
      };
      const result = await apiClient.adminAdjustPlayerCredits(userId, payload, token);
      setPlayers((prev) =>
        prev.map((player) => (player.id === userId ? { ...player, wallet: result.wallet } : player)),
      );
      setMessages((prev) => ({
        ...prev,
        [userId]: {
          type: 'success',
          text: `New balance: ${result.wallet.balance} ${result.wallet.currency}`,
        },
      }));
      setForms((prev) => ({ ...prev, [userId]: EMPTY_FORM }));
    } catch (err) {
      setMessages((prev) => ({
        ...prev,
        [userId]: { type: 'error', text: err instanceof Error ? err.message : 'Failed to adjust credits.' },
      }));
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <Card title="Player management">
      {isLoading ? (
        <p>Loading players…</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Balance</th>
              <th>Adjust credits</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => {
              const form = getForm(player.id);
              const message = messages[player.id];
              return (
                <tr key={player.id}>
                  <td>{player.email}</td>
                  <td>{player.role}</td>
                  <td>
                    {player.wallet.balance} {player.wallet.currency}
                  </td>
                  <td>
                    <form
                      className={styles.inlineForm}
                      aria-label={`Adjust credits for ${player.email}`}
                      onSubmit={(event) => handleSubmit(event, player.id)}
                    >
                      <select
                        aria-label={`Adjustment type for ${player.email}`}
                        value={form.type}
                        onChange={(event) =>
                          updateForm(player.id, { type: event.target.value as 'CREDIT' | 'DEBIT' })
                        }
                      >
                        <option value="CREDIT">Credit</option>
                        <option value="DEBIT">Debit</option>
                      </select>
                      <input
                        aria-label={`Adjustment amount for ${player.email}`}
                        type="number"
                        min={0}
                        step="any"
                        value={form.amount}
                        onChange={(event) => updateForm(player.id, { amount: event.target.value })}
                        required
                      />
                      <input
                        aria-label={`Adjustment reason for ${player.email}`}
                        type="text"
                        placeholder="Reason"
                        value={form.reason}
                        onChange={(event) => updateForm(player.id, { reason: event.target.value })}
                        required
                      />
                      <Button type="submit" variant="secondary" disabled={submittingId === player.id}>
                        Submit
                      </Button>
                    </form>
                    {message ? (
                      <span
                        role={message.type === 'error' ? 'alert' : undefined}
                        className={message.type === 'error' ? styles.error : styles.success}
                      >
                        {message.text}
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
}

export default PlayerManagement;
