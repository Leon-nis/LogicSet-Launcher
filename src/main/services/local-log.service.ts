import { appendFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

export interface LocalLogService {
  log(action: string, details: Record<string, unknown>): Promise<void>
}

export class JsonLinesLocalLogService implements LocalLogService {
  constructor(private readonly logPath: string) {}

  async log(
    action: string,
    details: Record<string, unknown>
  ): Promise<void> {
    await mkdir(dirname(this.logPath), { recursive: true })
    await appendFile(
      this.logPath,
      `${JSON.stringify({
        timestamp: new Date().toISOString(),
        action,
        details
      })}\n`,
      'utf8'
    )
  }
}
