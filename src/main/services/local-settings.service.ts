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
      const settings: unknown = JSON.parse(contents)

      return isLocalSettings(settings) ? settings : this.defaultSettings
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

  return (
    isRecord(gamePaths) &&
    typeof gamePaths.torchlightExecutablePath === 'string' &&
    typeof gamePaths.savesDirectoryPath === 'string' &&
    typeof gamePaths.modsDirectoryPath === 'string' &&
    typeof gamePaths.localSettingsPath === 'string'
  )
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isNodeError = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && 'code' in error
