import { copyFile, readFile, writeFile } from 'node:fs/promises'
import type {
  UdpPortApplyResult,
  UdpPortReadResult
} from '../../shared/types'
import type { LocalLogService } from './local-log.service'
import type { ProcessService } from './process.service'

const udpPortPattern =
  /^([ \t]*)UDPORT[ \t]*:[ \t]*(\d+)[ \t]*(\r?)$/im

export interface TorchlightSettingsService {
  readUdpPort(localSettingsPath: string): Promise<UdpPortReadResult>
  applyUdpPort(
    localSettingsPath: string,
    port: number
  ): Promise<UdpPortApplyResult>
}

export class FileTorchlightSettingsService
  implements TorchlightSettingsService
{
  constructor(
    private readonly processService: ProcessService,
    private readonly logService: LocalLogService
  ) {}

  async readUdpPort(localSettingsPath: string): Promise<UdpPortReadResult> {
    try {
      const contents = await readFile(localSettingsPath, 'utf8')
      const match = udpPortPattern.exec(contents)

      return {
        status: 'success',
        port: match?.[2] ? Number.parseInt(match[2], 10) : null
      }
    } catch {
      return {
        status: 'error',
        message: 'Could not read the configured local_settings.txt file.'
      }
    }
  }

  async applyUdpPort(
    localSettingsPath: string,
    port: number
  ): Promise<UdpPortApplyResult> {
    if (!Number.isInteger(port) || port < 1024 || port > 65535) {
      return {
        status: 'error',
        code: 'invalid-port',
        message: 'UDP port must be between 1024 and 65535.'
      }
    }

    try {
      if (await this.processService.isTorchlightRunning()) {
        return {
          status: 'error',
          code: 'game-running',
          message: 'Close Torchlight II before changing the UDP port.'
        }
      }

      const contents = await readFile(localSettingsPath, 'utf8')
      const backupPath = createBackupPath(localSettingsPath)
      await copyFile(localSettingsPath, backupPath)

      const updatedContents = updateUdpPort(contents, port)
      await writeFile(localSettingsPath, updatedContents, 'utf8')

      try {
        await this.logService.log('udp-port-applied', {
          localSettingsPath,
          port,
          backupPath
        })
      } catch {
        // Logging must not turn a successful settings update into a failure.
      }

      return {
        status: 'success',
        port,
        backupPath
      }
    } catch {
      return {
        status: 'error',
        code: 'file-error',
        message:
          'Could not update local_settings.txt. Check the configured path and file permissions.'
      }
    }
  }
}

const updateUdpPort = (contents: string, port: number): string => {
  if (udpPortPattern.test(contents)) {
    return contents.replace(
      udpPortPattern,
      (_line, indentation: string, _currentPort: string, carriageReturn: string) =>
        `${indentation}UDPORT :${port}${carriageReturn}`
    )
  }

  if (contents.length === 0) {
    return `UDPORT :${port}`
  }

  const lineEnding = contents.match(/\r\n|\n|\r/)?.[0] ?? '\r\n'
  const separator = contents.endsWith('\r') || contents.endsWith('\n')
    ? ''
    : lineEnding

  return `${contents}${separator}UDPORT :${port}`
}

const createBackupPath = (localSettingsPath: string): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `${localSettingsPath}.backup-${timestamp}`
}
