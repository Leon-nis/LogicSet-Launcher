import type { NavigationPage } from '../../../shared/types'

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
  { id: 'environment', label: 'Environment', marker: 'EN' },
  { id: 'saves', label: 'Saves', marker: 'SV' },
  { id: 'skulls-eyes', label: 'Skulls & Eyes', marker: 'SE' },
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
          aria-current={activePage === item.id ? 'page' : undefined}
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
