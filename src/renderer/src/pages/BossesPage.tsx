import { useCallback, useEffect, useState } from 'react'
import type {
  LogicSetBossArmorKind,
  LogicSetBossEntry,
  LogicSetBossRatingKind
} from '../../../shared/types'
import artificerIcon from '../assets/generated/icon_artificer.webp'
import eldraynIcon from '../assets/generated/icon_eldrayn.webp'
import fallenIcon from '../assets/generated/icon_fallen.webp'
import grellIcon from '../assets/generated/icon_grell.webp'
import hoofIcon from '../assets/generated/icon_hoof.webp'
import juthamaIcon from '../assets/generated/icon_juthama.webp'
import kidrikIcon from '../assets/generated/icon_kidrik.webp'
import manaforgedIcon from '../assets/generated/icon_manaforged.webp'
import manticoreIcon from '../assets/generated/icon_manticore.webp'
import mordroxIcon from '../assets/generated/icon_mordrox.webp'
import poggIcon from '../assets/generated/icon_pogg.webp'
import widowIcon from '../assets/generated/icon_widow.webp'
import willyIcon from '../assets/generated/icon_willy.webp'
import { useDevMode } from '../contexts/DevModeContext'

type Operation = 'saving' | 'resetting' | null

const armorKinds: readonly LogicSetBossArmorKind[] = [
  'Physical',
  'Ice',
  'Fire',
  'Electric',
  'Poison'
]

const ratingKinds: readonly LogicSetBossRatingKind[] = [
  'Fatality',
  'Brutality',
  'Agility',
  'Hostility'
]

const ratingLabels: Readonly<Record<LogicSetBossRatingKind, string>> = {
  Fatality: 'Fatality',
  Brutality: 'Brutality',
  Agility: 'Dificulty',
  Hostility: 'Boss Arena'
}

const bossIcons: Readonly<Record<string, string>> = {
  'fallen-guardian': fallenIcon,
  willy: willyIcon,
  mordrox: mordroxIcon,
  'general-grell': grellIcon,
  widow: widowIcon,
  'king-pogg': poggIcon,
  kidrik: kidrikIcon,
  chillhoof: hoofIcon,
  eldrayn: eldraynIcon,
  manticore: manticoreIcon,
  'juthama-kasam': juthamaIcon,
  manaforged: manaforgedIcon,
  artificer: artificerIcon
}

const numberFormatter = new Intl.NumberFormat('en-US')

const formatStat = (value: number): string => numberFormatter.format(value)

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

const readNumberInput = (
  value: string,
  fallback: number,
  min: number,
  max: number
): number => {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue)
    ? clamp(parsedValue, min, max)
    : fallback
}

