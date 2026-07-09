export type NavigationPage =
  | 'home'
  | 'wiki'
  | 'patch-notes'

export type WikiPage =
  | 'skulls-eyes'
  | 'sets'
  | 'monsters'
  | 'skills'
  | 'quests'

export {
  DEFAULT_SOCKETABLE_STAT,
  findSocketableStat,
  isSocketableStat,
  SOCKETABLE_STATS
} from './socketable-stats'
export type {
  SocketableStat,
  SocketableStatOption
} from './socketable-stats'

import type { SocketableStat } from './socketable-stats'
export type SocketableKind = 'skull' | 'eye'

export interface SocketableEntry {
  readonly id: string
  readonly kind: SocketableKind
  readonly name: string
  readonly stat: SocketableStat
  readonly value: string
  readonly iconPath?: string
}

export type LogicSetSetRarity = 'rare' | 'unique' | 'legendary'

export interface LogicSetAffix {
  readonly stat: SocketableStat
  readonly value: string
}

export interface LogicSetSetBonus {
  readonly pieces: number
  readonly affixes: readonly LogicSetAffix[]
}

export interface LogicSetSetEntry {
  readonly id: string
  readonly name: string
  readonly level: number
  readonly range: string
  readonly rarity: LogicSetSetRarity
  readonly helmet: {
    readonly isSpecial: boolean
    readonly iconPath?: string
    readonly affixes: readonly LogicSetAffix[]
  }
  readonly bonuses: readonly LogicSetSetBonus[]
}

export type LogicSetBossArmorKind =
  | 'Physical'
  | 'Ice'
  | 'Fire'
  | 'Electric'
  | 'Poison'

export type LogicSetBossRatingKind =
  | 'Fatality'
  | 'Brutality'
  | 'Agility'
  | 'Hostility'

export interface LogicSetBossEntry {
  readonly id: string
  readonly name: string
  readonly act: string
  readonly speed: number
  readonly criticalChance: number
  readonly hp: number
  readonly armor: Readonly<Record<LogicSetBossArmorKind, number>>
  readonly ratings: Readonly<Record<LogicSetBossRatingKind, number>>
}

export const DEFAULT_LOGICSET_MANIFEST_URL =
  'https://raw.githubusercontent.com/Leon-nis/LogicSet-modpack/main/manifest.json'

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
  readonly analytics: AnalyticsSettings
}

export interface ModUpdateSettings {
  readonly manifestUrl: string
  readonly installedVersion: string | null
}

export interface AnalyticsSettings {
  readonly enabled: boolean
  readonly anonymousId: string
  readonly userActivated: boolean
}

export type AnalyticsEventName =
  | 'game_launched'
  | 'launcher_opened'
  | 'launcher_session_ended'
  | 'launcher_session_started'
  | 'user_activated'

export interface AnalyticsEventProperties {
  readonly app_version?: string
  readonly os?: string
  readonly session_id?: string
  readonly session_duration_seconds?: number
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
  readonly installationStatus:
    | 'unknown'
    | 'not-installed'
    | 'outdated'
    | 'invalid'
    | 'up-to-date'
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

export interface PatchNoteEntryInput {
  readonly id: string
  readonly version: string
  readonly imagePath: string
}

export interface PatchNoteEntry extends PatchNoteEntryInput {
  readonly imageDataUrl: string | null
}

export interface LogicSetApi {
  readonly getAppInfo: () => Promise<AppInfo>
  readonly devMode: {
    readonly get: () => Promise<boolean>
    readonly onChanged: (
      listener: (enabled: boolean) => void
    ) => () => void
  }
  readonly analytics: {
    readonly getSettings: () => Promise<AnalyticsSettings>
    readonly setEnabled: (enabled: boolean) => Promise<AnalyticsSettings>
  }
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
  readonly skullsEyes: {
    readonly getSocketables: () => Promise<readonly SocketableEntry[]>
    readonly saveSocketables: (
      socketables: readonly SocketableEntry[]
    ) => Promise<readonly SocketableEntry[]>
    readonly resetSocketablesToDefaults: () => Promise<
      readonly SocketableEntry[]
    >
  }
  readonly sets: {
    readonly getSets: () => Promise<readonly LogicSetSetEntry[]>
    readonly saveSets: (
      sets: readonly LogicSetSetEntry[]
    ) => Promise<readonly LogicSetSetEntry[]>
    readonly resetSetsToDefaults: () => Promise<
      readonly LogicSetSetEntry[]
    >
  }
  readonly bosses: {
    readonly getBosses: () => Promise<readonly LogicSetBossEntry[]>
    readonly saveBosses: (
      bosses: readonly LogicSetBossEntry[]
    ) => Promise<readonly LogicSetBossEntry[]>
    readonly resetBossesToDefaults: () => Promise<
      readonly LogicSetBossEntry[]
    >
  }
  readonly modUpdate: {
    readonly getInfo: () => Promise<ModUpdateInfo>
    readonly saveManifestUrl: (
      request: SaveManifestUrlRequest
    ) => Promise<ModUpdateResult>
    readonly check: () => Promise<ModUpdateResult>
    readonly install: () => Promise<ModUpdateResult>
  }
  readonly patchNotes: {
    readonly get: () => Promise<readonly PatchNoteEntry[]>
    readonly browseImage: () => Promise<string | null>
    readonly save: (
      entries: readonly PatchNoteEntryInput[]
    ) => Promise<readonly PatchNoteEntry[]>
  }
}
