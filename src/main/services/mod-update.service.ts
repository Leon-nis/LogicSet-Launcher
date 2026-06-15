import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import {
  copyFile,
  lstat,
  mkdir,
  readdir,
  rm,
  stat,
  writeFile
} from 'node:fs/promises'
import {
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep
} from 'node:path'
import extractZip from 'extract-zip'
import type {
  ModpackManifest,
  ModpackManifestFile,
  ModUpdateInfo,
  ModUpdateResult
} from '../../shared/types'
import type { LocalLogService } from './local-log.service'
import type { LocalSettingsService } from './local-settings.service'
import type { ProcessService } from './process.service'

export interface ModUpdateService {
  getInfo(): Promise<ModUpdateInfo>
  saveManifestUrl(manifestUrl: string): Promise<ModUpdateResult>
  checkForUpdate(): Promise<ModUpdateResult>
  installUpdate(): Promise<ModUpdateResult>
}

export class DefaultModUpdateService implements ModUpdateService {
  private checkedManifest: ModpackManifest | null = null

  constructor(
    private readonly settingsService: LocalSettingsService,
    private readonly processService: ProcessService,
    private readonly logService: LocalLogService,
    private readonly downloadsDirectory: string,
    private readonly backupsDirectory: string
  ) {}

  async getInfo(): Promise<ModUpdateInfo> {
    const settings = await this.settingsService.load()
    return {
      manifestUrl: settings.modUpdate.manifestUrl,
      installedVersion: settings.modUpdate.installedVersion,
      manifest: this.checkedManifest,
      installationStatus: 'unknown'
    }
  }

  async saveManifestUrl(manifestUrl: string): Promise<ModUpdateResult> {
    const normalizedUrl = manifestUrl.trim()

    if (normalizedUrl !== '' && !isHttpUrl(normalizedUrl)) {
      return this.errorResult(
        'Manifest URL must be a valid HTTP or HTTPS URL.',
        'invalid-manifest-url'
      )
    }

    const settings = await this.settingsService.load()
    const savedSettings = await this.settingsService.save({
      ...settings,
      modUpdate: {
        ...settings.modUpdate,
        manifestUrl: normalizedUrl
      }
    })
    this.checkedManifest = null

    return {
      success: true,
      message: 'Manifest URL saved.',
      info: {
        manifestUrl: savedSettings.modUpdate.manifestUrl,
        installedVersion: savedSettings.modUpdate.installedVersion,
        manifest: null,
        installationStatus: 'unknown'
      }
    }
  }

