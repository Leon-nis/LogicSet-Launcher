import { spawn } from 'node:child_process'
import { stat } from 'node:fs/promises'
import { dirname, extname } from 'node:path'
import { shell } from 'electron'
import type { GameLaunchResult } from '../../shared/types'
import type { LocalLogService } from './local-log.service'
import type { LocalSettingsService } from './local-settings.service'
import type { ProcessService } from './process.service'

export interface GameLaunchService {
  launch(): Promise<GameLaunchResult>
}

export class TorchlightGameLaunchService implements GameLaunchService {
  constructor(
    private readonly settingsService: LocalSettingsService,
    private readonly processService: ProcessService,
    private readonly logService: LocalLogService
  ) {}

  async launch(): Promise<GameLaunchResult> {
    let executablePath = ''
    let cwd = ''
    await this.logSafely('game_launch_attempted', {})

    try {
      const settings = await this.settingsService.load()
      executablePath = settings.gamePaths.torchlightExecutablePath.trim()
      cwd = dirname(executablePath)

      if (!(await isExecutableFile(executablePath))) {
        const result: GameLaunchResult = {
          success: false,
          message:
            'The configured Torchlight2.exe path is missing or invalid.',
          errorCode: 'executable-not-found'
        }
        await this.logSafely('game_launch_failed', {
          executablePath,
          cwd,
          errorCode: result.errorCode
        })
        return result
      }

      if (await this.processService.isTorchlightRunning()) {
        const result: GameLaunchResult = {
          success: false,
          message: 'Torchlight II is already running.',
          errorCode: 'game-already-running'
        }
        await this.logSafely('game_already_running', { executablePath })
        return result
      }

      try {
        await spawnDetached(executablePath, cwd)
        await this.logSafely('game_launch_succeeded', {
          executablePath,
          cwd,
          method: 'spawn'
        })

        return {
          success: true,
          message: 'Torchlight II launched successfully.'
        }
      } catch (spawnError: unknown) {
        const spawnDetails = getErrorDetails(spawnError)
        await this.logSafely('game_launch_failed', {
          executablePath,
          cwd,
          method: 'spawn',
          errorName: spawnDetails.name,
          errorMessage: spawnDetails.message,
          errorCode: spawnDetails.code
        })

        const openPathError = await shell.openPath(executablePath)

        if (openPathError === '') {
          await this.logSafely('game_launch_succeeded', {
            executablePath,
            cwd,
            method: 'shell.openPath',
            spawnError: spawnDetails
          })

          return {
            success: true,
            message: 'Torchlight II launched successfully.'
          }
        }

        await this.logSafely('game_launch_failed', {
          executablePath,
          cwd,
          method: 'shell.openPath',
          errorName: 'OpenPathError',
          errorMessage: openPathError,
          spawnError: spawnDetails
        })

        return {
          success: false,
          message: 'Could not launch Torchlight II.',
          errorCode: spawnDetails.code ?? 'launch-failed',
          errorMessage: `${spawnDetails.message} Fallback: ${openPathError}`
        }
      }
    } catch (error: unknown) {
      const errorDetails = getErrorDetails(error)
      await this.logSafely('game_launch_failed', {
        executablePath,
        cwd,
        errorName: errorDetails.name,
        errorMessage: errorDetails.message,
        errorCode: errorDetails.code
      })

      return {
        success: false,
        message: 'Could not launch Torchlight II.',
        errorCode: errorDetails.code ?? 'launch-failed',
        errorMessage: errorDetails.message
      }
    }
  }

  private async logSafely(
    action: string,
    details: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.logService.log(action, details)
    } catch {
      // Logging must not prevent launching the game.
    }
  }
}

const isExecutableFile = async (executablePath: string): Promise<boolean> => {
  if (
    executablePath === '' ||
    extname(executablePath).toLowerCase() !== '.exe'
  ) {
    return false
  }

  try {
    return (await stat(executablePath)).isFile()
  } catch {
    return false
  }
}

interface ErrorDetails {
  readonly name: string
  readonly message: string
  readonly code?: string
}

const getErrorDetails = (error: unknown): ErrorDetails => {
  if (!(error instanceof Error)) {
    return {
      name: 'UnknownError',
      message: String(error)
    }
  }

  const code =
    'code' in error &&
    (typeof error.code === 'string' || typeof error.code === 'number')
      ? String(error.code)
      : undefined

  return {
    name: error.name,
    message: error.message,
    ...(code ? { code } : {})
  }
}

const spawnDetached = (
  executablePath: string,
  cwd: string
): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn(executablePath, [], {
      cwd,
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    })

    child.once('error', reject)
    child.once('spawn', () => {
      child.unref()
      resolve()
    })
  })
