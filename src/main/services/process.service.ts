import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export interface ProcessService {
  isTorchlightRunning(): Promise<boolean>
}

export class SystemProcessService implements ProcessService {
  async isTorchlightRunning(): Promise<boolean> {
    if (process.platform !== 'win32') {
      return false
    }

    try {
      const { stdout } = await execFileAsync(
        'tasklist.exe',
        ['/FI', 'IMAGENAME eq Torchlight2.exe', '/FO', 'CSV', '/NH'],
        { encoding: 'utf8', windowsHide: true }
      )

      return stdout.toLowerCase().includes('"torchlight2.exe"')
    } catch {
      const { stdout } = await execFileAsync(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          "if (Get-Process -Name 'Torchlight2' -ErrorAction SilentlyContinue) { 'running' } else { 'not-running' }"
        ],
        { encoding: 'utf8', windowsHide: true }
      )

      return stdout.trim().toLowerCase() === 'running'
    }
  }
}