  async checkForUpdate(): Promise<ModUpdateResult> {
    await this.logSafely('mod_update_check_started', {})

    try {
      const settings = await this.settingsService.load()
      const manifestUrl = settings.modUpdate.manifestUrl.trim()

      if (manifestUrl === '') {
        return this.errorResult(
          'Configure and save a manifest URL first.',
          'manifest-url-not-configured'
        )
      }

      const modsError = await validateModsDirectory(
        settings.gamePaths.modsDirectoryPath
      )
      if (modsError) {
        return this.errorResult(modsError.message, modsError.errorCode)
      }

      let response: Response
      try {
        response = await fetch(manifestUrl, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(30_000)
        })
      } catch (error: unknown) {
        return this.errorResult(
          `Could not download the manifest. ${getErrorMessage(error)}`,
          'manifest-download-failed'
        )
      }

      if (!response.ok) {
        return this.errorResult(
          `Could not download the manifest. HTTP ${response.status}.`,
          'manifest-download-failed'
        )
      }

      let rawManifest: unknown
      try {
        rawManifest = await response.json()
      } catch {
        return this.errorResult(
          'The downloaded manifest is not valid JSON.',
          'manifest-invalid'
        )
      }

      const manifest = parseManifest(rawManifest, manifestUrl)
      if (!manifest) {
        return this.errorResult(
          'The downloaded manifest is missing required or valid fields.',
          'manifest-invalid'
        )
      }

      this.checkedManifest = manifest
      const installationStatus = await getInstallationStatus(
        manifest,
        settings.modUpdate.installedVersion,
        settings.gamePaths.modsDirectoryPath
      )
      await this.logSafely('mod_update_check_succeeded', {
        manifestUrl,
        version: manifest.version,
        channel: manifest.channel,
        installationStatus
      })

      return {
        success: true,
        message: getInstallationStatusMessage(
          installationStatus,
          manifest.version
        ),
        info: {
          manifestUrl,
          installedVersion: settings.modUpdate.installedVersion,
          manifest,
          installationStatus
        }
      }
    } catch (error: unknown) {
      return this.errorResult(
        `Could not check for updates. ${getErrorMessage(error)}`,
        'update-check-failed'
      )
    }
  }

  async installUpdate(): Promise<ModUpdateResult> {
    const manifest = this.checkedManifest

    if (!manifest) {
      return this.errorResult(
        'Check for an update before installing.',
        'manifest-not-checked'
      )
    }

    try {
      if (await this.processService.isTorchlightRunning()) {
        return this.errorResult(
          'Close Torchlight II before installing the modpack.',
          'game-running'
        )
      }

      const settings = await this.settingsService.load()
      const modsDirectory = settings.gamePaths.modsDirectoryPath.trim()
      const modsError = await validateModsDirectory(modsDirectory)
      if (modsError) {
        return this.errorResult(modsError.message, modsError.errorCode)
      }

      await mkdir(this.downloadsDirectory, { recursive: true })
      const operationId = `${Date.now()}-${sanitizeFileName(manifest.version)}`
      const zipPath = join(this.downloadsDirectory, `${operationId}.zip`)
      const extractDirectory = join(
        this.downloadsDirectory,
        `${operationId}-extracted`
      )

      await this.logSafely('mod_update_download_started', {
        version: manifest.version,
        downloadUrl: manifest.downloadUrl
      })

      const downloadResult = await downloadFile(manifest.downloadUrl, zipPath)
      if (!downloadResult.success) {
        await this.logInstallFailed(manifest, downloadResult.message)
        return this.errorResult(
          downloadResult.message,
          'modpack-download-failed'
        )
      }

      await this.logSafely('mod_update_download_succeeded', {
        version: manifest.version,
        zipPath,
        sizeBytes: downloadResult.sizeBytes
      })

      if (
        manifest.sizeBytes > 0 &&
        downloadResult.sizeBytes !== manifest.sizeBytes
      ) {
        await this.logSafely('mod_update_hash_failed', {
          version: manifest.version,
          expectedSizeBytes: manifest.sizeBytes,
          actualSizeBytes: downloadResult.sizeBytes
        })
        await rm(zipPath, { force: true })
        return this.errorResult(
          'The downloaded modpack size does not match the manifest.',
          'modpack-size-mismatch'
        )
      }

      const downloadedHash = await calculateSha256(zipPath)
      if (downloadedHash !== manifest.sha256.toLowerCase()) {
        await this.logSafely('mod_update_hash_failed', {
          version: manifest.version,
          expectedSha256: manifest.sha256,
          actualSha256: downloadedHash
        })
        await rm(zipPath, { force: true })
        return this.errorResult(
          'The downloaded modpack failed SHA256 validation.',
          'modpack-hash-mismatch'
        )
      }

      await rm(extractDirectory, { recursive: true, force: true })
      await mkdir(extractDirectory, { recursive: true })
      await extractZip(zipPath, { dir: extractDirectory })
      await validateExtractedTree(extractDirectory)

      const installFiles = await prepareInstallFiles(
        manifest.files,
        extractDirectory,
        modsDirectory
      )

      await this.logSafely('mod_update_install_started', {
        version: manifest.version,
        fileCount: installFiles.length
      })

      const backupDirectory = join(
        this.backupsDirectory,
        `${operationId}-${sanitizeFileName(manifest.version)}`
      )
      await installFilesWithRollback(installFiles, backupDirectory)

      const savedSettings = await this.settingsService.save({
        ...settings,
        modUpdate: {
          ...settings.modUpdate,
          installedVersion: manifest.version
        }
      })

      await this.logSafely('mod_update_install_succeeded', {
        version: manifest.version,
        backupDirectory,
        fileCount: installFiles.length
      })

      await rm(extractDirectory, { recursive: true, force: true })

      return {
        success: true,
        message: `LogicSet ${manifest.version} installed successfully.`,
        info: {
          manifestUrl: savedSettings.modUpdate.manifestUrl,
          installedVersion: savedSettings.modUpdate.installedVersion,
          manifest,
          installationStatus: 'up-to-date'
        }
      }
    } catch (error: unknown) {
      await this.logInstallFailed(manifest, getErrorMessage(error))
      return this.errorResult(
        `Could not install the modpack. ${getErrorMessage(error)}`,
        'modpack-install-failed'
      )
    }
  }

  private async errorResult(
    message: string,
    errorCode: string
  ): Promise<ModUpdateResult> {
    return {
      success: false,
      message,
      errorCode,
      info: await this.getInfo()
    }
  }

  private async logInstallFailed(
    manifest: ModpackManifest,
    errorMessage: string
  ): Promise<void> {
    await this.logSafely('mod_update_install_failed', {
      version: manifest.version,
      errorMessage
    })
  }

  private async logSafely(
    action: string,
    details: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.logService.log(action, details)
    } catch {
      // Logging must not change update behavior.
    }
  }
}

interface InstallFile {
  readonly sourcePath: string
  readonly destinationPath: string
  readonly relativeDestinationPath: string
}

