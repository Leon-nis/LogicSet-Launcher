import { PageLayout } from '../components/PageLayout'
import { BossesSection } from './BossesPage'

export const MonstersPage = (): React.JSX.Element => (
  <PageLayout
    eyebrow="LogicSet bestiary"
    title="Monsters"
    description="Enemy reference grouped by monster type. Boss data is available first while regular monster entries are prepared."
  >
    <BossesSection />
  </PageLayout>
)
