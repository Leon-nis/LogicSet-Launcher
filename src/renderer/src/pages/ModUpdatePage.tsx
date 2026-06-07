import { PageHeader } from '../components/PageHeader'
import { PlaceholderCard } from '../components/PlaceholderCard'

export const ModUpdatePage = (): React.JSX.Element => (
  <div className="page">
    <PageHeader
      eyebrow="LogicSet"
      title="Mod Update"
      description="Keep the local LogicSet installation aligned with the multiplayer group."
    />

    <PlaceholderCard
      title="Update channel"
      description="Version checks, downloads, and installation are intentionally not connected yet."
      status="Updater offline"
    />
  </div>
)
