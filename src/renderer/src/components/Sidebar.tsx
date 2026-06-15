import type { NavigationPage } from '../../../shared/types'

interface SidebarProps {
  readonly activePage: NavigationPage
  readonly onNavigate: (page: NavigationPage) => void
}

interface NavigationItem {
  readonly id: NavigationPage
  readonly label: string
  readonly marker: string
  readonly isLocked?: boolean
}

const navigationItems: readonly NavigationItem[] = [
  { id: 'home', label: 'Home', marker: 'HM' },
  { id: 'skulls-eyes', label: 'Items', marker: 'IT' },
  { id: 'sets', label: 'Sets', marker: 'ST' },
  { id: 'monsters', label: 'Monsters', marker: 'MO', isLocked: true },
  { id: 'bosses', label: 'Bosses', marker: 'BO', isLocked: true },
  { id: 'skills', label: 'Skills', marker: 'SK', isLocked: true },
  { id: 'quests', label: 'Quests', marker: 'QU', isLocked: true },
  { id: 'mod-update', label: 'Mod Update', marker: 'UP' }
]

export const Sidebar = ({
  activePage,
  onNavigate
}: SidebarProps): React.JSX.Element => (
  <aside className="sidebar">
    <div className="brand">
      <div className="brand-mark">LS</div>
      <div>
        <strong>LogicSet</strong>
        <span>Launcher</span>
      </div>
    </div>

    <nav className="navigation" aria-label="Main navigation">
      {navigationItems.map((item) => (
        <button
          className="navigation-item"
          data-active={activePage === item.id}
          data-locked={item.isLocked === true}
          aria-current={activePage === item.id ? 'page' : undefined}
          aria-label={
            item.isLocked ? `${item.label}, work in progress` : item.label
          }
          key={item.id}
          type="button"
          onClick={() => onNavigate(item.id)}
        >
          <span className="navigation-marker" aria-hidden="true">
            {item.marker}
          </span>
          <span className="navigation-label">{item.label}</span>
          {item.isLocked && (
            <span className="navigation-lock" aria-hidden="true">
              Locked
            </span>
          )}
        </button>
      ))}
    </nav>

    <div className="sidebar-footer">
      <span className="status-dot" aria-hidden="true" />
      Project foundation
      <small>v0.1.0</small>
    </div>
  </aside>
)
