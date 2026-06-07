import type { EnvironmentStatus } from '../../shared/types'

export interface EnvironmentService {
  getStatus(): Promise<EnvironmentStatus>
}

export class DefaultEnvironmentService implements EnvironmentService {
  async getStatus(): Promise<EnvironmentStatus> {
    throw new Error('EnvironmentService is not implemented yet.')
  }
}
