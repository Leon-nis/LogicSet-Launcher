import { useCallback, useEffect, useState } from 'react'
import type {
  PatchNoteEntry,
  PatchNoteEntryInput
} from '../../../shared/types'
import { PageLayout } from '../components/PageLayout'
import { useDevMode } from '../contexts/DevModeContext'

export const PatchNotesPage = (): React.JSX.Element => {
  const isDevMode = useDevMode()
  const [entries, setEntries] = useState<readonly PatchNoteEntry[]>([])
  const [activeEntry, setActiveEntry] = useState<PatchNoteEntry | null>(null)
  const [draftVersion, setDraftVersion] = useState('')
  const [draftImagePath, setDraftImagePath] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadEntries = useCallback(async (): Promise<void> => {
    setIsBusy(true)
    setError(null)

    try {
      setEntries(await window.logicSet.patchNotes.get())
    } catch (loadError: unknown) {
      setError(formatError('Could not load patch notes.', loadError))
    } finally {
      setIsBusy(false)
    }
  }, [])

  useEffect(() => {
    void loadEntries()
  }, [loadEntries])

  useEffect(() => {
    if (activeEntry === null) {
      return
    }

    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setActiveEntry(null)
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [activeEntry])

  const browseImage = async (): Promise<string | null> => {
    try {
      return await window.logicSet.patchNotes.browseImage()
    } catch (browseError: unknown) {
      setError(formatError('Could not select the image.', browseError))
      return null
    }
  }

  const saveEntries = async (
    nextEntries: readonly PatchNoteEntryInput[],
    successMessage: string
  ): Promise<boolean> => {
    setIsBusy(true)
    setMessage(null)
    setError(null)

    try {
      setEntries(await window.logicSet.patchNotes.save(nextEntries))
      setMessage(successMessage)
      return true
    } catch (saveError: unknown) {
      setError(formatError('Could not save patch notes.', saveError))
      return false
    } finally {
      setIsBusy(false)
    }
  }

  const addEntry = async (): Promise<void> => {
    if (draftVersion.trim() === '' || draftImagePath.trim() === '') {
      setMessage(null)
      setError('Enter a patch version and select an image.')
      return
    }

    const wasSaved = await saveEntries(
      [
        {
          id: `patch-${Date.now()}`,
          version: draftVersion.trim(),
          imagePath: draftImagePath
        },
        ...toInputs(entries)
      ],
      `Patch ${draftVersion.trim()} added.`
    )
    if (wasSaved) {
      setDraftVersion('')
      setDraftImagePath('')
    }
  }

  const replaceImage = async (entry: PatchNoteEntry): Promise<void> => {
    const imagePath = await browseImage()
    if (imagePath === null) {
      return
    }

    const wasSaved = await saveEntries(
      toInputs(entries).map((current) =>
        current.id === entry.id ? { ...current, imagePath } : current
      ),
      `Patch ${entry.version} image updated.`
    )
    if (wasSaved) {
      setActiveEntry(null)
    }
  }

  const removeEntry = async (entry: PatchNoteEntry): Promise<void> => {
    if (!window.confirm(`Remove patch ${entry.version}?`)) {
      return
    }

    const wasSaved = await saveEntries(
      toInputs(entries).filter((current) => current.id !== entry.id),
      `Patch ${entry.version} removed.`
    )
    if (wasSaved && activeEntry?.id === entry.id) {
      setActiveEntry(null)
    }
  }

  return (
    <PageLayout
      eyebrow="Release history"
      title="Patch Notes"
      description="Open the published image for each LogicSet release."
    >
      {isDevMode && (
        <section className="patch-notes-editor">
          <div>
            <span className="eyebrow">Dev Mode</span>
            <h2>Add patch note</h2>
            <p>The card stays linked to the selected desktop image.</p>
          </div>
          <div className="patch-notes-editor-fields">
            <label>
              <span>Patch version</span>
              <input
                type="text"
                value={draftVersion}
                disabled={isBusy}
                placeholder="x.x.x"
                onChange={(event) => setDraftVersion(event.target.value)}
              />
            </label>
            <label>
              <span>Image</span>
              <div className="patch-image-picker">
                <input
                  type="text"
                  value={draftImagePath}
                  readOnly
                  placeholder="Select a JPEG, PNG, or WebP"
                />
                <button
                  className="secondary-button"
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    void browseImage().then((imagePath) => {
                      if (imagePath !== null) {
                        setDraftImagePath(imagePath)
                      }
                    })
                  }}
                >
                  Browse
                </button>
              </div>
            </label>
            <button
              className="primary-button"
              type="button"
              disabled={isBusy}
              onClick={() => void addEntry()}
            >
              Add card
            </button>
          </div>
        </section>
      )}

      <div className="patch-notes-feedback" aria-live="polite">
        {isBusy && <p className="form-message">Loading patch notes...</p>}
        {message && <p className="form-message success">{message}</p>}
        {error && <p className="form-message error">{error}</p>}
      </div>

      <section className="patch-notes-grid" aria-label="Patch notes">
        {!isBusy && entries.length === 0 && (
          <div className="patch-notes-empty">
            <strong>No patch notes yet.</strong>
            <p>Enable Dev Mode to link the first release image.</p>
          </div>
        )}
        {entries.map((entry) => (
          <article className="patch-note-card" key={entry.id}>
            <button
              className="patch-note-preview"
              type="button"
              disabled={entry.imageDataUrl === null}
              onClick={() => setActiveEntry(entry)}
            >
              {entry.imageDataUrl ? (
                <img
                  src={entry.imageDataUrl}
                  alt={`Patch ${entry.version} notes`}
                />
              ) : (
                <span>Image not found</span>
              )}
            </button>
            <div className="patch-note-card-footer">
              <div>
                <span className="eyebrow">Patch</span>
                <h2>{entry.version}</h2>
              </div>
              {isDevMode && (
                <div className="patch-note-dev-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={isBusy}
                    onClick={() => void replaceImage(entry)}
                  >
                    Replace image
                  </button>
                  <button
                    className="patch-note-remove"
                    type="button"
                    disabled={isBusy}
                    onClick={() => void removeEntry(entry)}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
      </section>

      {activeEntry?.imageDataUrl && (
        <div
          className="overlay-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setActiveEntry(null)
            }
          }}
        >
          <section
            className="overlay-dialog overlay-dialog-wide patch-note-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`Patch ${activeEntry.version}`}
          >
            <button
              className="overlay-close overlay-close-floating"
              type="button"
              aria-label="Close patch notes"
              onClick={() => setActiveEntry(null)}
            >
              Close
            </button>
            <img
              src={activeEntry.imageDataUrl}
              alt={`Patch ${activeEntry.version} notes`}
            />
          </section>
        </div>
      )}
    </PageLayout>
  )
}

const toInputs = (
  entries: readonly PatchNoteEntry[]
): readonly PatchNoteEntryInput[] =>
  entries.map(({ id, version, imagePath }) => ({
    id,
    version,
    imagePath
  }))

const formatError = (message: string, error: unknown): string =>
  `${message} ${error instanceof Error ? error.message : String(error)}`
