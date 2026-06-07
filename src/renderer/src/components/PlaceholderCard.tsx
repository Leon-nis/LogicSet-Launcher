interface PlaceholderCardProps {
  readonly title: string
  readonly description: string
  readonly status: string
}

export const PlaceholderCard = ({
  title,
  description,
  status
}: PlaceholderCardProps): React.JSX.Element => (
  <section className="placeholder-card">
    <div>
      <span className="card-status">{status}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
    <button type="button" disabled>
      Coming later
    </button>
  </section>
)
