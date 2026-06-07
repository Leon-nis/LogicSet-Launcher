export type NavigationPage = 'environment' | 'saves' | 'mod-update'

export interface AppInfo {
  readonly name: string
  readonly version: string
}

export interface GamePaths {
  readonly torchlightExecutablePath: string
  readonly savesDirectoryPath: string
  readonly modsDirectoryPath: string
  readonly localSettingsPath: string
}

export type GamePathKey = keyof GamePaths

export type PathValidation = Readonly<Record<GamePathKey, boolean>>

export interface EnvironmentStatus {
  readonly paths: GamePaths
  readonly validation: PathValidation
  readonly isConfigured: boolean
}

export type PathDialogKind =
  | 'torchlight-executable'
  | 'saves-directory'
  | 'mods-directory'
  | 'local-settings'

export interface LocalSettings {
  readonly schemaVersion: 1
  readonly gamePaths: GamePaths
  readonly modUpdate: ModUpdateSettings
}

export interface ModUpdateSettings {
  readonly manifestUrl: string
  readonly installedVersion: string | null
}

export type UdpPortReadResult =
  | { readonly status: 'success'; readonly port: number | null }
  | { readonly status: 'error'; readonly message: string }

export interface UdpPortApplyRequest {
  readonly localSettingsPath: string
  readonly port: number
}

export type UdpPortApplyResult =
  | {
      readonly status: 'success'
      readonly port: number
      readonly backupPath: string
    }
  | {
      readonly status: 'error'
      readonly code: 'invalid-port' | 'game-running' | 'file-error'
      readonly message: string
    }

export type GameLaunchErrorCode =
  | 'executable-not-found'
  | 'game-already-running'
  | 'launch-failed'
  | string

export interface GameLaunchResult {
  readonly success: boolean
  readonly message: string
  readonly errorCode?: GameLaunchErrorCode
  readonly errorMessage?: string
}

export type SaveFileKind = 'character' | 'shared_stash' | 'unknown'

export interface SaveFile {
  readonly fileName: string
  readonly fullPath: string
  readonly kind: SaveFileKind
  readonly sizeBytes: number
  readonly modifiedAt: string
}

export interface SaveListResult {
  readonly success: boolean
  readonly saves: readonly SaveFile[]
  readonly message?: string
  readonly errorCode?: string
}

export interface OpenSavesFolderResult {
  readonly success: boolean
  readonly message: string
  readonly errorCode?: string
}

export interface TrashSaveRequest {
  readonly fullPath: string
}

export interface RestoreSaveRequest {
  readonly trashId: string
}

export interface TrashedSaveItem {
  readonly trashId: string
  readonly originalPath: string
  readonly trashedPath: string
  readonly fileName: string
  readonly kind: Exclude<SaveFileKind, 'unknown'>
  readonly trashedAt: string
  readonly sizeBytes: number
}

export interface TrashListResult {
  readonly success: boolean
  readonly items: readonly TrashedSaveItem[]
  readonly message?: string
  readonly errorCode?: string
}

export interface SaveActionResult {
  readonly success: boolean
  readonly message: string
  readonly errorCode?: string
}

export interface ModpackManifestFile {
  readonly relativePath: string
  readonly sha256: string
  readonly sizeBytes: number
}

export interface ModpackManifest {
  readonly modpackName: string
  readonly version: string
  readonly channel: string
  readonly downloadUrl: string
  readonly sha256: string
  readonly sizeBytes: number
  readonly requiredLauncherVersion: string
  readonly notes: string
  readonly files: readonly ModpackManifestFile[]
}

export interface ModUpdateInfo {
  readonly manifestUrl: string
  readonly installedVersion: string | null
  readonly manifest: ModpackManifest | null
}

export interface ModUpdateResult {
  readonly success: boolean
  readonly message: string
  readonly info: ModUpdateInfo
  readonly errorCode?: string
}

export interface SaveManifestUrlRequest {
  readonly manifestUrl: string
}

export interface LogicSetApi {
  readonly getAppInfo: () => Promise<AppInfo>
  readonly environment: {
    readonly loadConfig: () => Promise<LocalSettings>
    readonly saveConfig: (settings: LocalSettings) => Promise<LocalSettings>
    readonly validatePaths: (paths: GamePaths) => Promise<PathValidation>
    readonly browsePath: (kind: PathDialogKind) => Promise<string | null>
    readonly readUdpPort: (
      localSettingsPath: string
    ) => Promise<UdpPortReadResult>
    readonly applyUdpPort: (
      request: UdpPortApplyRequest
    ) => Promise<UdpPortApplyResult>
    readonly launchGame: () => Promise<GameLaunchResult>
  }
  readonly saves: {
    readonly list: () => Promise<SaveListResult>
    readonly openFolder: () => Promise<OpenSavesFolderResult>
    readonly listTrash: () => Promise<TrashListResult>
    readonly moveToTrash: (
      request: TrashSaveRequest
    ) => Promise<SaveActionResult>
    readonly restore: (
      request: RestoreSaveRequest
    ) => Promise<SaveActionResult>
  }
  readonly modUpdate: {
    readonly getInfo: () => Promise<ModUpdateInfo>
    readonly saveManifestUrl: (
      request: SaveManifestUrlRequest
    ) => Promise<ModUpdateResult>
    readonly check: () => Promise<ModUpdateResult>
    readonly install: () => Promise<ModUpdateResult>
  }
}
