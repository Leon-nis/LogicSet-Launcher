import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { EnvironmentPage } from './pages/EnvironmentPage'
import { ModUpdatePage } from './pages/ModUpdatePage'
import { SavesPage } from './pages/SavesPage'
import type { NavigationPage } from '../../shared/types'

const pages: Record<NavigationPage, React.ComponentType> = {
  environment: EnvironmentPage,
  saves: SavesPage,
  'mod-update': ModUpdatePage
}

export const App = (): React.JSX.Element => {
  const [activePage, setActivePage] =
    useState<NavigationPage>('environment')
  const ActivePage = pages[activePage]

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="main-content">
        <ActivePage />
      </main>
    </div>
  )
}
