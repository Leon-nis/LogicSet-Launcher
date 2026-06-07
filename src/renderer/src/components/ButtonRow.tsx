import type { ReactNode } from 'react'

interface ButtonRowProps {
  readonly feedback?: ReactNode
  readonly children: ReactNode
}

export const ButtonRow = ({
  feedback,
  children
}: ButtonRowProps): React.JSX.Element => (
  <div className="button-row">
    <div className="button-row-feedback" aria-live="polite">
      {feedback}
    </div>
    <div className="button-row-actions">{children}</div>
  </div>
)