const parseManifest = (
  value: unknown,
  manifestUrl: string
): ModpackManifest | null => {
  if (!isRecord(value) || !Array.isArray(value.files)) {
    return null
  }

  const files = value.files
    .map(parseManifestFile)
    .filter((file): file is ModpackManifestFile => file !== null)

  if (
    files.length === 0 ||
    files.length !== value.files.length ||
    new Set(
      files.map((file) =>
        stripModsPrefix(file.relativePath).toLowerCase()
      )
    ).size !== files.length ||
    typeof value.modpackName !== 'string' ||
    value.modpackName.trim() === '' ||
    typeof value.version !== 'string' ||
    value.version.trim() === '' ||
    typeof value.channel !== 'string' ||
    value.channel.trim() === '' ||
    typeof value.downloadUrl !== 'string' ||
    typeof value.sha256 !== 'string' ||
    !isSha256(value.sha256) ||
    typeof value.sizeBytes !== 'number' ||
    value.sizeBytes < 0 ||
    typeof value.requiredLauncherVersion !== 'string' ||
    typeof value.notes !== 'string'
  ) {
    return null
  }

  let downloadUrl: string
  try {
    downloadUrl = new URL(value.downloadUrl, manifestUrl).toString()
  } catch {
    return null
  }

  if (!isHttpUrl(downloadUrl)) {
    return null
  }

  return {
    modpackName: value.modpackName,
    version: value.version,
    channel: value.channel,
    downloadUrl,
    sha256: value.sha256.toLowerCase(),
    sizeBytes: value.sizeBytes,
    requiredLauncherVersion: value.requiredLauncherVersion,
    notes: value.notes,
    files
  }
}

const parseManifestFile = (value: unknown): ModpackManifestFile | null => {
  if (
    !isRecord(value) ||
    typeof value.relativePath !== 'string' ||
    !isSafeRelativePath(value.relativePath) ||
    typeof value.sha256 !== 'string' ||
    !isSha256(value.sha256) ||
    typeof value.sizeBytes !== 'number' ||
    value.sizeBytes < 0
  ) {
    return null
  }

  return {
    relativePath: normalizeRelativePath(value.relativePath),
    sha256: value.sha256.toLowerCase(),
    sizeBytes: value.sizeBytes
  }
}

const downloadFile = async (
  url: string,
  destinationPath: string
): Promise<
  | { readonly success: true; readonly sizeBytes: number }
  | { readonly success: false; readonly message: string }
> => {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(120_000)
    })

    if (!response.ok) {
      return {
        success: false,
        message: `Could not download the modpack. HTTP ${response.status}.`
      }
    }

    const data = Buffer.from(await response.arrayBuffer())
    await writeFile(destinationPath, data)
    return { success: true, sizeBytes: data.byteLength }
  } catch (error: unknown) {
    return {
      success: false,
      message: `Could not download the modpack. ${getErrorMessage(error)}`
    }
  }
}

const prepareInstallFiles = async (
  manifestFiles: readonly ModpackManifestFile[],
  extractDirectory: string,
  modsDirectory: string
): Promise<readonly InstallFile[]> => {
  const installFiles: InstallFile[] = []

  for (const manifestFile of manifestFiles) {
    const sourcePath = resolve(
      extractDirectory,
      ...manifestFile.relativePath.split('/')
    )
    if (!isInsideDirectory(extractDirectory, sourcePath)) {
      throw new Error(`Unsafe archive path: ${manifestFile.relativePath}`)
    }

    const sourceStats = await stat(sourcePath)
    if (!sourceStats.isFile()) {
      throw new Error(`Archive file not found: ${manifestFile.relativePath}`)
    }

    const sourceHash = await calculateSha256(sourcePath)
    if (sourceHash !== manifestFile.sha256) {
      throw new Error(
        `Extracted file failed SHA256 validation: ${manifestFile.relativePath}`
      )
    }

    const relativeDestinationPath = stripModsPrefix(
      manifestFile.relativePath
    )
    const destinationPath = resolve(
      modsDirectory,
      ...relativeDestinationPath.split('/')
    )
    if (!isInsideDirectory(modsDirectory, destinationPath)) {
      throw new Error(
        `Unsafe install path: ${manifestFile.relativePath}`
      )
    }

    installFiles.push({
      sourcePath,
      destinationPath,
      relativeDestinationPath
    })
  }

  return installFiles
}

