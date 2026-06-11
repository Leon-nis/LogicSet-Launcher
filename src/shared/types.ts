export type NavigationPage =
  | 'environment'
  | 'saves'
  | 'skulls-eyes'
  | 'sets'
  | 'mod-update'

export const SOCKETABLE_STATS = [
  'ALL DAMAGE TAKEN %',
  'ALL DAMAGE %',
  'DAMAGE %',
  'DAMAGE PHYSICAL %',
  'WEAPON DAMAGE',
  'WEAPON DAMAGE ELECTRICAL',
  'WEAPON DAMAGE PHYSICAL',
  'MELEE WEAPON DAMAGE',
  'ARMOR FLAT',
  'MULT-ARMOR FLAT',
  'DRAW ARMOR BY MONSTER COUNT (MAX 5)',
  'KNOCKBACK RESISTANCE',
  'SLOW RESISTANCE',
  'IMMOB RESISTANCE',
  'DAMAGE TAKEN %',
  'ATTACK SPEED',
  'CAST SPEED',
  'BLOCK CHANCE',
  'CRITICAL CHANCE',
  'CRITICAL DAMAGE',
  'DODGE',
  'EXECUTE CHANCE',
  'DUAL-WIELDING DAMAGE',
  'FUMBLE CHANCE',
  'FUMBLE DAMAGE',
  'HEALTH BONUS',
  'MANA BONUS',
  'HEALTH REGEN',
  'MANA REGEN',
  'PET HEALTH %',
  'PET ARMOR %',
  'PET DAMAGE %',
  'MISSILES RANGE BONUS',
  'PROC FULLYHEAL (ON KILL)',
  'PROC ACID RAIN',
  'PROC SHADOWLING BAT (ON KILL)',
  'PROC METEOR STRIKE (ON KILL)',
  'KNOCKBACK BONUS',
  'SHORT STUN',
  'ARMOR DEGREE',
  'SHIELD BREAK',
  'CONVEYS DAMAGE',
  'GOLD DROP',
  'SPEED %',
  'XP %'
] as const

export type SocketableStat = (typeof SOCKETABLE_STATS)[number]
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

export interface LogicSetSetBonus {
  readonly pieces: number
  readonly stat: SocketableStat
}

export interface LogicSetHelmetAffix {
  readonly stat: SocketableStat
  readonly value: string
}

export interface LogicSetSetEntry {
  readonly id: string
  readonly name: string
  readonly level: number
  readonly rarity: LogicSetSetRarity
  readonly helmet: {
    readonly iconPath?: string
    readonly affixes: readonly LogicSetHelmetAffix[]
  }
  readonly bonuses: readonly LogicSetSetBonus[]
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
}

export type AnalyticsEventName =
  | 'analytics_enabled'
  | 'mod_update_tab_opened'
  | 'mod_update_checked'
  | 'mod_update_installed'

export interface AnalyticsEventProperties {
  readonly app_version?: string
  readonly os?: string
  readonly success?: boolean
  readonly error_code?: string
  readonly installed_version?: string
  readonly remote_version?: string
  readonly modpack_version?: string
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
  readonly analytics: {
    readonly getSettings: () => Promise<AnalyticsSettings>
    readonly setEnabled: (enabled: boolean) => Promise<AnalyticsSettings>
    readonly trackEvent: (
      event: AnalyticsEventName,
      properties?: AnalyticsEventProperties
    ) => Promise<void>
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
  readonly modUpdate: {
    readonly getInfo: () => Promise<ModUpdateInfo>
    readonly saveManifestUrl: (
      request: SaveManifestUrlRequest
    ) => Promise<ModUpdateResult>
    readonly check: () => Promise<ModUpdateResult>
    readonly install: () => Promise<ModUpdateResult>
  }
}
