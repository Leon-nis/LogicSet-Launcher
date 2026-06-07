import type { LocalSettings } from '../../shared/types'

export interface LocalSettingsService {
  load(): Promise<LocalSettings>
  save(settings: LocalSettings): Promise<void>
}

export class JsonLocalSettingsService implements LocalSettingsService {
  async load(): Promise<LocalSettings> {
    throw new Error('LocalSettingsService is not implemented yet.')
  }

  async save(_settings: LocalSettings): Promise<void> {
    throw new Error('LocalSettingsService is not implemented yet.')
  }
}
