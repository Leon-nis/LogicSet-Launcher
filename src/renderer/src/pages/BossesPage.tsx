import { useState } from 'react'
import eldraynIcon from '../assets/generated/icon_eldrayn.webp'
import fallenIcon from '../assets/generated/icon_fallen.webp'
import grellIcon from '../assets/generated/icon_grell.webp'
import hoofIcon from '../assets/generated/icon_hoof.webp'
import kidrikIcon from '../assets/generated/icon_kidrik.webp'
import mordroxIcon from '../assets/generated/icon_mordrox.webp'
import poggIcon from '../assets/generated/icon_pogg.webp'
import widowIcon from '../assets/generated/icon_widow.webp'
import willyIcon from '../assets/generated/icon_willy.webp'
import { PageLayout } from '../components/PageLayout'
import { useDevMode } from '../contexts/DevModeContext'

type ArmorKind = 'Physical' | 'Ice' | 'Fire' | 'Electric' | 'Poison'
type RatingKind = 'Fatality' | 'Brutality' | 'Agility' | 'Hostility'

interface BossEntry {
  readonly id: string
  readonly name: string
  readonly act: string
  readonly iconPath: string
  readonly speed: number
  readonly criticalChance: number
  readonly hp: number
  readonly armor: Readonly<Record<ArmorKind, number>>
  readonly ratings: Readonly<Record<RatingKind, number>>
}

const armorKinds: readonly ArmorKind[] = [
  'Physical',
  'Ice',
  'Fire',
  'Electric',
  'Poison'
]

const ratingKinds: readonly RatingKind[] = [
  'Fatality',
  'Brutality',
  'Agility',
  'Hostility'
]

const ratingLabels: Readonly<Record<RatingKind, string>> = {
  Fatality: 'Fatality',
  Brutality: 'Brutality',
  Agility: 'Dificulty',
  Hostility: 'Boss Arena'
}

