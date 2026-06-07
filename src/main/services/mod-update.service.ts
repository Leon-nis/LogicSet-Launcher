import type { ModUpdateState } from '../../shared/types'

export interface ModUpdateService {
  checkForUpdate(): Promise<ModUpdateState>
}

export class DefaultModUpdateService implements ModUpdateService {
  async checkForUpdate(): Promise<ModUpdateState> {
    throw new Error('ModUpdateService is not implemented yet.')
  }
}
