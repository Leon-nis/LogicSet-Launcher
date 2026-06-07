import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import type {
  GamePathKey,
  GamePaths,
  LocalSettings,
  PathDialogKind,
  PathValidation
} from '../../../shared/types'

interface PathField {
  readonly key: GamePathKey
  readonly label: string
  readonly description: string
  readonly dialogKind: PathDialogKind
}

const pathFields: readonly PathField[] = [
  {
    key: 'torchlightExecutablePath',
    label: 'Torchlight2.exe path',
    description: 'Select the Torchlight II executable manually.',
    dialogKind: 'torchlight-executable'
  },
  {
    key: 'savesDirectoryPath',
    label: 'Saves / modsave folder',
    description: 'Folder containing the modded character saves.',
    dialogKind: 'saves-directory'
  },
  {
    key: 'modsDirectoryPath',
    label: 'Mods folder',
    description: 'Folder where Torchlight II mods are installed.',
    dialogKind: 'mods-directory'
  },
  {
    key: 'localSettingsPath',
    label: 'local_settings.txt path',
    description: 'Torchlight II local multiplayer settings file.',
    dialogKind: 'local-settings'
  }
]

const emptyPaths: GamePaths = {
  torchlightExecutablePath: '',
  savesDirectoryPath: '',
  modsDirectoryPath: '',
  localSettingsPath: ''
}

const emptyValidation: PathValidation = {
  torchlightExecutablePath: false,
  savesDirectoryPath: false,
  modsDirectoryPath: false,
  localSettingsPath: false
}

export const EnvironmentPage = (): React.JSX.Element => {
  const [paths, setPaths] = useState<GamePaths>(emptyPaths)
  const [validation, setValidation] =
    useState<PathValidation>(emptyValidation)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshValidation = useCallback(async (nextPaths: GamePaths) => {
    const nextValidation =
      await window.logicSet.environment.validatePaths(nextPaths)
    setValidation(nextValidation)
  }, [])

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const settings = await window.logicSet.environment.loadConfig()
        setPaths(settings.gamePaths)
        await refreshValidation(settings.gamePaths)
      } catch {
        setError('Could not load the local environment configuration.')
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [refreshValidation])

  const updatePath = (key: GamePathKey, value: string): void => {
    setPaths((current) => ({ ...current, [key]: value }))
    setValidation((current) => ({ ...current, [key]: false }))
    setMessage(null)
  }

  const browse = async (field: PathField): Promise<void> => {
    setError(null)

    try {
      const selectedPath =
        await window.logicSet.environment.browsePath(field.dialogKind)

      if (selectedPath === null) {
        return
      }

      const nextPaths = { ...paths, [field.key]: selectedPath }
      setPaths(nextPaths)
      setMessage(null)
      await refreshValidation(nextPaths)
    } catch {
      setError(`Could not select the path for ${field.label}.`)
    }
  }

  const save = async (): Promise<void> => {
    setIsSaving(true)
    setMessage(null)
    setError(null)

    const settings: LocalSettings = {
      schemaVersion: 1,
      gamePaths: paths
    }

    try {
      const savedSettings =
        await window.logicSet.environment.saveConfig(settings)
      setPaths(savedSettings.gamePaths)
      await refreshValidation(savedSettings.gamePaths)
      setMessage('Environment configuration saved.')
    } catch {
      setError('Could not save the local environment configuration.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Setup"
        title="Environment"
        description="Configure the local Torchlight II installation and the paths used by LogicSet."
      />

      <section className="environment-panel" aria-busy={isLoading}>
        {isLoading ? (
          <p className="environment-loading">Loading configuration...</p>
        ) : (
          <>
            <div className="path-list">
              {pathFields.map((field) => (
                <div className="path-field" key={field.key}>
                  <div className="path-field-heading">
                    <div>
                      <label htmlFor={field.key}>{field.label}</label>
                      <p>{field.description}</p>
                    </div>
                    <span
                      className="path-status"
                      data-valid={validation[field.key]}
                    >
                      {validation[field.key] ? 'OK' : 'WARN'}
                    </span>
                  </div>
                  <div className="path-input-row">
                    <input
                      id={field.key}
                      type="text"
                      value={paths[field.key]}
                      onChange={(event) =>
                        updatePath(field.key, event.target.value)
                      }
                      onBlur={() => void refreshValidation(paths)}
                      spellCheck={false}
                    />
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => void browse(field)}
                    >
                      Browse
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="environment-actions">
              <div aria-live="polite">
                {message && <p className="form-message success">{message}</p>}
                {error && <p className="form-message error">{error}</p>}
              </div>
              <button
                className="primary-button"
                type="button"
                disabled={isSaving}
                onClick={() => void save()}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
