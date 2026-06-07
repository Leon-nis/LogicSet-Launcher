interface PageHeaderProps {
  readonly eyebrow: string
  readonly title: string
  readonly description: string
}

export const PageHeader = ({
  eyebrow,
  title,
  description
}: PageHeaderProps): React.JSX.Element => (
  <header className="page-header">
    <span className="eyebrow">{eyebrow}</span>
    <h1>{title}</h1>
    <p>{description}</p>
  </header>
)
