import { useCallback, useEffect, useState } from 'react'
import type {
  ModpackManifest,
  ModUpdateInfo
} from '../../../shared/types'
import { PageLayout } from '../components/PageLayout'

const emptyInfo: ModUpdateInfo = {
  manifestUrl: '',
  installedVersion: null,
  manifest: null
}

type UpdateOperation = 'saving' | 'checking' | 'installing' | null

export const ModUpdatePage = (): React.JSX.Element => {
  const supportsModUpdateApi =
    typeof window.logicSet.modUpdate?.getInfo === 'function' &&
    typeof window.logicSet.modUpdate?.saveManifestUrl === 'function' &&
    typeof window.logicSet.modUpdate?.check === 'function' &&
    typeof window.logicSet.modUpdate?.install === 'function'
  const [manifestUrl, setManifestUrl] = useState('')
  const [info, setInfo] = useState<ModUpdateInfo>(emptyInfo)
  const [operation, setOperation] = useState<UpdateOperation>(null)
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

  return (
    <PageLayout
      eyebrow="LogicSet"
      title="Mod Update"
      description="Check the stable LogicSet manifest and install a verified modpack into the configured mods folder."
    >
      <section className="mod-update-panel" aria-busy={isLoading || isBusy}>
        <div className="manifest-settings">
          <div className="manifest-settings-copy">
            <h2>Remote manifest</h2>
            <p>
              The launcher only checks this URL when you request it. Updates
              are never installed automatically.
            </p>
          </div>
          <label htmlFor="manifestUrl">Manifest URL</label>
          <div className="manifest-url-row">
            <input
              id="manifestUrl"
              type="url"
              value={manifestUrl}
              disabled={isLoading || isBusy || !supportsModUpdateApi}
              placeholder="https://example.com/manifest.json"
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
              disabled={isLoading || isBusy || !supportsModUpdateApi}
              onClick={() => void saveManifestUrl()}
            >
              {operation === 'saving' ? 'Saving...' : 'Save Manifest URL'}
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={isLoading || isBusy || !supportsModUpdateApi}
              onClick={() => void checkUpdate()}
            >
              {operation === 'checking' ? 'Checking...' : 'Check Update'}
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
              <p className="form-message">Loading updater settings...</p>
            )}
            {operation === 'installing' && (
              <p className="form-message">
                Downloading, verifying, and installing the modpack...
              </p>
            )}
            {message && <p className="form-message success">{message}</p>}
            {error && <p className="form-message error">{error}</p>}
          </div>
          {info.manifest && (
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

const formatError = (message: string, error: unknown): string =>
  `${message} ${error instanceof Error ? error.message : String(error)}`
