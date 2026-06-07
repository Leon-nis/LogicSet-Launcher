import type { SaveSummary } from '../../shared/types'

export interface SaveManagerService {
  listSaves(): Promise<readonly SaveSummary[]>
}

export class DefaultSaveManagerService implements SaveManagerService {
  async listSaves(): Promise<readonly SaveSummary[]> {
    throw new Error('SaveManagerService is not implemented yet.')
  }
}
