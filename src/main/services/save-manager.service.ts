import { readdir, stat } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { shell } from 'electron'
import type {
  OpenSavesFolderResult,
  SaveFile,
  SaveFileKind,
  SaveListResult
} from '../../shared/types'
import type { LocalSettingsService } from './local-settings.service'

export interface SaveManagerService {
  listSaves(): Promise<SaveListResult>
  openSavesFolder(): Promise<OpenSavesFolderResult>
}

export class DefaultSaveManagerService implements SaveManagerService {
  constructor(private readonly settingsService: LocalSettingsService) {}

  async listSaves(): Promise<SaveListResult> {
    let savesDirectoryPath: string

    try {
      savesDirectoryPath = await this.getSavesDirectoryPath()
    } catch {
      return {
        success: false,
        saves: [],
        message: 'Could not load the saved launcher configuration.',
        errorCode: 'config-read-failed'
      }
    }

    if (savesDirectoryPath === '') {
      return {
        success: false,
        saves: [],
        message: 'Configure and save the saves/modsave folder first.',
        errorCode: 'folder-not-configured'
      }
    }

    try {
      const directoryStats = await stat(savesDirectoryPath)

      if (!directoryStats.isDirectory()) {
        return {
          success: false,
          saves: [],
          message: 'The configured saves path is not a folder.',
          errorCode: 'folder-not-found'
        }
      }

      const entries = await readdir(savesDirectoryPath, {
        withFileTypes: true
      })
      const files = entries.filter((entry) => entry.isFile())
      const saves = await Promise.all(
        files.map(async (entry): Promise<SaveFile> => {
          const fullPath = join(savesDirectoryPath, entry.name)
          const fileStats = await stat(fullPath)

          return {
            fileName: entry.name,
            fullPath,
            kind: classifySaveFile(entry.name),
            sizeBytes: fileStats.size,
            modifiedAt: fileStats.mtime.toISOString()
          }
        })
      )

      saves.sort(
        (left, right) =>
          right.modifiedAt.localeCompare(left.modifiedAt) ||
          left.fileName.localeCompare(right.fileName)
      )

      return {
        success: true,
        saves
      }
    } catch (error: unknown) {
      const errorCode = getNodeErrorCode(error)

      return {
        success: false,
        saves: [],
        message:
          errorCode === 'ENOENT'
            ? 'The configured saves/modsave folder does not exist.'
            : 'Could not read the configured saves/modsave folder.',
        errorCode:
          errorCode === 'ENOENT' ? 'folder-not-found' : 'folder-read-failed'
      }
    }
  }

  async openSavesFolder(): Promise<OpenSavesFolderResult> {
    let savesDirectoryPath: string

    try {
      savesDirectoryPath = await this.getSavesDirectoryPath()
    } catch {
      return {
        success: false,
        message: 'Could not load the saved launcher configuration.',
        errorCode: 'config-read-failed'
      }
    }

    if (savesDirectoryPath === '') {
      return {
        success: false,
        message: 'Configure and save the saves/modsave folder first.',
        errorCode: 'folder-not-configured'
      }
    }

    try {
      if (!(await stat(savesDirectoryPath)).isDirectory()) {
        return {
          success: false,
          message: 'The configured saves/modsave folder does not exist.',
          errorCode: 'folder-not-found'
        }
      }

      const openError = await shell.openPath(savesDirectoryPath)

      return openError === ''
        ? { success: true, message: 'Saves folder opened.' }
        : {
            success: false,
            message: `Could not open the saves folder. ${openError}`,
            errorCode: 'folder-open-failed'
          }
    } catch {
      return {
        success: false,
        message: 'The configured saves/modsave folder does not exist.',
        errorCode: 'folder-not-found'
      }
    }
  }

  private async getSavesDirectoryPath(): Promise<string> {
    const settings = await this.settingsService.load()
    return settings.gamePaths.savesDirectoryPath.trim()
  }
}

const classifySaveFile = (fileName: string): SaveFileKind => {
  const normalizedName = fileName.toLowerCase()

  if (
    normalizedName.includes('sharedstash') ||
    normalizedName.includes('shared_stash')
  ) {
    return 'shared_stash'
  }

  return extname(normalizedName) === '.svb' ? 'character' : 'unknown'
}

const getNodeErrorCode = (error: unknown): string | undefined =>
  error instanceof Error &&
  'code' in error &&
  typeof error.code === 'string'
    ? error.code
    : undefined
