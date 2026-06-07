import type { GamePaths } from '../../shared/types'

export interface PathsService {
  getPaths(): Promise<GamePaths>
}

export class DefaultPathsService implements PathsService {
  async getPaths(): Promise<GamePaths> {
    throw new Error('PathsService is not implemented yet.')
  }
}
