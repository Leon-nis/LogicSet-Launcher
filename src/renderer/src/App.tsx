import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { HomePage } from './pages/HomePage'
import { ModUpdatePage } from './pages/ModUpdatePage'
import { SetsPage } from './pages/SetsPage'
import { SkullsEyesPage } from './pages/SkullsEyesPage'
import {
  BossesPage,
  MonstersPage,
  QuestsPage,
  SkillsPage
} from './pages/WipPage'
import type { NavigationPage } from '../../shared/types'

const pages: Record<NavigationPage, React.ComponentType> = {
  home: HomePage,
  'skulls-eyes': SkullsEyesPage,
  sets: SetsPage,
  monsters: MonstersPage,
  bosses: BossesPage,
  skills: SkillsPage,
  quests: QuestsPage,
  'mod-update': ModUpdatePage
}

export const App = (): React.JSX.Element => {
  const [activePage, setActivePage] =
    useState<NavigationPage>('home')
  const ActivePage = pages[activePage]
  const navigate = (page: NavigationPage): void => {
    if (page === 'mod-update' && activePage !== page) {
      void window.logicSet.analytics.trackEvent('mod_update_tab_opened')
    }

    setActivePage(page)
  }

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onNavigate={navigate} />
      <main className="main-content">
        <ActivePage />
      </main>
    </div>
  )
}
