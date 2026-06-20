import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { HomePage } from './pages/HomePage'
import { PatchNotesPage } from './pages/PatchNotesPage'
import { WikiPage } from './pages/WikiPage'
import type { NavigationPage } from '../../shared/types'
import { DevModeProvider } from './contexts/DevModeContext'

const pages: Record<NavigationPage, React.ComponentType> = {
  home: HomePage,
  wiki: WikiPage,
  'patch-notes': PatchNotesPage
}

export const App = (): React.JSX.Element => {
  const [activePage, setActivePage] =
    useState<NavigationPage>('home')
  const ActivePage = pages[activePage]
  const navigate = (page: NavigationPage): void => {
    setActivePage(page)
  }

  return (
    <DevModeProvider>
      <div className="app-shell">
        <Sidebar activePage={activePage} onNavigate={navigate} />
        <main className="main-content">
          <ActivePage />
        </main>
      </div>
    </DevModeProvider>
  )
}
