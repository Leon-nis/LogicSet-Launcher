import { useCallback, useEffect, useState } from 'react'
import { ButtonRow } from '../components/ButtonRow'
import { FieldRow } from '../components/FieldRow'
import { ModUpdatePanel } from '../components/ModUpdatePanel'
import { PageLayout } from '../components/PageLayout'
import { SavesPage } from './SavesPage'
import type {
  GamePathKey,
  GamePaths,
  LocalSettings,
  ModUpdateSettings,
  PathDialogKind,
  PathValidation
} from '../../../shared/types'
import { DEFAULT_LOGICSET_MANIFEST_URL } from '../../../shared/types'

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

type HomeOverlay = 'paths' | 'saves' | null

export const HomePage = (): React.JSX.Element => {
  const [activeOverlay, setActiveOverlay] = useState<HomeOverlay>(null)
  const [paths, setPaths] = useState<GamePaths>(emptyPaths)
  const [validation, setValidation] =
    useState<PathValidation>(emptyValidation)
  const [modUpdateSettings, setModUpdateSettings] =
    useState<ModUpdateSettings>({
      manifestUrl: DEFAULT_LOGICSET_MANIFEST_URL,
      installedVersion: null
    })
  const [analyticsSettings, setAnalyticsSettings] =
    useState<LocalSettings['analytics'] | null>(null)
  const [isSavedExecutableValid, setIsSavedExecutableValid] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isLaunching, setIsLaunching] = useState(false)
  const [launchMessage, setLaunchMessage] = useState<string | null>(null)
  const [launchError, setLaunchError] = useState<string | null>(null)
  const [udpPort, setUdpPort] = useState('')
  const [isUdpPortLoading, setIsUdpPortLoading] = useState(false)
  const [isUdpPortApplying, setIsUdpPortApplying] = useState(false)
  const [udpPortMessage, setUdpPortMessage] = useState<string | null>(null)
  const [udpPortError, setUdpPortError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshValidation = useCallback(async (nextPaths: GamePaths) => {
    const nextValidation =
      await window.logicSet.environment.validatePaths(nextPaths)
    setValidation(nextValidation)
    return nextValidation
  }, [])

  const loadUdpPort = useCallback(async (localSettingsPath: string) => {
    setIsUdpPortLoading(true)
    setUdpPortMessage(null)
    setUdpPortError(null)

    try {
      const result =
        await window.logicSet.environment.readUdpPort(localSettingsPath)

      if (result.status === 'error') {
        setUdpPort('')
        setUdpPortError(result.message)
        return
      }

      setUdpPort(result.port?.toString() ?? '')
      setUdpPortMessage(
        result.port === null
          ? 'UDPORT is not present. Applying a port will add it to the file.'
          : `Current file value: ${result.port}.`
      )
    } catch {
      setUdpPort('')
      setUdpPortError('Could not read the UDP port.')
    } finally {
      setIsUdpPortLoading(false)
    }
  }, [])

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const settings = await window.logicSet.environment.loadConfig()
        setPaths(settings.gamePaths)
        setModUpdateSettings(settings.modUpdate)
        setAnalyticsSettings(settings.analytics)
        const [loadedValidation] = await Promise.all([
          refreshValidation(settings.gamePaths),
          loadUdpPort(settings.gamePaths.localSettingsPath)
        ])
        setIsSavedExecutableValid(
          loadedValidation.torchlightExecutablePath
        )
      } catch {
        setError('Could not load the local environment configuration.')
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [loadUdpPort, refreshValidation])

  useEffect(() => {
    if (activeOverlay === null) {
      return
    }

    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setActiveOverlay(null)
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [activeOverlay])

  const updatePath = (key: GamePathKey, value: string): void => {
    setPaths((current) => ({ ...current, [key]: value }))
    setValidation((current) => ({ ...current, [key]: false }))
    setMessage(null)

    if (key === 'localSettingsPath') {
      setUdpPort('')
      setUdpPortMessage(null)
      setUdpPortError(null)
    }
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

      if (field.key === 'localSettingsPath') {
        await loadUdpPort(selectedPath)
      }
    } catch {
      setError(`Could not select the path for ${field.label}.`)
    }
  }

  const handlePathBlur = async (field: PathField): Promise<void> => {
    await refreshValidation(paths)

    if (field.key === 'localSettingsPath') {
      await loadUdpPort(paths.localSettingsPath)
    }
  }

  const save = async (): Promise<void> => {
    setIsSaving(true)
    setMessage(null)
    setError(null)

    if (analyticsSettings === null) {
      setError('Could not save before configuration finished loading.')
      setIsSaving(false)
      return
    }

    const settings: LocalSettings = {
      schemaVersion: 1,
      gamePaths: paths,
      modUpdate: modUpdateSettings,
      analytics: analyticsSettings
    }

    try {
      const savedSettings =
        await window.logicSet.environment.saveConfig(settings)
      setPaths(savedSettings.gamePaths)
      setModUpdateSettings(savedSettings.modUpdate)
      setAnalyticsSettings(savedSettings.analytics)
      const savedValidation =
        await refreshValidation(savedSettings.gamePaths)
      setIsSavedExecutableValid(
        savedValidation.torchlightExecutablePath
      )
      setMessage('Path configuration saved.')
    } catch {
      setError('Could not save the path configuration.')
    } finally {
      setIsSaving(false)
    }
  }

  const launchGame = async (): Promise<void> => {
    setIsLaunching(true)
    setLaunchMessage(null)
    setLaunchError(null)

    try {
      const result = await window.logicSet.environment.launchGame()

      if (!result.success) {
        const debugDetails = [result.errorCode, result.errorMessage]
          .filter(Boolean)
          .join(' - ')
        setLaunchError(
          debugDetails === ''
            ? result.message
            : `${result.message} ${debugDetails}`
        )
        return
      }

      setLaunchMessage(result.message)
    } catch (error: unknown) {
      setLaunchError(
        `Could not launch Torchlight II. ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    } finally {
      setIsLaunching(false)
    }
  }

  const applyUdpPort = async (): Promise<void> => {
    const parsedPort = Number(udpPort)

    if (
      udpPort.trim() === '' ||
      !Number.isInteger(parsedPort) ||
      parsedPort < 1024 ||
      parsedPort > 65535
    ) {
      setUdpPortMessage(null)
      setUdpPortError('UDP port must be between 1024 and 65535.')
      return
    }

    setIsUdpPortApplying(true)
    setUdpPortMessage(null)
    setUdpPortError(null)

    try {
      const result = await window.logicSet.environment.applyUdpPort({
        localSettingsPath: paths.localSettingsPath,
        port: parsedPort
      })

      if (result.status === 'error') {
        setUdpPortError(result.message)
        return
      }

      setUdpPort(result.port.toString())
      setUdpPortMessage(
        `UDP port ${result.port} applied. Backup: ${result.backupPath}`
      )
    } catch {
      setUdpPortError('Could not apply the UDP port.')
    } finally {
      setIsUdpPortApplying(false)
    }
  }

  return (
    <PageLayout
      eyebrow="Launcher"
      title="Home"
      description="Launch Torchlight II and manage the local LogicSet configuration."
    >
      {!isLoading && (
        <section className="game-launch-panel">
          <div className="game-launch-copy">
            <span className="eyebrow">Ready to play</span>
            <h2>Launch Torchlight II</h2>
            <p>
              Starts the game using the saved executable path. Save path
              changes before launching.
            </p>
            <div className="game-launch-feedback" aria-live="polite">
              {isLaunching && (
                <p className="form-message">Launching Torchlight II...</p>
              )}
              {launchMessage && (
                <p className="form-message success">{launchMessage}</p>
              )}
              {launchError && (
                <p className="form-message error">{launchError}</p>
              )}
            </div>
          </div>
          <button
            className="play-button"
            type="button"
            disabled={!isSavedExecutableValid || isLaunching}
            onClick={() => void launchGame()}
          >
            {isLaunching ? 'Launching...' : 'Play Torchlight II'}
          </button>
        </section>
      )}

      <section className="home-shortcuts" aria-label="Quick actions">
        <button
          className="home-shortcut"
          type="button"
          onClick={() => setActiveOverlay('saves')}
        >
          <span className="home-shortcut-icon" aria-hidden="true">
            SV
          </span>
          <span>
            <strong>Saves</strong>
            <small>Manage characters and shared stash</small>
          </span>
        </button>
        <button
          className="home-shortcut"
          type="button"
          onClick={() => setActiveOverlay('paths')}
        >
          <span className="home-shortcut-icon" aria-hidden="true">
            PA
          </span>
          <span>
            <strong>Paths</strong>
            <small>Configure game files and folders</small>
          </span>
        </button>
      </section>

      {!isLoading && <ModUpdatePanel />}

      {!isLoading && (
        <section className="udp-port-panel">
          <div className="udp-port-copy">
            <span className="eyebrow">Local multiplayer</span>
            <h2>UDP port</h2>
            <p>
              Read and update <code>UDPORT</code> in the configured{' '}
              <code>local_settings.txt</code>. Torchlight II must be closed.
            </p>
          </div>

          <div className="udp-port-controls">
            <label htmlFor="udpPort">Port</label>
            <div className="udp-port-input-row">
              <input
                id="udpPort"
                type="number"
                min="1024"
                max="65535"
                step="1"
                value={udpPort}
                disabled={isUdpPortLoading || isUdpPortApplying}
                onChange={(event) => {
                  setUdpPort(event.target.value)
                  setUdpPortMessage(null)
                  setUdpPortError(null)
                }}
              />
              <button
                className="primary-button"
                type="button"
                disabled={isUdpPortLoading || isUdpPortApplying}
                onClick={() => void applyUdpPort()}
              >
                {isUdpPortApplying ? 'Applying...' : 'Apply port'}
              </button>
            </div>
            <div className="udp-port-feedback" aria-live="polite">
              {isUdpPortLoading && (
                <p className="form-message">Reading current port...</p>
              )}
              {udpPortMessage && (
                <p className="form-message success">{udpPortMessage}</p>
              )}
              {udpPortError && (
                <p className="form-message error">{udpPortError}</p>
              )}
            </div>
          </div>
        </section>
      )}

      {activeOverlay === 'paths' && (
        <div
          className="overlay-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setActiveOverlay(null)
            }
          }}
        >
          <section
            className="overlay-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="paths-dialog-title"
          >
            <header className="overlay-header">
              <div>
                <span className="eyebrow">Configuration</span>
                <h2 id="paths-dialog-title">Paths</h2>
                <p>Configure the local Torchlight II files and folders.</p>
              </div>
              <button
                className="overlay-close"
                type="button"
                aria-label="Close paths"
                onClick={() => setActiveOverlay(null)}
              >
                Close
              </button>
            </header>
            <div className="environment-panel" aria-busy={isLoading}>
              {isLoading ? (
                <p className="environment-loading">
                  Loading configuration...
                </p>
              ) : (
                <>
                  <div className="field-list">
                    {pathFields.map((field) => (
                      <FieldRow
                        key={field.key}
                        id={field.key}
                        label={field.label}
                        description={field.description}
                        value={paths[field.key]}
                        isValid={validation[field.key]}
                        onChange={(event) =>
                          updatePath(field.key, event.target.value)
                        }
                        onBlur={() => void handlePathBlur(field)}
                        onBrowse={() => void browse(field)}
                      />
                    ))}
                  </div>
                  <ButtonRow
                    feedback={
                      <>
                        {message && (
                          <p className="form-message success">{message}</p>
                        )}
                        {error && (
                          <p className="form-message error">{error}</p>
                        )}
                      </>
                    }
                  >
                    <button
                      className="primary-button"
                      type="button"
                      disabled={isSaving}
                      onClick={() => void save()}
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </ButtonRow>
                </>
              )}
            </div>
          </section>
        </div>
      )}

      {activeOverlay === 'saves' && (
        <div
          className="overlay-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setActiveOverlay(null)
            }
          }}
        >
          <section
            className="overlay-dialog overlay-dialog-wide"
            role="dialog"
            aria-modal="true"
            aria-label="Saves"
          >
            <button
              className="overlay-close overlay-close-floating"
              type="button"
              aria-label="Close saves"
              onClick={() => setActiveOverlay(null)}
            >
              Close
            </button>
            <SavesPage />
          </section>
        </div>
      )}
    </PageLayout>
  )
}
