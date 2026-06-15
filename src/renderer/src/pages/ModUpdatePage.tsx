import { useCallback, useEffect, useState } from 'react'
import type {
  ModpackManifest,
  ModUpdateInfo
} from '../../../shared/types'
import { DEFAULT_LOGICSET_MANIFEST_URL } from '../../../shared/types'
import { PageLayout } from '../components/PageLayout'

const emptyInfo: ModUpdateInfo = {
  manifestUrl: DEFAULT_LOGICSET_MANIFEST_URL,
  installedVersion: null,
  manifest: null,
  installationStatus: 'unknown'
}

type UpdateOperation = 'saving' | 'checking' | 'installing' | null

export const ModUpdatePage = (): React.JSX.Element => {
  const supportsModUpdateApi =
    typeof window.logicSet.modUpdate?.getInfo === 'function' &&
    typeof window.logicSet.modUpdate?.saveManifestUrl === 'function' &&
    typeof window.logicSet.modUpdate?.check === 'function' &&
    typeof window.logicSet.modUpdate?.install === 'function'
  const [manifestUrl, setManifestUrl] = useState(
    DEFAULT_LOGICSET_MANIFEST_URL
  )
  const [info, setInfo] = useState<ModUpdateInfo>(emptyInfo)
  const [operation, setOperation] = useState<UpdateOperation>(null)
  const [isDevMode, setIsDevMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadInfo = useCallback(async (): Promise<void> => {
    if (!supportsModUpdateApi) {
      setError('Restart the launcher to enable Mod Update.')
      setIsLoading(false)
      return
    }

    try {
      const loadedInfo = await window.logicSet.modUpdate.getInfo()
      setInfo(loadedInfo)
      setManifestUrl(loadedInfo.manifestUrl)
    } catch (loadError: unknown) {
      setError(formatError('Could not load Mod Update settings.', loadError))
    } finally {
      setIsLoading(false)
    }
  }, [supportsModUpdateApi])

  useEffect(() => {
    void loadInfo()
  }, [loadInfo])

  const saveManifestUrl = async (): Promise<void> => {
    setOperation('saving')
    setMessage(null)
    setError(null)

    try {
      const result = await window.logicSet.modUpdate.saveManifestUrl({
        manifestUrl
      })
      setInfo(result.info)
      setManifestUrl(result.info.manifestUrl)
      result.success ? setMessage(result.message) : setError(result.message)
    } catch (saveError: unknown) {
      setError(formatError('Could not save the manifest URL.', saveError))
    } finally {
      setOperation(null)
    }
  }

  const resetManifestUrl = async (): Promise<void> => {
    setManifestUrl(DEFAULT_LOGICSET_MANIFEST_URL)
    setOperation('saving')
    setMessage(null)
    setError(null)

    try {
      const result = await window.logicSet.modUpdate.saveManifestUrl({
        manifestUrl: DEFAULT_LOGICSET_MANIFEST_URL
      })
      setInfo(result.info)
      setManifestUrl(result.info.manifestUrl)
      result.success
        ? setMessage('Manifest URL reset to the LogicSet stable default.')
        : setError(result.message)
    } catch (resetError: unknown) {
      setError(
        formatError('Could not reset the manifest URL.', resetError)
      )
    } finally {
      setOperation(null)
    }
  }

  const checkUpdate = async (): Promise<void> => {
    setOperation('checking')
    setMessage(null)
    setError(null)

    try {
      const result = await window.logicSet.modUpdate.check()
      setInfo(result.info)
      setManifestUrl(result.info.manifestUrl)
      result.success ? setMessage(result.message) : setError(result.message)
    } catch (checkError: unknown) {
      setError(formatError('Could not check for updates.', checkError))
    } finally {
      setOperation(null)
    }
  }

  const installUpdate = async (): Promise<void> => {
    setOperation('installing')
    setMessage(null)
    setError(null)

    try {
      const result = await window.logicSet.modUpdate.install()
      setInfo(result.info)
      result.success ? setMessage(result.message) : setError(result.message)
    } catch (installError: unknown) {
      setError(formatError('Could not install the modpack.', installError))
    } finally {
      setOperation(null)
    }
  }

  const isBusy = operation !== null
  const canInstall =
    info.manifest !== null &&
    info.installationStatus !== 'up-to-date'

  return (
    <PageLayout
      eyebrow="LogicSet"
      title="Mod Update"
      description="Check the stable LogicSet manifest and install a verified modpack into the configured mods folder."
    >
      <section className="mod-update-panel" aria-busy={isLoading || isBusy}>
        {!isDevMode && (
          <div
            className="mod-player-compact"
            data-status={info.installationStatus}
          >
            <span className="mod-status-indicator" aria-hidden="true" />
            <div
              className="mod-player-compact-copy"
              aria-live="polite"
            >
              <span className="eyebrow">LogicSet mod</span>
              <h2>{formatInstallationStatus(info.installationStatus)}</h2>
              <p>
                {getCompactStatusDescription(
                  info,
                  operation,
                  message,
                  error
                )}
              </p>
            </div>
            <div className="mod-player-compact-actions">
              <button
                className="secondary-button"
                type="button"
                disabled={isLoading || isBusy || !supportsModUpdateApi}
                onClick={() => void checkUpdate()}
              >
                {operation === 'checking' ? 'Checking...' : 'Check'}
              </button>
              {canInstall && (
                <button
                  className="primary-button"
                  type="button"
                  disabled={isBusy || !supportsModUpdateApi}
                  onClick={() => void installUpdate()}
                >
                  {operation === 'installing' ? 'Updating...' : 'Update'}
                </button>
              )}
              <label className="dev-mode-toggle mod-update-dev-toggle">
                <input
                  type="checkbox"
                  checked={isDevMode}
                  disabled={isLoading || isBusy}
                  onChange={(event) => {
                    setIsDevMode(event.target.checked)
                    setMessage(null)
                    setError(null)
                  }}
                />
                <span>Dev Mode</span>
              </label>
            </div>
          </div>
        )}

        {isDevMode && (
          <>
            <div className="mod-update-toolbar">
              <div>
                <h2>LogicSet status</h2>
                <p>Advanced updater and manifest settings.</p>
              </div>
              <label className="dev-mode-toggle">
                <input
                  type="checkbox"
                  checked={isDevMode}
                  disabled={isLoading || isBusy}
                  onChange={(event) => {
                    setIsDevMode(event.target.checked)
                    setMessage(null)
                    setError(null)
                  }}
                />
                <span>Dev Mode</span>
              </label>
            </div>
            <div className="manifest-settings">
              <div className="manifest-settings-copy">
                <h2>Remote manifest</h2>
                <p>
                  The launcher only checks this URL when requested. Updates
                  are never installed automatically.
                </p>
              </div>
              <label htmlFor="manifestUrl">Manifest URL</label>
              <div className="manifest-url-row">
                <input
                  id="manifestUrl"
                  type="url"
                  value={manifestUrl}
                  disabled={
                    isLoading || isBusy || !supportsModUpdateApi
                  }
                  placeholder={DEFAULT_LOGICSET_MANIFEST_URL}
                  spellCheck={false}
                  onChange={(event) => {
                    setManifestUrl(event.target.value)
                    setMessage(null)
                    setError(null)
                  }}
                />
                <button
                  className="secondary-button"
                  type="button"
                  disabled={
                    isLoading || isBusy || !supportsModUpdateApi
                  }
                  onClick={() => void resetManifestUrl()}
                >
                  Reset to default
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={
                    isLoading || isBusy || !supportsModUpdateApi
                  }
                  onClick={() => void saveManifestUrl()}
                >
                  {operation === 'saving'
                    ? 'Saving...'
                    : 'Save Manifest URL'}
                </button>
                <button
                  className="primary-button"
                  type="button"
                  disabled={
                    isLoading || isBusy || !supportsModUpdateApi
                  }
                  onClick={() => void checkUpdate()}
                >
                  {operation === 'checking'
                    ? 'Checking...'
                    : 'Check Update'}
                </button>
              </div>
            </div>

            <div className="mod-version-grid">
              <VersionCard
                label="Installed version"
                value={info.installedVersion ?? 'Not installed'}
              />
              <VersionCard
                label="Remote version"
                value={info.manifest?.version ?? 'Not checked'}
              />
              <VersionCard
                label="Channel"
                value={info.manifest?.channel ?? 'Unknown'}
              />
            </div>

            <ManifestDetails manifest={info.manifest} />

            <div className="mod-update-actions">
              <div className="mod-update-feedback" aria-live="polite">
                {isLoading && (
                  <p className="form-message">
                    Loading updater settings...
                  </p>
                )}
                {operation === 'installing' && (
                  <p className="form-message">
                    Downloading, verifying, and installing the modpack...
                  </p>
                )}
                {message && (
                  <p className="form-message success">{message}</p>
                )}
                {error && <p className="form-message error">{error}</p>}
              </div>
              {canInstall && (
                <button
                  className="primary-button install-update-button"
                  type="button"
                  disabled={isBusy || !supportsModUpdateApi}
                  onClick={() => void installUpdate()}
                >
                  {operation === 'installing'
                    ? 'Installing...'
                    : 'Install Update'}
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </PageLayout>
  )
}

interface VersionCardProps {
  readonly label: string
  readonly value: string
}

const VersionCard = ({
  label,
  value
}: VersionCardProps): React.JSX.Element => (
  <div className="mod-version-card">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
)

const ManifestDetails = ({
  manifest
}: {
  readonly manifest: ModpackManifest | null
}): React.JSX.Element => (
  <div className="manifest-details">
    <div>
      <span className="manifest-detail-label">Modpack</span>
      <strong>{manifest?.modpackName ?? 'No manifest loaded'}</strong>
    </div>
    <div>
      <span className="manifest-detail-label">Required launcher</span>
      <strong>{manifest?.requiredLauncherVersion ?? 'Unknown'}</strong>
    </div>
    <div className="manifest-notes">
      <span className="manifest-detail-label">Release notes</span>
      <p>{manifest?.notes || 'Check for an update to load release notes.'}</p>
    </div>
  </div>
)

const formatInstallationStatus = (
  status: ModUpdateInfo['installationStatus']
): string => {
  switch (status) {
    case 'up-to-date':
      return 'Up to date'
    case 'outdated':
      return 'Update available'
    case 'invalid':
      return 'Repair required'
    case 'not-installed':
      return 'Not installed'
    default:
      return 'Not checked'
  }
}

const getCompactStatusDescription = (
  info: ModUpdateInfo,
  operation: UpdateOperation,
  message: string | null,
  error: string | null
): string => {
  if (operation === 'checking') {
    return 'Checking the installed files...'
  }

  if (operation === 'installing') {
    return 'Downloading, verifying, and installing...'
  }

  if (error) {
    return error
  }

  if (message) {
    return message
  }

  switch (info.installationStatus) {
    case 'up-to-date':
      return `Version ${info.installedVersion} is installed and verified.`
    case 'outdated':
      return `${info.installedVersion} installed. Version ${info.manifest?.version} is available.`
    case 'invalid':
      return 'Installed files are missing or modified.'
    case 'not-installed':
      return `Version ${info.manifest?.version ?? ''} is ready to install.`
    default:
      return 'Check the mod files and look for updates.'
  }
}

const formatError = (message: string, error: unknown): string =>
  `${message} ${error instanceof Error ? error.message : String(error)}`
