import { useEffect, useState } from 'react';
import { apiClient, type AdminGame } from '../../api/client';
import { Button } from '../../components/Button/Button';
import { Card } from '../../components/Card/Card';
import styles from './AdminDashboard.module.css';

export interface GameManagementProps {
  token: string;
}

interface Draft {
  minBet: number;
  maxBet: number;
}

type RowMessage = { type: 'success' | 'error'; text: string };

/** GET /admin/games + PATCH /admin/games/:slug — full catalog management, including inactive games. */
export function GameManagement({ token }: GameManagementProps) {
  const [games, setGames] = useState<AdminGame[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [rowMessages, setRowMessages] = useState<Record<string, RowMessage>>({});

  useEffect(() => {
    let cancelled = false;

    apiClient
      .adminListGames(token)
      .then((result) => {
        if (cancelled) return;
        setGames(result.games);
        const nextDrafts: Record<string, Draft> = {};
        result.games.forEach((game) => {
          nextDrafts[game.slug] = { minBet: game.minBet, maxBet: game.maxBet };
        });
        setDrafts(nextDrafts);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load games.');
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

  function updateDraft(slug: string, field: keyof Draft, value: number) {
    setDrafts((prev) => ({ ...prev, [slug]: { ...prev[slug], [field]: value } }));
  }

  async function handleSave(slug: string) {
    const draft = drafts[slug];
    if (!draft) return;

    setSavingSlug(slug);
    try {
      const result = await apiClient.adminUpdateGame(
        slug,
        { minBet: draft.minBet, maxBet: draft.maxBet },
        token,
      );
      setGames((prev) => prev.map((game) => (game.slug === slug ? result.game : game)));
      setRowMessages((prev) => ({ ...prev, [slug]: { type: 'success', text: 'Saved.' } }));
    } catch (err) {
      setRowMessages((prev) => ({
        ...prev,
        [slug]: { type: 'error', text: err instanceof Error ? err.message : 'Failed to save game.' },
      }));
    } finally {
      setSavingSlug(null);
    }
  }

  async function handleToggleActive(game: AdminGame) {
    setSavingSlug(game.slug);
    try {
      const result = await apiClient.adminUpdateGame(game.slug, { isActive: !game.isActive }, token);
      setGames((prev) => prev.map((entry) => (entry.slug === game.slug ? result.game : entry)));
      setRowMessages((prev) => ({ ...prev, [game.slug]: { type: 'success', text: 'Saved.' } }));
    } catch (err) {
      setRowMessages((prev) => ({
        ...prev,
        [game.slug]: { type: 'error', text: err instanceof Error ? err.message : 'Failed to update game.' },
      }));
    } finally {
      setSavingSlug(null);
    }
  }

  return (
    <Card title="Game management">
      {isLoading ? (
        <p>Loading games…</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Min bet</th>
              <th>Max bet</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => {
              const draft = drafts[game.slug] ?? { minBet: game.minBet, maxBet: game.maxBet };
              const message = rowMessages[game.slug];
              return (
                <tr key={game.slug}>
                  <td>{game.name}</td>
                  <td>
                    <span className={game.isActive ? styles.badgeActive : styles.badgeInactive}>
                      {game.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <input
                      aria-label={`${game.name} min bet`}
                      type="number"
                      value={draft.minBet}
                      onChange={(event) => updateDraft(game.slug, 'minBet', Number(event.target.value))}
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`${game.name} max bet`}
                      type="number"
                      value={draft.maxBet}
                      onChange={(event) => updateDraft(game.slug, 'maxBet', Number(event.target.value))}
                    />
                  </td>
                  <td className={styles.actionsCell}>
                    <Button
                      variant="secondary"
                      onClick={() => handleSave(game.slug)}
                      disabled={savingSlug === game.slug}
                    >
                      Save
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleToggleActive(game)}
                      disabled={savingSlug === game.slug}
                    >
                      {game.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
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

export default GameManagement;
