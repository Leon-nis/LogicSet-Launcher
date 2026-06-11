import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_SOCKETABLE_STAT,
  findSocketableStat,
  SOCKETABLE_STATS,
  type LogicSetAffix,
  type LogicSetSetBonus,
  type LogicSetSetEntry,
  type LogicSetSetRarity,
  type SocketableStat
} from '../../../shared/types'
import { PageLayout } from '../components/PageLayout'

type Operation = 'saving' | 'resetting' | null

export const SetsPage = (): React.JSX.Element => {
  const [sets, setSets] = useState<LogicSetSetEntry[]>([])
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(
    new Set()
  )
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

  const toggleExpanded = (id: string): void => {
    setExpandedIds((current) => {
      const next = new Set(current)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const addSet = (): void => {
    const id = createSetId(sets)
    setSets((current) => [
      ...current,
      {
        id,
        name: '',
        level: 0,
        rarity: 'rare',
        helmet: { isSpecial: false, affixes: [] },
        bonuses: []
      }
    ])
    setExpandedIds((current) => new Set(current).add(id))
    clearFeedback()
  }

  const removeSet = (set: LogicSetSetEntry): void => {
    if (!window.confirm(`Remove ${set.name || set.id}?`)) {
      return
    }

    setSets((current) => current.filter((entry) => entry.id !== set.id))
    setExpandedIds((current) => {
      const next = new Set(current)
      next.delete(set.id)
      return next
    })
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
      setExpandedIds(new Set())
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
            <p>Local reference only. No mod or game files are changed.</p>
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

        <div className="sets-list">
          {isLoading ? (
            <p className="sets-state">Loading sets...</p>
          ) : sortedSets.length === 0 ? (
            <p className="sets-state">No sets in this table.</p>
          ) : (
            sortedSets.map((set) => (
              <SetRow
                key={set.id}
                set={set}
                isExpanded={expandedIds.has(set.id)}
                isDevMode={isDevMode}
                isBusy={isBusy}
                onToggle={() => toggleExpanded(set.id)}
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

interface SetRowProps {
  readonly set: LogicSetSetEntry
  readonly isExpanded: boolean
  readonly isDevMode: boolean
  readonly isBusy: boolean
  readonly onToggle: () => void
  readonly onChange: (set: LogicSetSetEntry) => void
  readonly onRemove: (set: LogicSetSetEntry) => void
}

const SetRow = ({
  set,
  isExpanded,
  isDevMode,
  isBusy,
  onToggle,
  onChange,
  onRemove
}: SetRowProps): React.JSX.Element => {
  const disabled = !isDevMode || isBusy
  const bonusSummary = set.bonuses
    .map((bonus) => bonus.pieces)
    .sort((left, right) => left - right)
    .join(', ')

  const updateDetails = (
    changes: Partial<
      Pick<LogicSetSetEntry, 'name' | 'level' | 'rarity'>
    >
  ): void => onChange({ ...set, ...changes })

  const updateHelmet = (
    changes: Partial<LogicSetSetEntry['helmet']>
  ): void =>
    onChange({
      ...set,
      helmet: { ...set.helmet, ...changes }
    })

  const addHelmetAffix = (): void =>
    updateHelmet({
      affixes: [...set.helmet.affixes, createAffix()]
    })

  const updateHelmetAffix = (
    index: number,
    changes: Partial<LogicSetAffix>
  ): void =>
    updateHelmet({
      affixes: updateAffixes(set.helmet.affixes, index, changes)
    })

  const removeHelmetAffix = (index: number): void =>
    updateHelmet({
      affixes: removeAffix(set.helmet.affixes, index)
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
          affixes: [createAffix()]
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
    <article className="set-row" data-rarity={set.rarity}>
      <button
        className="set-summary"
        type="button"
        aria-expanded={isExpanded}
        onClick={onToggle}
      >
        <span className="set-chevron" aria-hidden="true">
          {isExpanded ? '▼' : '▶'}
        </span>
        <strong>Lv {set.level}</strong>
        <span className="set-summary-name">{set.name || 'Unnamed set'}</span>
        <span className="set-rarity" data-rarity={set.rarity}>
          {formatRarity(set.rarity)}
        </span>
        <span>Bonuses: {bonusSummary || 'None'}</span>
        <span>Helmet Special: {set.helmet.isSpecial ? '✓' : '—'}</span>
      </button>

      {isExpanded && (
        <div className="set-expanded">
          <section className="set-compact-section">
            <div className="set-section-heading">
              <h3>General</h3>
              {isDevMode && (
                <button
                  className="set-remove-button"
                  type="button"
                  disabled={isBusy}
                  onClick={() => onRemove(set)}
                >
                  Remove set
                </button>
              )}
            </div>
            <div className="set-general-grid">
              <label>
                <span>Name</span>
                <input
                  type="text"
                  value={set.name}
                  disabled={disabled}
                  onChange={(event) =>
                    updateDetails({ name: event.target.value })
                  }
                />
              </label>
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
              <label>
                <span>Bonus Pieces</span>
                <div className="set-readonly-field">
                  {bonusSummary || 'None'}
                </div>
              </label>
              <label className="general-helmet-toggle">
                <span>Unique Helmet / Fixed Affixes</span>
                <span className="helmet-special-toggle">
                  <input
                    type="checkbox"
                    checked={set.helmet.isSpecial}
                    disabled={disabled}
                    onChange={(event) =>
                      updateHelmet({ isSpecial: event.target.checked })
                    }
                  />
                  <span>Enabled</span>
                </span>
              </label>
            </div>
          </section>

          {set.helmet.isSpecial && (
            <section className="set-compact-section">
              <div className="set-section-heading">
                <h3>Unique Helmet / Fixed Helmet Affixes</h3>
              </div>
              <div className="helmet-special-content">
                <div
                  className="set-helmet-icon"
                  aria-label="Helmet icon placeholder"
                >
                  HELM
                </div>
                <div className="set-affix-list">
                  {set.helmet.affixes.map((affix, index) => (
                    <AffixRow
                      key={`${index}-${affix.stat}`}
                      affix={affix}
                      index={index}
                      label="Helmet"
                      isDevMode={isDevMode}
                      isBusy={isBusy}
                      onChange={(changes) =>
                        updateHelmetAffix(index, changes)
                      }
                      onRemove={() => removeHelmetAffix(index)}
                    />
                  ))}
                  {set.helmet.affixes.length === 0 && (
                    <p className="set-list-empty">
                      No fixed helmet affixes registered.
                    </p>
                  )}
                  {isDevMode && (
                    <AddAffixButton
                      disabled={isBusy}
                      onClick={addHelmetAffix}
                    />
                  )}
                </div>
              </div>
            </section>
          )}

          <section className="set-compact-section">
            <div className="set-section-heading">
              <h3>Set Bonuses</h3>
              {isDevMode && (
                <button
                  className="set-add-row-button"
                  type="button"
                  disabled={isBusy}
                  onClick={addBonus}
                >
                  Add bonus
                </button>
              )}
            </div>

            <div className="set-bonus-list">
              {set.bonuses.map((bonus, bonusIndex) => (
                <div
                  className="set-bonus-group"
                  key={`${bonusIndex}-${bonus.pieces}`}
                >
                  <div className="set-bonus-label">
                    {isDevMode ? (
                      <label>
                        <span>Pieces</span>
                        <input
                          type="number"
                          value={bonus.pieces}
                          disabled={isBusy}
                          onChange={(event) =>
                            updateBonus(bonusIndex, {
                              pieces: Number(event.target.value)
                            })
                          }
                        />
                      </label>
                    ) : (
                      <strong>{bonus.pieces} pieces</strong>
                    )}
                    {isDevMode && (
                      <button
                        className="set-remove-row-button"
                        type="button"
                        disabled={isBusy}
                        onClick={() => removeBonus(bonusIndex)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="set-affix-list">
                    {bonus.affixes.map((affix, affixIndex) => (
                      <AffixRow
                        key={`${affixIndex}-${affix.stat}`}
                        affix={affix}
                        index={affixIndex}
                        label={`${bonus.pieces} pieces`}
                        isDevMode={isDevMode}
                        isBusy={isBusy}
                        onChange={(changes) =>
                          updateBonus(bonusIndex, {
                            affixes: updateAffixes(
                              bonus.affixes,
                              affixIndex,
                              changes
                            )
                          })
                        }
                        onRemove={() =>
                          updateBonus(bonusIndex, {
                            affixes: removeAffix(
                              bonus.affixes,
                              affixIndex
                            )
                          })
                        }
                      />
                    ))}
                    {bonus.affixes.length === 0 && (
                      <p className="set-list-empty">
                        No affixes registered.
                      </p>
                    )}
                    {isDevMode && (
                      <AddAffixButton
                        disabled={isBusy}
                        onClick={() =>
                          updateBonus(bonusIndex, {
                            affixes: [...bonus.affixes, createAffix()]
                          })
                        }
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </article>
  )
}

interface AffixRowProps {
  readonly affix: LogicSetAffix
  readonly index: number
  readonly label: string
  readonly isDevMode: boolean
  readonly isBusy: boolean
  readonly onChange: (changes: Partial<LogicSetAffix>) => void
  readonly onRemove: () => void
}

const AffixRow = ({
  affix,
  index,
  label,
  isDevMode,
  isBusy,
  onChange,
  onRemove
}: AffixRowProps): React.JSX.Element => (
  <div className="set-affix-row">
    <StatField
      value={affix.stat}
      isDevMode={isDevMode}
      disabled={isBusy}
      onChange={(stat) => onChange({ stat })}
    />
    {isDevMode ? (
      <input
        type="text"
        value={affix.value}
        disabled={isBusy}
        placeholder="Value"
        aria-label={`${label} affix ${index + 1} value`}
        onChange={(event) => onChange({ value: event.target.value })}
      />
    ) : (
      <div className="set-readonly-field">{affix.value || 'Not set'}</div>
    )}
    {isDevMode && (
      <button
        className="set-remove-row-button"
        type="button"
        disabled={isBusy}
        aria-label={`Remove ${label} affix ${index + 1}`}
        onClick={onRemove}
      >
        ×
      </button>
    )}
  </div>
)

interface StatFieldProps {
  readonly value: SocketableStat
  readonly isDevMode: boolean
  readonly disabled: boolean
  readonly onChange: (stat: SocketableStat) => void
}

const StatField = ({
  value,
  isDevMode,
  disabled,
  onChange
}: StatFieldProps): React.JSX.Element =>
  isDevMode ? (
    <select
      value={value}
      disabled={disabled}
      aria-label="Stat"
      onChange={(event) => onChange(event.target.value)}
    >
      {SOCKETABLE_STATS.map((option) => (
        <option key={option.id} value={option.id}>
          {option.code}
        </option>
      ))}
    </select>
  ) : (
    <div className="set-readonly-field">
      {findSocketableStat(value)?.description ?? value}
    </div>
  )

const AddAffixButton = ({
  disabled,
  onClick
}: {
  readonly disabled: boolean
  readonly onClick: () => void
}): React.JSX.Element => (
  <button
    className="set-add-affix-button"
    type="button"
    disabled={disabled}
    onClick={onClick}
  >
    + Affix
  </button>
)

const createAffix = (): LogicSetAffix => ({
  stat: DEFAULT_SOCKETABLE_STAT,
  value: ''
})

const updateAffixes = (
  affixes: readonly LogicSetAffix[],
  index: number,
  changes: Partial<LogicSetAffix>
): readonly LogicSetAffix[] =>
  affixes.map((affix, affixIndex) =>
    affixIndex === index ? { ...affix, ...changes } : affix
  )

const removeAffix = (
  affixes: readonly LogicSetAffix[],
  index: number
): readonly LogicSetAffix[] =>
  affixes.filter((_affix, affixIndex) => affixIndex !== index)

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

const formatRarity = (rarity: LogicSetSetRarity): string =>
  rarity.charAt(0).toUpperCase() + rarity.slice(1)

const formatError = (message: string, error: unknown): string =>
  `${message} ${error instanceof Error ? error.message : String(error)}`
