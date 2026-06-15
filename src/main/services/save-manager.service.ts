import { constants } from 'node:fs'
import {
  access,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  unlink,
  writeFile
} from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import { shell } from 'electron'
import type {
  OpenSavesFolderResult,
  SaveActionResult,
  SaveFile,
  SaveFileKind,
  SaveListResult,
  TrashListResult,
  TrashedSaveItem
} from '../../shared/types'
import type { LocalLogService } from './local-log.service'
import type { LocalSettingsService } from './local-settings.service'
import type { ProcessService } from './process.service'

export interface SaveManagerService {
  listSaves(): Promise<SaveListResult>
  openSavesFolder(): Promise<OpenSavesFolderResult>
  listTrash(): Promise<TrashListResult>
  moveToTrash(fullPath: string): Promise<SaveActionResult>
  restore(trashId: string): Promise<SaveActionResult>
}

export class DefaultSaveManagerService implements SaveManagerService {
  constructor(
    private readonly settingsService: LocalSettingsService,
    private readonly processService: ProcessService,
    private readonly logService: LocalLogService,
    private readonly trashRoot: string
  ) {}

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
      const files = entries
        .filter((entry) => entry.isFile())
        .map((entry) => ({
          entry,
          kind: classifySaveFile(entry.name)
        }))
        .filter(
          (
            file
          ): file is {
            entry: (typeof entries)[number]
            kind: Exclude<SaveFileKind, 'unknown'>
          } => file.kind !== 'unknown'
        )
      const saves = await Promise.all(
        files.map(async ({ entry, kind }): Promise<SaveFile> => {
          const fullPath = join(savesDirectoryPath, entry.name)
          const fileStats = await stat(fullPath)

          return {
            fileName: entry.name,
            fullPath,
            kind,
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

  async listTrash(): Promise<TrashListResult> {
    try {
      await mkdir(this.trashRoot, { recursive: true })
      const entries = await readdir(this.trashRoot, { withFileTypes: true })
      const items = (
        await Promise.all(
          entries
            .filter((entry) => entry.isDirectory())
            .map((entry) => this.readTrashItem(entry.name))
        )
      ).filter((item): item is TrashedSaveItem => item !== null)

      items.sort((left, right) =>
        right.trashedAt.localeCompare(left.trashedAt)
      )

      return { success: true, items }
    } catch {
      return {
        success: false,
        items: [],
        message: 'Could not read the launcher trash.',
        errorCode: 'trash-read-failed'
      }
    }
  }

  async moveToTrash(fullPath: string): Promise<SaveActionResult> {
    try {
      if (await this.processService.isTorchlightRunning()) {
        return gameRunningResult()
      }

      const savesDirectoryPath = await this.getSavesDirectoryPath()
      const sourcePath = resolve(fullPath)

      if (!isDirectChild(savesDirectoryPath, sourcePath)) {
        return {
          success: false,
          message: 'The selected file is outside the configured saves folder.',
          errorCode: 'invalid-save-path'
        }
      }

      const sourceStats = await stat(sourcePath)
      const kind = classifySaveFile(basename(sourcePath))

      if (
        !sourceStats.isFile() ||
        (kind !== 'character' && kind !== 'shared_stash')
      ) {
        return {
          success: false,
          message: 'Only character and shared stash files can be moved.',
          errorCode: 'unsupported-save-kind'
        }
      }

      const trashedAt = new Date().toISOString()
      const trashId = `${trashedAt.replace(/[:.]/g, '-')}-${randomUUID()}`
      const operationDirectory = join(this.trashRoot, trashId)
      const trashedPath = join(operationDirectory, basename(sourcePath))
      const metadata: TrashMetadata = {
        originalPath: sourcePath,
        trashedPath,
        fileName: basename(sourcePath),
        kind,
        trashedAt
      }

      await mkdir(this.trashRoot, { recursive: true })
      await mkdir(operationDirectory, { recursive: false })

      try {
        await moveFile(sourcePath, trashedPath)
        await writeFile(
          join(operationDirectory, 'metadata.json'),
          `${JSON.stringify(metadata, null, 2)}\n`,
          'utf8'
        )
      } catch (error: unknown) {
        if (await pathExists(trashedPath)) {
          await moveFile(trashedPath, sourcePath).catch(() => undefined)
        }
        await rm(operationDirectory, { recursive: true, force: true })
        throw error
      }

      await this.logSafely(
        kind === 'character'
          ? 'character_moved_to_trash'
          : 'stash_moved_to_trash',
        { ...metadata }
      )

      return {
        success: true,
        message: `${metadata.fileName} moved to Launcher Trash.`
      }
    } catch (error: unknown) {
      return {
        success: false,
        message:
          getNodeErrorCode(error) === 'ENOENT'
            ? 'The selected save file no longer exists.'
            : 'Could not move the file to Launcher Trash.',
        errorCode: 'trash-move-failed'
      }
    }
  }

  async restore(trashId: string): Promise<SaveActionResult> {
    try {
      if (await this.processService.isTorchlightRunning()) {
        return gameRunningResult()
      }

      if (!isSafeTrashId(trashId)) {
        return {
          success: false,
          message: 'The selected trash item is invalid.',
          errorCode: 'invalid-trash-item'
        }
      }

      const metadata = await this.readTrashMetadata(trashId)

      if (await pathExists(metadata.originalPath)) {
        return {
          success: false,
          message:
            'A file already exists at the original location. Nothing was overwritten.',
          errorCode: 'restore-destination-exists'
        }
      }

      const originalDirectory = dirname(metadata.originalPath)
      if (!(await stat(originalDirectory)).isDirectory()) {
        return {
          success: false,
          message: 'The original saves folder no longer exists.',
          errorCode: 'restore-folder-not-found'
        }
      }

      await moveFile(metadata.trashedPath, metadata.originalPath, true)
      await rm(join(this.trashRoot, trashId), {
        recursive: true,
        force: true
      })
      await this.logSafely('save_restored_from_trash', { ...metadata })

      return {
        success: true,
        message: `${metadata.fileName} restored to its original location.`
      }
    } catch (error: unknown) {
      return {
        success: false,
        message:
          getNodeErrorCode(error) === 'ENOENT'
            ? 'The selected trash item no longer exists.'
            : 'Could not restore the selected file.',
        errorCode: 'restore-failed'
      }
    }
  }

  private async getSavesDirectoryPath(): Promise<string> {
    const settings = await this.settingsService.load()
    return settings.gamePaths.savesDirectoryPath.trim()
  }

  private async readTrashItem(
    trashId: string
  ): Promise<TrashedSaveItem | null> {
    try {
      const metadata = await this.readTrashMetadata(trashId)
      const fileStats = await stat(metadata.trashedPath)

      if (!fileStats.isFile()) {
        return null
      }

      return {
        trashId,
        ...metadata,
        sizeBytes: fileStats.size
      }
    } catch {
      return null
    }
  }

  private async readTrashMetadata(trashId: string): Promise<TrashMetadata> {
    const operationDirectory = resolve(this.trashRoot, trashId)

    if (
      !isSafeTrashId(trashId) ||
      !isInsideDirectory(this.trashRoot, operationDirectory)
    ) {
      throw new Error('Invalid trash item.')
    }

    const rawMetadata = await readFile(
      join(operationDirectory, 'metadata.json'),
      'utf8'
    )
    const metadata: unknown = JSON.parse(rawMetadata)

    if (!isTrashMetadata(metadata)) {
      throw new Error('Invalid trash metadata.')
    }

    if (basename(metadata.fileName) !== metadata.fileName) {
      throw new Error('Invalid trash file name.')
    }

    if (basename(metadata.originalPath) !== metadata.fileName) {
      throw new Error('Invalid original file path.')
    }

    const expectedTrashedPath = resolve(
      operationDirectory,
      metadata.fileName
    )

    if (
      resolve(metadata.trashedPath) !== expectedTrashedPath ||
      !isInsideDirectory(operationDirectory, expectedTrashedPath)
    ) {
      throw new Error('Invalid trashed file path.')
    }

    return metadata
  }

  private async logSafely(
    action: string,
    details: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.logService.log(action, details)
    } catch {
      // Logging must not change the result of a completed file operation.
    }
  }
}

interface TrashMetadata {
  readonly originalPath: string
  readonly trashedPath: string
  readonly fileName: string
  readonly kind: 'character' | 'shared_stash'
  readonly trashedAt: string
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

const isTrashMetadata = (value: unknown): value is TrashMetadata => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const metadata = value as Record<string, unknown>
  return (
    typeof metadata.originalPath === 'string' &&
    typeof metadata.trashedPath === 'string' &&
    typeof metadata.fileName === 'string' &&
    (metadata.kind === 'character' || metadata.kind === 'shared_stash') &&
    typeof metadata.trashedAt === 'string'
  )
}

const isDirectChild = (directoryPath: string, filePath: string): boolean =>
  resolve(dirname(filePath)) === resolve(directoryPath)

const isInsideDirectory = (
  directoryPath: string,
  candidatePath: string
): boolean => {
  const pathFromDirectory = relative(
    resolve(directoryPath),
    resolve(candidatePath)
  )
  return (
    pathFromDirectory !== '' &&
    pathFromDirectory !== '..' &&
    !pathFromDirectory.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)
  )
}

const isSafeTrashId = (trashId: string): boolean =>
  trashId !== '' &&
  trashId !== '.' &&
  trashId !== '..' &&
  basename(trashId) === trashId

const pathExists = async (path: string): Promise<boolean> => {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

const moveFile = async (
  sourcePath: string,
  destinationPath: string,
  failIfDestinationExists = false
): Promise<void> => {
  if (failIfDestinationExists && (await pathExists(destinationPath))) {
    const error = new Error('Destination already exists.')
    Object.assign(error, { code: 'EEXIST' })
    throw error
  }

  try {
    await rename(sourcePath, destinationPath)
  } catch (error: unknown) {
    if (getNodeErrorCode(error) !== 'EXDEV') {
      throw error
    }

    await copyFile(
      sourcePath,
      destinationPath,
      failIfDestinationExists ? constants.COPYFILE_EXCL : 0
    )
    await unlink(sourcePath)
  }
}

const gameRunningResult = (): SaveActionResult => ({
  success: false,
  message: 'Close Torchlight II before changing save files.',
  errorCode: 'game-running'
})
