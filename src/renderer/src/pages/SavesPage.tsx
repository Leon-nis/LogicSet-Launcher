import { PageLayout } from '../components/PageLayout'
import { PlaceholderCard } from '../components/PlaceholderCard'

export const SavesPage = (): React.JSX.Element => (
  <PageLayout
    eyebrow="Characters"
    title="Saves"
    description="Review and manage local Torchlight II saves used in modded multiplayer sessions."
  >
    <PlaceholderCard
      title="Save library"
      description="Save discovery, snapshots, rollback, and desync checks are outside this foundation milestone."
      status="No saves loaded"
    />
  </PageLayout>
)
