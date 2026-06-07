import { PageLayout } from '../components/PageLayout'
import { PlaceholderCard } from '../components/PlaceholderCard'

export const ModUpdatePage = (): React.JSX.Element => (
  <PageLayout
    eyebrow="LogicSet"
    title="Mod Update"
    description="Keep the local LogicSet installation aligned with the multiplayer group."
  >
    <PlaceholderCard
      title="Update channel"
      description="Version checks, downloads, and installation are intentionally not connected yet."
      status="Updater offline"
    />
  </PageLayout>
)
