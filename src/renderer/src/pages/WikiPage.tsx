import { useEffect, useState } from 'react'
import type { WikiPage as WikiPageId } from '../../../shared/types'
import { PageLayout } from '../components/PageLayout'
import { SetsPage } from './SetsPage'
import { SkullsEyesPage } from './SkullsEyesPage'
import {
  BossesPage,
  MonstersPage,
  QuestsPage,
  SkillsPage
} from './WipPage'

interface WikiEntry {
  readonly id: WikiPageId
  readonly label: string
  readonly marker: string
  readonly description: string
  readonly component: React.ComponentType
}

const wikiEntries: readonly WikiEntry[] = [
  {
    id: 'skulls-eyes',
    label: 'Items',
    marker: 'IT',
    description: 'Unique skulls, eyes, stats, and values.',
    component: SkullsEyesPage
  },
  {
    id: 'sets',
    label: 'Sets',
    marker: 'ST',
    description: 'Equipment sets, bonuses, and special pieces.',
    component: SetsPage
  },
  {
    id: 'monsters',
    label: 'Monsters',
    marker: 'MO',
    description: 'Enemy reference and encounter information.',
    component: MonstersPage
  },
  {
    id: 'skills',
    label: 'Skills',
    marker: 'SK',
    description: 'Skill reference, effects, and progression.',
    component: SkillsPage
  },
  {
    id: 'bosses',
    label: 'Bosses',
    marker: 'BO',
    description: 'Boss encounters, mechanics, and rewards.',
    component: BossesPage
  },
  {
    id: 'quests',
    label: 'Quests',
    marker: 'QU',
    description: 'Quest objectives, locations, and rewards.',
    component: QuestsPage
  }
]

export const WikiPage = (): React.JSX.Element => {
  const [activeEntry, setActiveEntry] = useState<WikiEntry | null>(null)

  useEffect(() => {
    if (activeEntry === null) {
      return
    }

    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setActiveEntry(null)
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [activeEntry])

  const ActivePage = activeEntry?.component

  return (
    <PageLayout
      eyebrow="LogicSet reference"
      title="Wiki"
      description="Browse the informational sections without leaving the Wiki."
    >
      <section className="wiki-grid" aria-label="Wiki sections">
        {wikiEntries.map((entry) => (
          <button
            className="wiki-card"
            key={entry.id}
            type="button"
            onClick={() => setActiveEntry(entry)}
          >
            <span className="wiki-card-marker" aria-hidden="true">
              {entry.marker}
            </span>
            <span className="wiki-card-copy">
              <strong>{entry.label}</strong>
              <small>{entry.description}</small>
            </span>
          </button>
        ))}
      </section>

      {activeEntry && ActivePage && (
        <div
          className="overlay-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setActiveEntry(null)
            }
          }}
        >
          <section
            className="overlay-dialog overlay-dialog-wide wiki-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={activeEntry.label}
          >
            <button
              className="overlay-close overlay-close-floating"
              type="button"
              aria-label={`Close ${activeEntry.label}`}
              onClick={() => setActiveEntry(null)}
            >
              Close
            </button>
            <ActivePage />
          </section>
        </div>
      )}
    </PageLayout>
  )
}
