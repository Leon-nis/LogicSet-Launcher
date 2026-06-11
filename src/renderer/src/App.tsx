import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { EnvironmentPage } from './pages/EnvironmentPage'
import { ModUpdatePage } from './pages/ModUpdatePage'
import { SavesPage } from './pages/SavesPage'
import { SkullsEyesPage } from './pages/SkullsEyesPage'
import type { NavigationPage } from '../../shared/types'

const pages: Record<NavigationPage, React.ComponentType> = {
  environment: EnvironmentPage,
  saves: SavesPage,
  'skulls-eyes': SkullsEyesPage,
  'mod-update': ModUpdatePage
}

export const App = (): React.JSX.Element => {
  const [activePage, setActivePage] =
    useState<NavigationPage>('environment')
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