const installFilesWithRollback = async (
  files: readonly InstallFile[],
  backupDirectory: string
): Promise<void> => {
  const backedUpFiles: InstallFile[] = []
  const newlyCreatedFiles: InstallFile[] = []

  try {
    for (const file of files) {
      await mkdir(dirname(file.destinationPath), { recursive: true })

      if (await pathExists(file.destinationPath)) {
        const backupPath = join(
          backupDirectory,
          ...file.relativeDestinationPath.split('/')
        )
        await mkdir(dirname(backupPath), { recursive: true })
        await copyFile(file.destinationPath, backupPath)
        backedUpFiles.push(file)
      } else {
        newlyCreatedFiles.push(file)
      }

      await copyFile(file.sourcePath, file.destinationPath)
    }
  } catch (error: unknown) {
    for (const file of newlyCreatedFiles) {
      await rm(file.destinationPath, { force: true }).catch(() => undefined)
    }
    for (const file of backedUpFiles) {
      const backupPath = join(
        backupDirectory,
        ...file.relativeDestinationPath.split('/')
      )
      await copyFile(backupPath, file.destinationPath).catch(() => undefined)
    }
    throw error
  }
}

const validateExtractedTree = async (directoryPath: string): Promise<void> => {
  const entries = await readdir(directoryPath, { withFileTypes: true })
  for (const entry of entries) {
    const entryPath = join(directoryPath, entry.name)
    const entryStats = await lstat(entryPath)
    if (entryStats.isSymbolicLink()) {
      throw new Error(`Symbolic links are not allowed: ${entry.name}`)
    }
    if (entry.isDirectory()) {
      await validateExtractedTree(entryPath)
    }
  }
}

const validateModsDirectory = async (
  modsDirectoryPath: string
): Promise<{ readonly message: string; readonly errorCode: string } | null> => {
  if (modsDirectoryPath.trim() === '') {
    return {
      message: 'Configure and save the mods folder first.',
      errorCode: 'mods-folder-not-configured'
    }
  }

  try {
    if (!(await stat(modsDirectoryPath)).isDirectory()) {
      throw new Error('Not a directory.')
    }
    return null
  } catch {
    return {
      message: 'The configured mods folder does not exist.',
      errorCode: 'mods-folder-not-found'
    }
  }
}

const getInstallationStatus = async (
  manifest: ModpackManifest,
  installedVersion: string | null,
  modsDirectory: string
): Promise<ModUpdateInfo['installationStatus']> => {
  if (installedVersion === null) {
    return 'not-installed'
  }

  if (installedVersion !== manifest.version) {
    return 'outdated'
  }

  for (const manifestFile of manifest.files) {
    const relativePath = stripModsPrefix(manifestFile.relativePath)
    const installedPath = resolve(
      modsDirectory,
      ...relativePath.split('/')
    )

    if (!isInsideDirectory(modsDirectory, installedPath)) {
      return 'invalid'
    }

    try {
      const installedStats = await stat(installedPath)
      if (
        !installedStats.isFile() ||
        installedStats.size !== manifestFile.sizeBytes ||
        (await calculateSha256(installedPath)) !== manifestFile.sha256
      ) {
        return 'invalid'
      }
    } catch {
      return 'invalid'
    }
  }

  return 'up-to-date'
}

const getInstallationStatusMessage = (
  status: ModUpdateInfo['installationStatus'],
  version: string
): string => {
  switch (status) {
    case 'up-to-date':
      return `LogicSet ${version} is up to date and all installed files are valid.`
    case 'outdated':
      return `LogicSet ${version} is available. Update the installed modpack.`
    case 'invalid':
      return `LogicSet ${version} is selected, but installed files are missing or modified.`
    case 'not-installed':
      return `LogicSet ${version} is available and is not installed yet.`
    default:
      return `LogicSet ${version} status is unknown.`
  }
}

const calculateSha256 = async (filePath: string): Promise<string> =>
  new Promise((resolveHash, rejectHash) => {
    const hash = createHash('sha256')
    const stream = createReadStream(filePath)
    stream.on('error', rejectHash)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolveHash(hash.digest('hex')))
  })

const normalizeRelativePath = (path: string): string =>
  path.replaceAll('\\', '/').replace(/^\.\/+/, '')

const stripModsPrefix = (path: string): string => {
  const normalizedPath = normalizeRelativePath(path)
  return normalizedPath.toLowerCase().startsWith('mods/')
    ? normalizedPath.slice(5)
    : normalizedPath
}

const isSafeRelativePath = (path: string): boolean => {
  const normalizedPath = normalizeRelativePath(path)
  const segments = normalizedPath.split('/')
  return (
    normalizedPath !== '' &&
    !isAbsolute(path) &&
    !/^[a-zA-Z]:/.test(normalizedPath) &&
    segments.every(
      (segment) => segment !== '' && segment !== '.' && segment !== '..'
    )
  )
}

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
    !pathFromDirectory.startsWith(`..${sep}`)
  )
}

const pathExists = async (path: string): Promise<boolean> => {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const isSha256 = (value: string): boolean => /^[a-fA-F0-9]{64}$/.test(value)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const sanitizeFileName = (value: string): string =>
  value.replace(/[^a-zA-Z0-9._-]/g, '_')

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)
