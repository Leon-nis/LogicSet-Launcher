import { useCallback, useEffect, useState } from 'react'
import type { SaveFile, SaveFileKind } from '../../../shared/types'
import { PageLayout } from '../components/PageLayout'

const kindLabels: Readonly<Record<SaveFileKind, string>> = {
  character: 'Character',
  shared_stash: 'Shared stash',
  unknown: 'Unknown'
}

export const SavesPage = (): React.JSX.Element => {
  const [saves, setSaves] = useState<readonly SaveFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpeningFolder, setIsOpeningFolder] = useState(false)
  const [isFolderAvailable, setIsFolderAvailable] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setMessage(null)
    setError(null)

    try {
      const result = await window.logicSet.saves.list()
      setSaves(result.saves)
      setIsFolderAvailable(result.success)

      if (!result.success) {
        setError(result.message ?? 'Could not load save files.')
      }
    } catch (loadError: unknown) {
      setSaves([])
      setIsFolderAvailable(false)
      setError(
        `Could not load save files. ${
          loadError instanceof Error
            ? loadError.message
            : String(loadError)
        }`
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const openFolder = async (): Promise<void> => {
    setIsOpeningFolder(true)
    setMessage(null)
    setError(null)

    try {
      const result = await window.logicSet.saves.openFolder()

      if (!result.success) {
        setError(result.message)
        return
      }

      setMessage(result.message)
    } catch (openError: unknown) {
      setError(
        `Could not open the saves folder. ${
          openError instanceof Error
            ? openError.message
            : String(openError)
        }`
      )
    } finally {
      setIsOpeningFolder(false)
    }
  }

  return (
    <PageLayout
      eyebrow="Characters"
      title="Saves"
      description="Review files found directly in the configured Torchlight II saves or modsave folder."
    >
      <section className="saves-panel" aria-busy={isLoading}>
        <div className="saves-toolbar">
          <div className="saves-toolbar-copy">
            <h2>Save files</h2>
            <p>
              Files are classified by name and extension only. Their contents
              are not read or modified.
            </p>
          </div>
          <div className="saves-toolbar-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={!isFolderAvailable || isOpeningFolder}
              onClick={() => void openFolder()}
            >
              {isOpeningFolder ? 'Opening...' : 'Open Saves Folder'}
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={isLoading}
              onClick={() => void refresh()}
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="saves-feedback" aria-live="polite">
          {message && <p className="form-message success">{message}</p>}
          {error && <p className="form-message error">{error}</p>}
        </div>

        {isLoading ? (
          <div className="saves-empty-state">
            <strong>Loading save files...</strong>
          </div>
        ) : saves.length === 0 && !error ? (
          <div className="saves-empty-state">
            <strong>No files found</strong>
            <p>The configured saves folder is valid but currently empty.</p>
          </div>
        ) : saves.length > 0 ? (
          <div className="saves-table-wrapper">
            <table className="saves-table">
              <thead>
                <tr>
                  <th scope="col">Type</th>
                  <th scope="col">File name</th>
                  <th scope="col">Size</th>
                  <th scope="col">Last modified</th>
                </tr>
              </thead>
              <tbody>
                {saves.map((save) => (
                  <tr key={save.fullPath}>
                    <td data-label="Type">
                      <span className="save-kind" data-kind={save.kind}>
                        {kindLabels[save.kind]}
                      </span>
                    </td>
                    <td
                      className="save-file-name"
                      data-label="File name"
                      title={save.fullPath}
                    >
                      {save.fileName}
                    </td>
                    <td data-label="Size">{formatBytes(save.sizeBytes)}</td>
                    <td data-label="Last modified">
                      {formatDate(save.modifiedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="saves-empty-state error">
            <strong>Saves unavailable</strong>
            <p>Check the configured saves/modsave path in Environment.</p>
          </div>
        )}
      </section>
    </PageLayout>
  )
}

const formatBytes = (sizeBytes: number): string => {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`
  }

  const units = ['KB', 'MB', 'GB']
  let value = sizeBytes / 1024
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]}`
}

const formatDate = (modifiedAt: string): string =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(modifiedAt))
