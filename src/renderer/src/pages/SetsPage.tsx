import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  SOCKETABLE_STATS,
  type LogicSetHelmetAffix,
  type LogicSetSetBonus,
  type LogicSetSetEntry,
  type LogicSetSetRarity,
  type SocketableStat
} from '../../../shared/types'
import { PageLayout } from '../components/PageLayout'

type Operation = 'saving' | 'resetting' | null

export const SetsPage = (): React.JSX.Element => {
  const [sets, setSets] = useState<LogicSetSetEntry[]>([])
  const [isDevMode, setIsDevMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [operation, setOperation] = useState<Operation>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sortedSets = useMemo(
    () =>
      [...sets].sort(
        (left, right) =>
          left.level - right.level || left.name.localeCompare(right.name)
      ),
    [sets]
  )

  const loadSets = useCallback(async (): Promise<void> => {
    try {
      const loaded = await window.logicSet.sets.getSets()
      setSets([...loaded])
    } catch (loadError: unknown) {
      setError(formatError('Could not load sets.', loadError))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSets()
  }, [loadSets])

  const replaceSet = (updatedSet: LogicSetSetEntry): void => {
    setSets((current) =>
      current.map((set) => (set.id === updatedSet.id ? updatedSet : set))
    )
    clearFeedback()
  }

  const addSet = (): void => {
    setSets((current) => [
      ...current,
      {
        id: createSetId(current),
        name: '',
        level: 0,
        rarity: 'rare',
        helmet: { affixes: [] },
        bonuses: []
      }
    ])
    clearFeedback()
  }

  const removeSet = (set: LogicSetSetEntry): void => {
    if (!window.confirm(`Remove ${set.name || set.id}?`)) {
      return
    }

    setSets((current) => current.filter((entry) => entry.id !== set.id))
    clearFeedback()
  }

  const saveSets = async (): Promise<void> => {
    setOperation('saving')
    clearFeedback()

    try {
      const saved = await window.logicSet.sets.saveSets(sets)
      setSets([...saved])
      setMessage('Sets saved locally.')
    } catch (saveError: unknown) {
      setError(formatError('Could not save sets.', saveError))
    } finally {
      setOperation(null)
    }
  }

  const resetSets = async (): Promise<void> => {
    if (!window.confirm('Reset all Sets entries to defaults?')) {
      return
    }

    setOperation('resetting')
    clearFeedback()

    try {
      const defaults = await window.logicSet.sets.resetSetsToDefaults()
      setSets([...defaults])
      setMessage('Sets reset to defaults.')
    } catch (resetError: unknown) {
      setError(formatError('Could not reset sets.', resetError))
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
      eyebrow="Equipment reference"
      title="Sets"
      description="Manual reference table for LogicSet equipment sets."
    >
      <section className="sets-panel" aria-busy={isBusy}>
        <div className="sets-toolbar">
          <div className="sets-toolbar-copy">
            <h2>Set registry</h2>
            <p>
              Stored only in launcher user data. No mod or game files are read
              or changed.
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
          <div className="sets-dev-actions">
            <span>Add a blank set with temporary rare rarity.</span>
            <button
              className="secondary-button"
              type="button"
              disabled={isBusy}
              onClick={addSet}
            >
              Add set
            </button>
          </div>
        )}

        <div className="sets-grid">
          {isLoading ? (
            <p className="sets-state">Loading sets...</p>
          ) : sortedSets.length === 0 ? (
            <p className="sets-state">No sets in this table.</p>
          ) : (
            sortedSets.map((set) => (
              <SetCard
                key={set.id}
                set={set}
                isDevMode={isDevMode}
                isBusy={isBusy}
                onChange={replaceSet}
                onRemove={removeSet}
              />
            ))
          )}
        </div>

        <div className="sets-footer">
          <div aria-live="polite">
            {message && <p className="form-message success">{message}</p>}
            {error && <p className="form-message error">{error}</p>}
          </div>
          {isDevMode && (
            <div className="sets-footer-actions">
              <button
                className="danger-button"
                type="button"
                disabled={isBusy}
                onClick={() => void resetSets()}
              >
                {operation === 'resetting' ? 'Resetting...' : 'Reset defaults'}
              </button>
              <button
                className="primary-button"
                type="button"
                disabled={isBusy}
                onClick={() => void saveSets()}
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

interface SetCardProps {
  readonly set: LogicSetSetEntry
  readonly isDevMode: boolean
  readonly isBusy: boolean
  readonly onChange: (set: LogicSetSetEntry) => void
  readonly onRemove: (set: LogicSetSetEntry) => void
}

const SetCard = ({
  set,
  isDevMode,
  isBusy,
  onChange,
  onRemove
}: SetCardProps): React.JSX.Element => {
  const disabled = !isDevMode || isBusy

  const updateDetails = (
    changes: Partial<
      Pick<LogicSetSetEntry, 'name' | 'level' | 'rarity'>
    >
  ): void => onChange({ ...set, ...changes })

  const updateAffix = (
    index: number,
    changes: Partial<LogicSetHelmetAffix>
  ): void =>
    onChange({
      ...set,
      helmet: {
        ...set.helmet,
        affixes: set.helmet.affixes.map((affix, affixIndex) =>
          affixIndex === index ? { ...affix, ...changes } : affix
        )
      }
    })

  const addAffix = (): void =>
    onChange({
      ...set,
      helmet: {
        ...set.helmet,
        affixes: [
          ...set.helmet.affixes,
          { stat: SOCKETABLE_STATS[0], value: '' }
        ]
      }
    })

  const removeAffix = (index: number): void =>
    onChange({
      ...set,
      helmet: {
        ...set.helmet,
        affixes: set.helmet.affixes.filter(
          (_affix, affixIndex) => affixIndex !== index
        )
      }
    })

  const updateBonus = (
    index: number,
    changes: Partial<LogicSetSetBonus>
  ): void =>
    onChange({
      ...set,
      bonuses: set.bonuses.map((bonus, bonusIndex) =>
        bonusIndex === index ? { ...bonus, ...changes } : bonus
      )
    })

  const addBonus = (): void =>
    onChange({
      ...set,
      bonuses: [
        ...set.bonuses,
        {
          pieces: nextPieceCount(set.bonuses),
          stat: SOCKETABLE_STATS[0]
        }
      ]
    })

  const removeBonus = (index: number): void =>
    onChange({
      ...set,
      bonuses: set.bonuses.filter(
        (_bonus, bonusIndex) => bonusIndex !== index
      )
    })

  return (
    <article className="set-card" data-rarity={set.rarity}>
      <div className="set-card-heading">
        <div className="set-helmet-icon" aria-label="Helmet icon placeholder">
          HELM
        </div>
        <div className="set-heading-fields">
          <label>
            <span>Name</span>
            <input
              type="text"
              value={set.name}
              disabled={disabled}
              placeholder={isDevMode ? 'Set name' : 'Not set'}
              onChange={(event) =>
                updateDetails({ name: event.target.value })
              }
            />
          </label>
          <div className="set-meta-fields">
            <label>
              <span>Level</span>
              <input
                type="number"
                value={set.level}
                disabled={disabled}
                onChange={(event) =>
                  updateDetails({ level: Number(event.target.value) })
                }
              />
            </label>
            <label>
              <span>Rarity</span>
              <select
                value={set.rarity}
                disabled={disabled}
                onChange={(event) =>
                  updateDetails({
                    rarity: event.target.value as LogicSetSetRarity
                  })
                }
              >
                <option value="rare">Rare</option>
                <option value="unique">Unique</option>
                <option value="legendary">Legendary</option>
              </select>
            </label>
          </div>
        </div>
        {isDevMode && (
          <button
            className="set-remove-button"
            type="button"
            disabled={isBusy}
            onClick={() => onRemove(set)}
          >
            Remove
          </button>
        )}
      </div>

      <code className="set-id">{set.id}</code>

      <SetListSection
        title="Helmet affixes"
        emptyText="No helmet affixes registered."
        isEmpty={set.helmet.affixes.length === 0}
        isDevMode={isDevMode}
        isBusy={isBusy}
        addLabel="Add affix"
        onAdd={addAffix}
      >
        {set.helmet.affixes.map((affix, index) => (
          <div className="set-entry-row affix-row" key={`${index}-${affix.stat}`}>
            <StatSelect
              value={affix.stat}
              disabled={disabled}
              onChange={(stat) => updateAffix(index, { stat })}
            />
            <input
              type="text"
              value={affix.value}
              disabled={disabled}
              placeholder={isDevMode ? 'Value' : 'Not set'}
              aria-label={`Helmet affix ${index + 1} value`}
              onChange={(event) =>
                updateAffix(index, { value: event.target.value })
              }
            />
            {isDevMode && (
              <RemoveRowButton
                disabled={isBusy}
                label={`Remove helmet affix ${index + 1}`}
                onClick={() => removeAffix(index)}
              />
            )}
          </div>
        ))}
      </SetListSection>

      <SetListSection
        title="Bonuses by pieces"
        emptyText="No set bonuses registered."
        isEmpty={set.bonuses.length === 0}
        isDevMode={isDevMode}
        isBusy={isBusy}
        addLabel="Add bonus"
        onAdd={addBonus}
      >
        {set.bonuses.map((bonus, index) => (
          <div className="set-entry-row bonus-row" key={`${index}-${bonus.pieces}`}>
            <label className="pieces-field">
              <span>Pieces</span>
              <input
                type="number"
                value={bonus.pieces}
                disabled={disabled}
                aria-label={`Bonus ${index + 1} pieces`}
                onChange={(event) =>
                  updateBonus(index, {
                    pieces: Number(event.target.value)
                  })
                }
              />
            </label>
            <StatSelect
              value={bonus.stat}
              disabled={disabled}
              onChange={(stat) => updateBonus(index, { stat })}
            />
            {isDevMode && (
              <RemoveRowButton
                disabled={isBusy}
                label={`Remove bonus ${index + 1}`}
                onClick={() => removeBonus(index)}
              />
            )}
          </div>
        ))}
      </SetListSection>
    </article>
  )
}

interface SetListSectionProps {
  readonly title: string
  readonly emptyText: string
  readonly isEmpty: boolean
  readonly isDevMode: boolean
  readonly isBusy: boolean
  readonly addLabel: string
  readonly onAdd: () => void
  readonly children: React.ReactNode
}

const SetListSection = ({
  title,
  emptyText,
  isEmpty,
  isDevMode,
  isBusy,
  addLabel,
  onAdd,
  children
}: SetListSectionProps): React.JSX.Element => (
  <section className="set-list-section">
    <div className="set-list-heading">
      <h3>{title}</h3>
      {isDevMode && (
        <button
          className="set-add-row-button"
          type="button"
          disabled={isBusy}
          onClick={onAdd}
        >
          {addLabel}
        </button>
      )}
    </div>
    {isEmpty ? <p className="set-list-empty">{emptyText}</p> : children}
  </section>
)

interface StatSelectProps {
  readonly value: SocketableStat
  readonly disabled: boolean
  readonly onChange: (stat: SocketableStat) => void
}

const StatSelect = ({
  value,
  disabled,
  onChange
}: StatSelectProps): React.JSX.Element => (
  <select
    value={value}
    disabled={disabled}
    aria-label="Stat"
    onChange={(event) => onChange(event.target.value as SocketableStat)}
  >
    {SOCKETABLE_STATS.map((stat) => (
      <option key={stat} value={stat}>
        {stat}
      </option>
    ))}
  </select>
)

interface RemoveRowButtonProps {
  readonly disabled: boolean
  readonly label: string
  readonly onClick: () => void
}

const RemoveRowButton = ({
  disabled,
  label,
  onClick
}: RemoveRowButtonProps): React.JSX.Element => (
  <button
    className="set-remove-row-button"
    type="button"
    disabled={disabled}
    aria-label={label}
    onClick={onClick}
  >
    Remove
  </button>
)

const nextPieceCount = (
  bonuses: readonly LogicSetSetBonus[]
): number =>
  bonuses.length === 0
    ? 2
    : Math.max(...bonuses.map((bonus) => bonus.pieces)) + 1

const createSetId = (sets: readonly LogicSetSetEntry[]): string => {
  const ids = new Set(sets.map((set) => set.id))
  let sequence = sets.length + 1
  let id = `set_${String(sequence).padStart(3, '0')}`

  while (ids.has(id)) {
    sequence += 1
    id = `set_${String(sequence).padStart(3, '0')}`
  }

  return id
}

const formatError = (message: string, error: unknown): string =>
  `${message} ${error instanceof Error ? error.message : String(error)}`
