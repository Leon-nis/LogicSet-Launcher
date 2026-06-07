export type NavigationPage = 'environment' | 'saves' | 'mod-update'

export interface AppInfo {
  readonly name: string
  readonly version: string
}

export interface GamePaths {
  readonly torchlightInstallPath: string | null
  readonly modDirectoryPath: string | null
  readonly savesDirectoryPath: string | null
}

export interface EnvironmentStatus {
  readonly paths: GamePaths
  readonly isConfigured: boolean
}

export interface LocalSettings {
  readonly schemaVersion: 1
  readonly gamePaths: GamePaths
}

export interface SaveSummary {
  readonly id: string
  readonly name: string
  readonly updatedAt: string
}

export type ModUpdateState =
  | { readonly status: 'idle' }
  | { readonly status: 'checking' }
  | { readonly status: 'up-to-date'; readonly version: string }
  | {
      readonly status: 'update-available'
      readonly currentVersion: string
      readonly availableVersion: string
    }
  | { readonly status: 'error'; readonly message: string }

export interface LogicSetApi {
  readonly getAppInfo: () => Promise<AppInfo>
}