const bosses: readonly BossEntry[] = [
  {
    id: 'fallen-guardian',
    name: 'Fallen Guardian',
    act: 'Act 1',
    iconPath: fallenIcon,
    speed: 8.2,
    criticalChance: 5,
    hp: 2499,
    armor: {
      Physical: 27,
      Ice: 68,
      Fire: 0,
      Electric: 27,
      Poison: 54
    },
    ratings: {
      Fatality: 5,
      Brutality: 1,
      Agility: 3,
      Hostility: 3
    }
  },
  {
    id: 'willy',
    name: 'Willy',
    act: 'Act 1',
    iconPath: willyIcon,
    speed: 6,
    criticalChance: 0,
    hp: 6219,
    armor: {
      Physical: 73,
      Ice: 8,
      Fire: 73,
      Electric: 73,
      Poison: 146
    },
    ratings: {
      Fatality: 2,
      Brutality: 4,
      Agility: 1,
      Hostility: 2
    }
  },
  {
    id: 'mordrox',
    name: 'Mordrox',
    act: 'Act 1',
    iconPath: mordroxIcon,
    speed: 4,
    criticalChance: 5,
    hp: 15430,
    armor: {
      Physical: 7,
      Ice: 7,
      Fire: 7,
      Electric: 7,
      Poison: 96
    },
    ratings: {
      Fatality: 1,
      Brutality: 2,
      Agility: 1,
      Hostility: 3
    }
  },
  {
    id: 'general-grell',
    name: 'General Grell',
    act: 'Act 1',
    iconPath: grellIcon,
    speed: 8,
    criticalChance: 5,
    hp: 11037,
    armor: {
      Physical: 123,
      Ice: 21,
      Fire: 82,
      Electric: 82,
      Poison: 21
    },
    ratings: {
      Fatality: 4,
      Brutality: 3,
      Agility: 1,
      Hostility: 2
    }
  },
  {
    id: 'widow',
    name: 'Widow',
    act: 'Act 1',
    iconPath: widowIcon,
    speed: 10,
    criticalChance: 5,
    hp: 12807,
    armor: {
      Physical: 102,
      Ice: 102,
      Fire: 28,
      Electric: 102,
      Poison: 153
    },
    ratings: {
      Fatality: 5,
      Brutality: 1,
      Agility: 4,
      Hostility: 1
    }
  },
  {
    id: 'king-pogg',
    name: 'King Pogg',
    act: 'Act 1',
    iconPath: poggIcon,
    speed: 10,
    criticalChance: 5,
    hp: 23401,
    armor: {
      Physical: 172,
      Ice: 172,
      Fire: 35,
      Electric: 103,
      Poison: 35
    },
    ratings: {
      Fatality: 2,
      Brutality: 5,
      Agility: 4,
      Hostility: 2
    }
  },
  {
    id: 'kidrik',
    name: 'Kidrik',
    act: 'Act 1',
    iconPath: kidrikIcon,
    speed: 11,
    criticalChance: 5,
    hp: 8820,
    armor: {
      Physical: 149,
      Ice: 149,
      Fire: 149,
      Electric: 149,
      Poison: 149
    },
    ratings: {
      Fatality: 3,
      Brutality: 1,
      Agility: 5,
      Hostility: 2
    }
  },
  {
    id: 'chillhoof',
    name: 'Chillhoof',
    act: 'Act 1',
    iconPath: hoofIcon,
    speed: 8,
    criticalChance: 5,
    hp: 20212,
    armor: {
      Physical: 164,
      Ice: 187,
      Fire: 112,
      Electric: 149,
      Poison: 38
    },
    ratings: {
      Fatality: 3,
      Brutality: 3,
      Agility: 1,
      Hostility: 4
    }
  },
  {
    id: 'eldrayn',
    name: 'Eldrayn',
    act: 'Act 1',
    iconPath: eldraynIcon,
    speed: 5,
    criticalChance: 5,
    hp: 34995,
    armor: {
      Physical: 176,
      Ice: 176,
      Fire: 176,
      Electric: 176,
      Poison: 176
    },
    ratings: {
      Fatality: 3,
      Brutality: 4,
      Agility: 2,
      Hostility: 4
    }
  }
]

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
  const [editableBosses, setEditableBosses] =
    useState<readonly BossEntry[]>(bosses)

  const updateBossStat = (
    bossId: string,
    stat: 'speed' | 'criticalChance',
    value: number
  ): void => {
    setEditableBosses((currentBosses) =>
      currentBosses.map((boss) =>
        boss.id === bossId
          ? {
              ...boss,
              [stat]: value
            }
          : boss
      )
    )
  }

  const updateBossRating = (
    bossId: string,
    rating: RatingKind,
    value: number
  ): void => {
    setEditableBosses((currentBosses) =>
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
  }

  return (
    <section className="bosses-panel" aria-label="Act 1 boss list">
      <div className="bosses-toolbar">
        <div className="bosses-toolbar-copy">
          <h2>Boss Index</h2>
          <p>{editableBosses.length} encounters loaded from the current Act 1 icon set.</p>
        </div>
        <span className="bosses-count">{editableBosses.length} bosses</span>
      </div>

      <div className="bosses-grid">
        {editableBosses.map((boss) => (
          <article className="boss-card" key={boss.id}>
            <div className="boss-card-visual">
              <img src={boss.iconPath} alt="" aria-hidden="true" />
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
                        value={boss.speed}
                        onChange={(event) =>
                          updateBossStat(
                            boss.id,
                            'speed',
                            readNumberInput(event.target.value, boss.speed, 0, 999)
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
                        value={boss.criticalChance}
                        onChange={(event) =>
                          updateBossStat(
                            boss.id,
                            'criticalChance',
                            readNumberInput(event.target.value, boss.criticalChance, 0, 100)
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
                  <div className="boss-armor-item" data-armor={kind.toLowerCase()} key={kind}>
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
                        value={boss.ratings[kind]}
                        onChange={(event) =>
                          updateBossRating(
                            boss.id,
                            kind,
                            readNumberInput(event.target.value, boss.ratings[kind], 0, 5)
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
    </section>
  )
}

export const BossesPage = (): React.JSX.Element => (
  <PageLayout
    eyebrow="Monsters / Boss"
    title="Act 1 Bosses"
    description="Boss reference with optimized icons, combat stats, armor values, and encounter ratings."
  >
    <BossesSection />
  </PageLayout>
)
