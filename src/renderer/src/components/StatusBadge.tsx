interface StatusBadgeProps {
  readonly isValid: boolean
}

export const StatusBadge = ({
  isValid
}: StatusBadgeProps): React.JSX.Element => (
  <span className="status-badge" data-valid={isValid}>
    {isValid ? 'OK' : 'WARN'}
  </span>
)
