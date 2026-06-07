import type { ReactNode } from 'react'
import { PageHeader } from './PageHeader'

interface PageLayoutProps {
  readonly eyebrow: string
  readonly title: string
  readonly description: string
  readonly children: ReactNode
}

export const PageLayout = ({
  eyebrow,
  title,
  description,
  children
}: PageLayoutProps): React.JSX.Element => (
  <div className="page">
    <PageHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
    />
    <div className="page-body">{children}</div>
  </div>
)
