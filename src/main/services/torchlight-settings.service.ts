import { Buffer } from 'node:buffer'
import { copyFile, readFile, writeFile } from 'node:fs/promises'
import type {
  UdpPortApplyResult,
  UdpPortReadResult
} from '../../shared/types'
import type { LocalLogService } from './local-log.service'
import type { ProcessService } from './process.service'

const udpPortPattern =
  /^([ \t]*UDPORT[ \t]*:[ \t]*)(\d+)([ \t]*)(\r?)$/im

type TextEncoding = 'utf8' | 'utf16le' | 'utf16be'

interface DecodedSettingsFile {
  readonly contents: string
  readonly encoding: TextEncoding
  readonly hasBom: boolean
}

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
      const settingsFile = decodeSettingsFile(await readFile(localSettingsPath))
      const contents = settingsFile.contents
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

      const settingsFile = decodeSettingsFile(await readFile(localSettingsPath))
      const backupPath = createBackupPath(localSettingsPath)
      await copyFile(localSettingsPath, backupPath)

      const updatedContents = updateUdpPort(settingsFile.contents, port)
      await writeFile(
        localSettingsPath,
        encodeSettingsFile({
          ...settingsFile,
          contents: updatedContents
        })
      )

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
      (
        _line,
        prefix: string,
        _currentPort: string,
        suffix: string,
        carriageReturn: string
      ) => `${prefix}${port}${suffix}${carriageReturn}`
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

const decodeSettingsFile = (buffer: Buffer): DecodedSettingsFile => {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
  ) {
    return {
      contents: buffer.subarray(3).toString('utf8'),
      encoding: 'utf8',
      hasBom: true
    }
  }

  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return {
      contents: buffer.subarray(2).toString('utf16le'),
      encoding: 'utf16le',
      hasBom: true
    }
  }

  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return {
      contents: swapUtf16ByteOrder(buffer.subarray(2)).toString('utf16le'),
      encoding: 'utf16be',
      hasBom: true
    }
  }

  const detectedEncoding = detectUtf16Encoding(buffer)

  if (detectedEncoding === 'utf16le') {
    return {
      contents: buffer.toString('utf16le'),
      encoding: 'utf16le',
      hasBom: false
    }
  }

  if (detectedEncoding === 'utf16be') {
    return {
      contents: swapUtf16ByteOrder(buffer).toString('utf16le'),
      encoding: 'utf16be',
      hasBom: false
    }
  }

  return {
    contents: buffer.toString('utf8'),
    encoding: 'utf8',
    hasBom: false
  }
}

const encodeSettingsFile = (settingsFile: DecodedSettingsFile): Buffer => {
  if (settingsFile.encoding === 'utf16le') {
    const contents = Buffer.from(settingsFile.contents, 'utf16le')
    return settingsFile.hasBom
      ? Buffer.concat([Buffer.from([0xff, 0xfe]), contents])
      : contents
  }

  if (settingsFile.encoding === 'utf16be') {
    const contents = swapUtf16ByteOrder(
      Buffer.from(settingsFile.contents, 'utf16le')
    )
    return settingsFile.hasBom
      ? Buffer.concat([Buffer.from([0xfe, 0xff]), contents])
      : contents
  }

  const contents = Buffer.from(settingsFile.contents, 'utf8')
  return settingsFile.hasBom
    ? Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), contents])
    : contents
}

const detectUtf16Encoding = (buffer: Buffer): TextEncoding | null => {
  const sampleLength = Math.min(buffer.length, 512)
  const pairCount = Math.floor(sampleLength / 2)

  if (pairCount < 2) {
    return null
  }

  let evenNullCount = 0
  let oddNullCount = 0

  for (let index = 0; index < pairCount * 2; index += 2) {
    if (buffer[index] === 0) {
      evenNullCount += 1
    }

    if (buffer[index + 1] === 0) {
      oddNullCount += 1
    }
  }

  const threshold = Math.max(2, Math.floor(pairCount * 0.3))

  if (oddNullCount >= threshold && oddNullCount > evenNullCount * 2) {
    return 'utf16le'
  }

  if (evenNullCount >= threshold && evenNullCount > oddNullCount * 2) {
    return 'utf16be'
  }

  return null
}

const swapUtf16ByteOrder = (buffer: Buffer): Buffer => {
  const swapped = Buffer.from(buffer)

  for (let index = 0; index + 1 < swapped.length; index += 2) {
    const firstByte = swapped[index] ?? 0
    swapped[index] = swapped[index + 1] ?? 0
    swapped[index + 1] = firstByte
  }

  return swapped
}
