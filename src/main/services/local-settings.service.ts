import type { LocalSettings } from '../../shared/types'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export interface LocalSettingsService {
  load(): Promise<LocalSettings>
  save(settings: LocalSettings): Promise<LocalSettings>
}

export class JsonLocalSettingsService implements LocalSettingsService {
  constructor(
    private readonly configPath: string,
    private readonly defaultSettings: LocalSettings
  ) {}

  async load(): Promise<LocalSettings> {
    try {
      const contents = await readFile(this.configPath, 'utf8')
      const settings = normalizeLocalSettings(
        JSON.parse(contents),
        this.defaultSettings
      )

      return settings
    } catch (error: unknown) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return this.defaultSettings
      }

      throw error
    }
  }

  async save(settings: LocalSettings): Promise<LocalSettings> {
    if (!isLocalSettings(settings)) {
      throw new Error('Invalid local settings.')
    }

    await mkdir(dirname(this.configPath), { recursive: true })

    const temporaryPath = `${this.configPath}.tmp`
    await writeFile(temporaryPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8')
    await rename(temporaryPath, this.configPath)

    return settings
  }
}

const isLocalSettings = (value: unknown): value is LocalSettings => {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    return false
  }

  const { gamePaths } = value

  const { modUpdate } = value

  return (
    isRecord(gamePaths) &&
    typeof gamePaths.torchlightExecutablePath === 'string' &&
    typeof gamePaths.savesDirectoryPath === 'string' &&
    typeof gamePaths.modsDirectoryPath === 'string' &&
    typeof gamePaths.localSettingsPath === 'string' &&
    isRecord(modUpdate) &&
    typeof modUpdate.manifestUrl === 'string' &&
    (typeof modUpdate.installedVersion === 'string' ||
      modUpdate.installedVersion === null)
  )
}

const normalizeLocalSettings = (
  value: unknown,
  defaultSettings: LocalSettings
): LocalSettings => {
  if (isLocalSettings(value)) {
    return value
  }

  if (!isRecord(value) || value.schemaVersion !== 1) {
    return defaultSettings
  }

  const gamePaths = value.gamePaths
  if (
    !isRecord(gamePaths) ||
    typeof gamePaths.torchlightExecutablePath !== 'string' ||
    typeof gamePaths.savesDirectoryPath !== 'string' ||
    typeof gamePaths.modsDirectoryPath !== 'string' ||
    typeof gamePaths.localSettingsPath !== 'string'
  ) {
    return defaultSettings
  }

  const modUpdate = isRecord(value.modUpdate) ? value.modUpdate : {}

  return {
    schemaVersion: 1,
    gamePaths: {
      torchlightExecutablePath: gamePaths.torchlightExecutablePath,
      savesDirectoryPath: gamePaths.savesDirectoryPath,
      modsDirectoryPath: gamePaths.modsDirectoryPath,
      localSettingsPath: gamePaths.localSettingsPath
    },
    modUpdate: {
      manifestUrl:
        typeof modUpdate.manifestUrl === 'string'
          ? modUpdate.manifestUrl
          : defaultSettings.modUpdate.manifestUrl,
      installedVersion:
        typeof modUpdate.installedVersion === 'string' ||
        modUpdate.installedVersion === null
          ? modUpdate.installedVersion
          : defaultSettings.modUpdate.installedVersion
    }
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isNodeError = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && 'code' in error
