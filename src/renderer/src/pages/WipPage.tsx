interface WipPageProps {
  readonly title: string
}

const WipPage = ({ title }: WipPageProps): React.JSX.Element => (
  <div className="page wip-page">
    <div className="wip-message" role="status">
      <span>{title}</span>
      <strong>WiP - Not available yet</strong>
    </div>
  </div>
)

export const MonstersPage = (): React.JSX.Element => (
  <WipPage title="Monsters" />
)

export const SkillsPage = (): React.JSX.Element => (
  <WipPage title="Skills" />
)

export const QuestsPage = (): React.JSX.Element => (
  <WipPage title="Quests" />
)
