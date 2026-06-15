import { useCallback, useEffect, useState } from 'react'
import type { SaveFile, SaveFileKind } from '../../../shared/types'
import { PageLayout } from '../components/PageLayout'

const kindLabels: Readonly<Record<SaveFileKind, string>> = {
  character: 'Character',
  shared_stash: 'Shared stash',
  unknown: 'Unknown'
}

export const SavesPage = (): React.JSX.Element => {
  const supportsTrashApi =
    typeof window.logicSet.saves.moveToTrash === 'function'
  const [saves, setSaves] = useState<readonly SaveFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpeningFolder, setIsOpeningFolder] = useState(false)
  const [activeActionId, setActiveActionId] = useState<string | null>(null)
  const [isFolderAvailable, setIsFolderAvailable] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setMessage(null)
    setError(null)

    try {
      const savesResult = await window.logicSet.saves.list()
      setSaves(savesResult.saves)
      setIsFolderAvailable(savesResult.success)

      if (!savesResult.success) {
        setError(savesResult.message ?? 'Could not load save files.')
      } else if (!supportsTrashApi) {
        setMessage(
          'Restart the launcher to enable Launcher Trash actions.'
        )
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
  }, [supportsTrashApi])

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

  const moveToTrash = async (save: SaveFile): Promise<void> => {
    if (!supportsTrashApi) {
      setError('Restart the launcher to enable Launcher Trash actions.')
      return
    }

    setActiveActionId(save.fullPath)
    setMessage(null)
    setError(null)

    try {
      const result = await window.logicSet.saves.moveToTrash({
        fullPath: save.fullPath
      })

      if (!result.success) {
        setError(result.message)
        return
      }

      await refresh()
      setMessage(result.message)
    } catch (actionError: unknown) {
      setError(formatActionError('Could not delete the file.', actionError))
    } finally {
      setActiveActionId(null)
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
            <strong>No saves found</strong>
            <p>No characters or shared stash were found in this folder.</p>
          </div>
        ) : saves.length > 0 ? (
          <div className="saves-table-wrapper">
            <table className="saves-table">
              <thead>
                <tr>
                  <th scope="col">Type</th>
                  <th scope="col">Name</th>
                  <th scope="col">Size</th>
                  <th scope="col">Last modified</th>
                  <th scope="col">Action</th>
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
                      data-label="Name"
                      title={save.fullPath}
                    >
                      {getSaveName(save)}
                    </td>
                    <td data-label="Size">{formatBytes(save.sizeBytes)}</td>
                    <td data-label="Last modified">
                      {formatDate(save.modifiedAt)}
                    </td>
                    <td data-label="Action">
                      {save.kind === 'character' ||
                      save.kind === 'shared_stash' ? (
                        <button
                          className="danger-button compact-button"
                          type="button"
                          disabled={
                            !supportsTrashApi || activeActionId !== null
                          }
                          onClick={() => void moveToTrash(save)}
                        >
                          {activeActionId === save.fullPath
                            ? 'Deleting...'
                            : 'Delete'}
                        </button>
                      ) : (
                        <span className="action-unavailable">Not available</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="saves-empty-state error">
            <strong>Saves unavailable</strong>
            <p>Check the configured saves/modsave path in Paths.</p>
          </div>
        )}
      </section>
    </PageLayout>
  )
}

const getSaveName = (save: SaveFile): string => {
  if (save.kind === 'shared_stash') {
    return 'Baú'
  }

  const extensionIndex = save.fileName.lastIndexOf('.')
  const fileNameWithoutExtension =
    extensionIndex > 0
      ? save.fileName.slice(0, extensionIndex)
      : save.fileName

  return fileNameWithoutExtension.split('_', 1)[0] ?? fileNameWithoutExtension
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

const formatActionError = (message: string, error: unknown): string =>
  `${message} ${error instanceof Error ? error.message : String(error)}`
