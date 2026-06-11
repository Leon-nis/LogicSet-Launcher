import { useCallback, useEffect, useState } from 'react'
import {
  SOCKETABLE_STATS,
  type SocketableEntry,
  type SocketableKind,
  type SocketableStat
} from '../../../shared/types'
import { PageLayout } from '../components/PageLayout'

type Operation = 'saving' | 'resetting' | null

export const SkullsEyesPage = (): React.JSX.Element => {
  const [socketables, setSocketables] = useState<SocketableEntry[]>([])
  const [isDevMode, setIsDevMode] = useState(false)
  const [newKind, setNewKind] = useState<SocketableKind>('skull')
  const [isLoading, setIsLoading] = useState(true)
  const [operation, setOperation] = useState<Operation>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadSocketables = useCallback(async (): Promise<void> => {
    try {
      const loaded = await window.logicSet.skullsEyes.getSocketables()
      setSocketables([...loaded])
    } catch (loadError: unknown) {
      setError(formatError('Could not load socketables.', loadError))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSocketables()
  }, [loadSocketables])

  const updateSocketable = (
    id: string,
    changes: Partial<Pick<SocketableEntry, 'name' | 'stat' | 'value'>>
  ): void => {
    setSocketables((current) =>
      current.map((socketable) =>
        socketable.id === id ? { ...socketable, ...changes } : socketable
      )
    )
    clearFeedback()
  }

  const addSocketable = (): void => {
    const id = createSocketableId(newKind, socketables)
    setSocketables((current) => [
      ...current,
      {
        id,
        kind: newKind,
        name: '',
        stat: SOCKETABLE_STATS[0],
        value: ''
      }
    ])
    clearFeedback()
  }

  const removeSocketable = (socketable: SocketableEntry): void => {
    if (!window.confirm(`Remove ${socketable.id}?`)) {
      return
    }

    setSocketables((current) =>
      current.filter((entry) => entry.id !== socketable.id)
    )
    clearFeedback()
  }

  const saveSocketables = async (): Promise<void> => {
    setOperation('saving')
    clearFeedback()

    try {
      const saved =
        await window.logicSet.skullsEyes.saveSocketables(socketables)
      setSocketables([...saved])
      setMessage('Socketables saved locally.')
    } catch (saveError: unknown) {
      setError(formatError('Could not save socketables.', saveError))
    } finally {
      setOperation(null)
    }
  }

  const resetSocketables = async (): Promise<void> => {
    if (!window.confirm('Reset all Skulls & Eyes entries to defaults?')) {
      return
    }

    setOperation('resetting')
    clearFeedback()

    try {
      const defaults =
        await window.logicSet.skullsEyes.resetSocketablesToDefaults()
      setSocketables([...defaults])
      setMessage('Socketables reset to defaults.')
    } catch (resetError: unknown) {
      setError(formatError('Could not reset socketables.', resetError))
    } finally {
      setOperation(null)
    }
  }

  const clearFeedback = (): void => {
    setMessage(null)
    setError(null)
  }

  const isBusy = isLoading || operation !== null

  return (
    <PageLayout
      eyebrow="Unique socketables"
      title="Skulls & Eyes"
      description="Manual reference table for LogicSet unique socketables."
    >
      <section className="socketables-panel" aria-busy={isBusy}>
        <div className="socketables-toolbar">
          <div className="socketables-toolbar-copy">
            <h2>Reference entries</h2>
            <p>
              Stored only in the launcher user data. No mod or game files are
              read or changed.
            </p>
          </div>
          <label className="dev-mode-toggle">
            <input
              type="checkbox"
              checked={isDevMode}
              disabled={isBusy}
              onChange={(event) => {
                setIsDevMode(event.target.checked)
                clearFeedback()
              }}
            />
            <span>Dev Mode</span>
          </label>
        </div>

        {isDevMode && (
          <div className="socketables-dev-actions">
            <label htmlFor="newSocketableKind">New socketable</label>
            <select
              id="newSocketableKind"
              value={newKind}
              disabled={isBusy}
              onChange={(event) =>
                setNewKind(event.target.value as SocketableKind)
              }
            >
              <option value="skull">Skull</option>
              <option value="eye">Eye</option>
            </select>
            <button
              className="secondary-button"
              type="button"
              disabled={isBusy}
              onClick={addSocketable}
            >
              Add socketable
            </button>
          </div>
        )}

        <div className="socketables-grid">
          {isLoading ? (
            <p className="socketables-state">Loading socketables...</p>
          ) : socketables.length === 0 ? (
            <p className="socketables-state">No socketables in this table.</p>
          ) : (
            socketables.map((socketable) => (
              <SocketableCard
                key={socketable.id}
                socketable={socketable}
                isDevMode={isDevMode}
                isBusy={isBusy}
                onChange={updateSocketable}
                onRemove={removeSocketable}
              />
            ))
          )}
        </div>

        <div className="socketables-footer">
          <div aria-live="polite">
            {message && <p className="form-message success">{message}</p>}
            {error && <p className="form-message error">{error}</p>}
          </div>
          {isDevMode && (
            <div className="socketables-footer-actions">
              <button
                className="danger-button"
                type="button"
                disabled={isBusy}
                onClick={() => void resetSocketables()}
              >
                {operation === 'resetting' ? 'Resetting...' : 'Reset defaults'}
              </button>
              <button
                className="primary-button"
                type="button"
                disabled={isBusy}
                onClick={() => void saveSocketables()}
              >
                {operation === 'saving' ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  )
}

interface SocketableCardProps {
  readonly socketable: SocketableEntry
  readonly isDevMode: boolean
  readonly isBusy: boolean
  readonly onChange: (
    id: string,
    changes: Partial<Pick<SocketableEntry, 'name' | 'stat' | 'value'>>
  ) => void
  readonly onRemove: (socketable: SocketableEntry) => void
}

const SocketableCard = ({
  socketable,
  isDevMode,
  isBusy,
  onChange,
  onRemove
}: SocketableCardProps): React.JSX.Element => (
  <article className="socketable-card" data-kind={socketable.kind}>
    <div className="socketable-card-heading">
      <div
        className="socketable-icon-placeholder"
        data-kind={socketable.kind}
        aria-label={`${socketable.kind} icon placeholder`}
      >
        {socketable.kind === 'skull' ? 'SKULL' : 'EYE'}
      </div>
      <div className="socketable-identity">
        <span className="socketable-kind" data-kind={socketable.kind}>
          {socketable.kind}
        </span>
        <code>{socketable.id}</code>
      </div>
      {isDevMode && (
        <button
          className="socketable-remove-button"
          type="button"
          disabled={isBusy}
          aria-label={`Remove ${socketable.id}`}
          onClick={() => onRemove(socketable)}
        >
          Remove
        </button>
      )}
    </div>

    <div className="socketable-fields">
      <label>
        <span>Name</span>
        <input
          type="text"
          value={socketable.name}
          disabled={!isDevMode || isBusy}
          placeholder={isDevMode ? 'Enter a name' : 'Not set'}
          onChange={(event) =>
            onChange(socketable.id, { name: event.target.value })
          }
        />
      </label>
      <label>
        <span>Stat</span>
        <select
          value={socketable.stat}
          disabled={!isDevMode || isBusy}
          onChange={(event) =>
            onChange(socketable.id, {
              stat: event.target.value as SocketableStat
            })
          }
        >
          {SOCKETABLE_STATS.map((stat) => (
            <option key={stat} value={stat}>
              {stat}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Value</span>
        <input
          type="text"
          value={socketable.value}
          disabled={!isDevMode || isBusy}
          placeholder={isDevMode ? 'Number, %, formula, or text' : 'Not set'}
          onChange={(event) =>
            onChange(socketable.id, { value: event.target.value })
          }
        />
      </label>
    </div>
  </article>
)

const createSocketableId = (
  kind: SocketableKind,
  socketables: readonly SocketableEntry[]
): string => {
  const ids = new Set(socketables.map((socketable) => socketable.id))
  let sequence = socketables.filter(
    (socketable) => socketable.kind === kind
  ).length + 1
  let id = `${kind}_${String(sequence).padStart(3, '0')}`

  while (ids.has(id)) {
    sequence += 1
    id = `${kind}_${String(sequence).padStart(3, '0')}`
  }

  return id
}

const formatError = (message: string, error: unknown): string =>
  `${message} ${error instanceof Error ? error.message : String(error)}`
