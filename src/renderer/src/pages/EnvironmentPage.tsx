import { PageHeader } from '../components/PageHeader'
import { PlaceholderCard } from '../components/PlaceholderCard'

export const EnvironmentPage = (): React.JSX.Element => (
  <div className="page">
    <PageHeader
      eyebrow="Setup"
      title="Environment"
      description="Configure the local Torchlight II installation and the paths used by LogicSet."
    />

    <div className="card-grid">
      <PlaceholderCard
        title="Torchlight II"
        description="Game installation detection and path validation will be added in a future milestone."
        status="Not configured"
      />
      <PlaceholderCard
        title="LogicSet workspace"
        description="The launcher will keep mod and multiplayer environment locations together here."
        status="Planned"
      />
    </div>
  </div>
)
