import { useCallback, useEffect, useState } from 'react'
import type {
  SaveFile,
  SaveFileKind,
  TrashListResult,
  TrashedSaveItem
} from '../../../shared/types'
import { PageLayout } from '../components/PageLayout'

const kindLabels: Readonly<Record<SaveFileKind, string>> = {
  character: 'Character',
  shared_stash: 'Shared stash',
  unknown: 'Unknown'
}

export const SavesPage = (): React.JSX.Element => {
  const supportsTrashApi =
    typeof window.logicSet.saves.listTrash === 'function' &&
    typeof window.logicSet.saves.moveToTrash === 'function' &&
    typeof window.logicSet.saves.restore === 'function'
  const [saves, setSaves] = useState<readonly SaveFile[]>([])
  const [trashItems, setTrashItems] =
    useState<readonly TrashedSaveItem[]>([])
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
      const [savesResult, trashResult] = await Promise.all([
        window.logicSet.saves.list(),
        supportsTrashApi
          ? window.logicSet.saves.listTrash()
          : Promise.resolve<TrashListResult>({
              success: true,
              items: []
            })
      ])
      setSaves(savesResult.saves)
      setTrashItems(trashResult.items)
      setIsFolderAvailable(savesResult.success)

      const errors = [
        savesResult.success
          ? null
          : (savesResult.message ?? 'Could not load save files.'),
        trashResult.success
          ? null
          : (trashResult.message ?? 'Could not load Launcher Trash.')
      ].filter((value): value is string => value !== null)

      if (errors.length > 0) {
        setError(errors.join(' '))
      } else if (!supportsTrashApi) {
        setMessage(
          'Restart the launcher to enable Launcher Trash actions.'
        )
      }
    } catch (loadError: unknown) {
      setSaves([])
      setTrashItems([])
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
      setError(formatActionError('Could not move the file to trash.', actionError))
    } finally {
      setActiveActionId(null)
    }
  }

  const restore = async (item: TrashedSaveItem): Promise<void> => {
    if (!supportsTrashApi) {
      setError('Restart the launcher to enable Launcher Trash actions.')
      return
    }

    setActiveActionId(item.trashId)
    setMessage(null)
    setError(null)

    try {
      const result = await window.logicSet.saves.restore({
        trashId: item.trashId
      })

      if (!result.success) {
        setError(result.message)
        return
      }

      await refresh()
      setMessage(result.message)
    } catch (actionError: unknown) {
      setError(formatActionError('Could not restore the file.', actionError))
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
                      data-label="File name"
                      title={save.fullPath}
                    >
                      {save.fileName}
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
                            ? 'Moving...'
                            : 'Move to Trash'}
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
            <p>Check the configured saves/modsave path in Environment.</p>
          </div>
        )}
      </section>

      <section className="saves-panel trash-panel">
        <div className="saves-toolbar">
          <div className="saves-toolbar-copy">
            <span className="eyebrow">Recoverable</span>
            <h2>Launcher Trash</h2>
            <p>
              Files remain here until restored. Permanent deletion is not
              available.
            </p>
          </div>
          <span className="trash-count">
            {trashItems.length} {trashItems.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {isLoading ? (
          <div className="saves-empty-state">
            <strong>Loading Launcher Trash...</strong>
          </div>
        ) : trashItems.length === 0 ? (
          <div className="saves-empty-state">
            <strong>Launcher Trash is empty</strong>
            <p>Character and shared stash files moved here will appear here.</p>
          </div>
        ) : (
          <div className="saves-table-wrapper">
            <table className="saves-table trash-table">
              <thead>
                <tr>
                  <th scope="col">Type</th>
                  <th scope="col">File name</th>
                  <th scope="col">Size</th>
                  <th scope="col">Trashed</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {trashItems.map((item) => (
                  <tr key={item.trashId}>
                    <td data-label="Type">
                      <span className="save-kind" data-kind={item.kind}>
                        {kindLabels[item.kind]}
                      </span>
                    </td>
                    <td
                      className="save-file-name"
                      data-label="File name"
                      title={item.originalPath}
                    >
                      {item.fileName}
                    </td>
                    <td data-label="Size">{formatBytes(item.sizeBytes)}</td>
                    <td data-label="Trashed">
                      {formatDate(item.trashedAt)}
                    </td>
                    <td data-label="Action">
                      <button
                        className="secondary-button compact-button"
                        type="button"
                        disabled={
                          !supportsTrashApi || activeActionId !== null
                        }
                        onClick={() => void restore(item)}
                      >
                        {activeActionId === item.trashId
                          ? 'Restoring...'
                          : 'Restore'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

const formatActionError = (message: string, error: unknown): string =>
  `${message} ${error instanceof Error ? error.message : String(error)}`