export const BossesSection = (): React.JSX.Element => {
  const isDevMode = useDevMode()
  const [bosses, setBosses] = useState<LogicSetBossEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [operation, setOperation] = useState<Operation>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadBosses = useCallback(async (): Promise<void> => {
    try {
      const loaded = await window.logicSet.bosses.getBosses()
      setBosses([...loaded])
    } catch (loadError: unknown) {
      setError(formatError('Could not load bosses.', loadError))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadBosses()
  }, [loadBosses])

  const clearFeedback = (): void => {
    setMessage(null)
    setError(null)
  }

  const updateBossStat = (
    bossId: string,
    stat: 'speed' | 'criticalChance',
    value: number
  ): void => {
    setBosses((currentBosses) =>
      currentBosses.map((boss) =>
        boss.id === bossId
          ? {
              ...boss,
              [stat]: value
            }
          : boss
      )
    )
    clearFeedback()
  }

  const updateBossRating = (
    bossId: string,
    rating: LogicSetBossRatingKind,
    value: number
  ): void => {
    setBosses((currentBosses) =>
      currentBosses.map((boss) =>
        boss.id === bossId
          ? {
              ...boss,
              ratings: {
                ...boss.ratings,
                [rating]: value
              }
            }
          : boss
      )
    )
    clearFeedback()
  }

  const saveBosses = async (): Promise<void> => {
    setOperation('saving')
    clearFeedback()

    try {
      const saved = await window.logicSet.bosses.saveBosses(bosses)
      setBosses([...saved])
      setMessage('Bosses saved locally.')
    } catch (saveError: unknown) {
      setError(formatError('Could not save bosses.', saveError))
    } finally {
      setOperation(null)
    }
  }

  const resetBosses = async (): Promise<void> => {
    if (!window.confirm('Reset all Boss entries to defaults?')) {
      return
    }

    setOperation('resetting')
    clearFeedback()

    try {
      const defaults = await window.logicSet.bosses.resetBossesToDefaults()
      setBosses([...defaults])
      setMessage('Bosses reset to defaults.')
    } catch (resetError: unknown) {
      setError(formatError('Could not reset bosses.', resetError))
    } finally {
      setOperation(null)
    }
  }

  const isBusy = isLoading || operation !== null

  return (
    <section
      className="bosses-panel"
      aria-busy={isBusy}
      aria-label="Boss list"
    >
      <div className="bosses-toolbar">
        <div className="bosses-toolbar-copy">
          <h2>Boss Index</h2>
          <p>{bosses.length} encounters loaded from the local boss registry.</p>
        </div>
        <span className="bosses-count">{bosses.length} bosses</span>
      </div>

      {isLoading ? (
        <p className="bosses-state">Loading bosses...</p>
      ) : bosses.length === 0 ? (
        <p className="bosses-state">No bosses in this table.</p>
      ) : (
        <div className="bosses-grid">
          {bosses.map((boss) => (
            <article className="boss-card" key={boss.id}>
              <div className="boss-card-visual">
                <img
                  src={bossIcons[boss.id] ?? fallenIcon}
                  alt=""
                  aria-hidden="true"
                />
              </div>

              <div className="boss-card-content">
                <header className="boss-card-header">
                  <div>
                    <span className="boss-act">{boss.act}</span>
                    <h2>{boss.name}</h2>
                  </div>
                  <strong className="boss-hp">{formatStat(boss.hp)} HP</strong>
                </header>

                <dl className="boss-core-stats">
                  <div>
                    <dt>Speed</dt>
                    <dd>
                      {isDevMode ? (
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          aria-label={`${boss.name} speed`}
                          disabled={isBusy}
                          value={boss.speed}
                          onChange={(event) =>
                            updateBossStat(
                              boss.id,
                              'speed',
                              readNumberInput(
                                event.target.value,
                                boss.speed,
                                0,
                                999
                              )
                            )
                          }
                        />
                      ) : (
                        boss.speed
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Critical</dt>
                    <dd>
                      {isDevMode ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          aria-label={`${boss.name} critical chance`}
                          disabled={isBusy}
                          value={boss.criticalChance}
                          onChange={(event) =>
                            updateBossStat(
                              boss.id,
                              'criticalChance',
                              readNumberInput(
                                event.target.value,
                                boss.criticalChance,
                                0,
                                100
                              )
                            )
                          }
                        />
                      ) : (
                        `${boss.criticalChance}%`
                      )}
                    </dd>
                  </div>
                </dl>

                <dl className="boss-armor-grid">
                  {armorKinds.map((kind) => (
                    <div
                      className="boss-armor-item"
                      data-armor={kind.toLowerCase()}
                      key={kind}
                    >
                      <dt>{kind}</dt>
                      <dd>{boss.armor[kind]}</dd>
                    </div>
                  ))}
                </dl>

                <div className="boss-rating-list">
                  {ratingKinds.map((kind) => (
                    <div className="boss-rating" key={kind}>
                      <span>{ratingLabels[kind]}</span>
                      <div
                        className="boss-rating-pips"
                        aria-label={`${ratingLabels[kind]}: ${boss.ratings[kind]} of 5`}
                      >
                        {Array.from({ length: 5 }, (_, index) => (
                          <span
                            data-filled={index < boss.ratings[kind]}
                            key={index}
                          />
                        ))}
                      </div>
                      {isDevMode ? (
                        <input
                          type="number"
                          min="0"
                          max="5"
                          step="1"
                          aria-label={`${boss.name} ${ratingLabels[kind]}`}
                          disabled={isBusy}
                          value={boss.ratings[kind]}
                          onChange={(event) =>
                            updateBossRating(
                              boss.id,
                              kind,
                              readNumberInput(
                                event.target.value,
                                boss.ratings[kind],
                                0,
                                5
                              )
                            )
                          }
                        />
                      ) : (
                        <strong>{boss.ratings[kind]}/5</strong>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="bosses-footer">
        <div aria-live="polite">
          {message && <p className="form-message success">{message}</p>}
          {error && <p className="form-message error">{error}</p>}
        </div>
        {isDevMode && (
          <div className="bosses-footer-actions">
            <button
              className="danger-button"
              type="button"
              disabled={isBusy}
              onClick={() => void resetBosses()}
            >
              {operation === 'resetting' ? 'Resetting...' : 'Reset defaults'}
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={isBusy}
              onClick={() => void saveBosses()}
            >
              {operation === 'saving' ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

const formatError = (prefix: string, error: unknown): string =>
  error instanceof Error ? `${prefix} ${error.message}` : prefix
