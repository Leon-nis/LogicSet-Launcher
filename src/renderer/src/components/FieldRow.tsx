import type { ChangeEventHandler, FocusEventHandler } from 'react'
import { StatusBadge } from './StatusBadge'

interface FieldRowProps {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly value: string
  readonly isValid: boolean
  readonly onChange: ChangeEventHandler<HTMLInputElement>
  readonly onBlur: FocusEventHandler<HTMLInputElement>
  readonly onBrowse: () => void
}

export const FieldRow = ({
  id,
  label,
  description,
  value,
  isValid,
  onChange,
  onBlur,
  onBrowse
}: FieldRowProps): React.JSX.Element => (
  <div className="field-row">
    <div className="field-row-heading">
      <div className="field-row-copy">
        <label htmlFor={id}>{label}</label>
        <p>{description}</p>
      </div>
      <StatusBadge isValid={isValid} />
    </div>
    <div className="field-row-controls">
      <input
        id={id}
        type="text"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        spellCheck={false}
      />
      <button className="secondary-button" type="button" onClick={onBrowse}>
        Browse
      </button>
    </div>
  </div>
)
