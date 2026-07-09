import type { NavigationPage } from '../../../shared/types'
import logicSetLogo from '../assets/generated/logicset.webp'

interface SidebarProps {
  readonly activePage: NavigationPage
  readonly onNavigate: (page: NavigationPage) => void
}

interface NavigationItem {
  readonly id: NavigationPage
  readonly label: string
  readonly marker: string
}

const navigationItems: readonly NavigationItem[] = [
  { id: 'home', label: 'Home', marker: 'HM' },
  { id: 'wiki', label: 'Wiki', marker: 'WK' },
  { id: 'patch-notes', label: 'Patch Notes', marker: 'PN' }
]

export const Sidebar = ({
  activePage,
  onNavigate
}: SidebarProps): React.JSX.Element => (
  <aside className="sidebar">
    <div className="brand">
      <div className="brand-mark">
        <img src={logicSetLogo} alt="" aria-hidden="true" />
      </div>
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
          aria-current={activePage === item.id ? 'page' : undefined}
          aria-label={item.label}
          key={item.id}
          type="button"
          onClick={() => onNavigate(item.id)}
        >
          <span className="navigation-marker" aria-hidden="true">
            {item.marker}
          </span>
          <span className="navigation-label">{item.label}</span>
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
