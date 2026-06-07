import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import type {
  GamePaths,
  LocalSettings,
  PathDialogKind,
  PathValidation,
  UdpPortApplyRequest
} from '../shared/types'
import { TorchlightGameLaunchService } from './services/game-launch.service'
import { JsonLinesLocalLogService } from './services/local-log.service'
import { JsonLocalSettingsService } from './services/local-settings.service'
import { SystemProcessService } from './services/process.service'
import { FileTorchlightSettingsService } from './services/torchlight-settings.service'

const ipcChannels = {
  loadConfig: 'environment:load-config',
  saveConfig: 'environment:save-config',
  validatePaths: 'environment:validate-paths',
  browsePath: 'environment:browse-path',
  readUdpPort: 'environment:read-udp-port',
  applyUdpPort: 'environment:apply-udp-port',
  launchGame: 'environment:launch-game'
} as const

const createDefaultSettings = (): LocalSettings => {
  const torchlightDocumentsPath = join(
    app.getPath('documents'),
    'My Games',
    'Runic Games',
    'Torchlight 2'
  )

  return {
    schemaVersion: 1,
    gamePaths: {
      torchlightExecutablePath: '',
      savesDirectoryPath: join(torchlightDocumentsPath, 'modsave'),
      modsDirectoryPath: join(torchlightDocumentsPath, 'mods'),
      localSettingsPath: join(torchlightDocumentsPath, 'local_settings.txt')
    }
  }
}

const pathExists = async (path: string): Promise<boolean> => {
  if (path.trim() === '') {
    return false
  }

  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

const validatePaths = async (paths: GamePaths): Promise<PathValidation> => {
  const [
    torchlightExecutablePath,
    savesDirectoryPath,
    modsDirectoryPath,
    localSettingsPath
  ] = await Promise.all([
    pathExists(paths.torchlightExecutablePath),
    pathExists(paths.savesDirectoryPath),
    pathExists(paths.modsDirectoryPath),
    pathExists(paths.localSettingsPath)
  ])

  return {
    torchlightExecutablePath,
    savesDirectoryPath,
    modsDirectoryPath,
    localSettingsPath
  }
}

const isGamePaths = (value: unknown): value is GamePaths => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const paths = value as Record<string, unknown>

  return (
    typeof paths.torchlightExecutablePath === 'string' &&
    typeof paths.savesDirectoryPath === 'string' &&
    typeof paths.modsDirectoryPath === 'string' &&
    typeof paths.localSettingsPath === 'string'
  )
}

const isPathDialogKind = (value: unknown): value is PathDialogKind =>
  value === 'torchlight-executable' ||
  value === 'saves-directory' ||
  value === 'mods-directory' ||
  value === 'local-settings'

const isUdpPortApplyRequest = (
  value: unknown
): value is UdpPortApplyRequest => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const request = value as Record<string, unknown>
  return (
    typeof request.localSettingsPath === 'string' &&
    typeof request.port === 'number'
  )
}

const showPathDialog = async (
  kind: PathDialogKind,
  parentWindow: BrowserWindow | null
): Promise<string | null> => {
  const options: Electron.OpenDialogOptions =
    kind === 'saves-directory' || kind === 'mods-directory'
      ? { properties: ['openDirectory'] }
      : {
          properties: ['openFile'],
          filters:
            kind === 'torchlight-executable'
              ? [{ name: 'Executable', extensions: ['exe'] }]
              : [{ name: 'Text file', extensions: ['txt'] }]
        }

  const result = parentWindow
    ? await dialog.showOpenDialog(parentWindow, options)
    : await dialog.showOpenDialog(options)

  return result.canceled ? null : (result.filePaths[0] ?? null)
}

const registerEnvironmentHandlers = (): void => {
  const settingsService = new JsonLocalSettingsService(
    join(app.getPath('userData'), 'config.json'),
    createDefaultSettings()
  )
  const processService = new SystemProcessService()
  const logService = new JsonLinesLocalLogService(
    join(app.getPath('userData'), 'logicset.log')
  )
  const torchlightSettingsService = new FileTorchlightSettingsService(
    processService,
    logService
  )
  const gameLaunchService = new TorchlightGameLaunchService(
    settingsService,
    processService,
    logService
  )

  ipcMain.handle(ipcChannels.loadConfig, () => settingsService.load())
  ipcMain.handle(
    ipcChannels.saveConfig,
    (_event, settings: LocalSettings) => settingsService.save(settings)
  )
  ipcMain.handle(
    ipcChannels.validatePaths,
    (_event, paths: unknown) => {
      if (!isGamePaths(paths)) {
        throw new Error('Invalid game paths.')
      }

      return validatePaths(paths)
    }
  )
  ipcMain.handle(
    ipcChannels.browsePath,
    (event, kind: unknown) => {
      if (!isPathDialogKind(kind)) {
        throw new Error('Invalid path dialog kind.')
      }

      return showPathDialog(
        kind,
        BrowserWindow.fromWebContents(event.sender)
      )
    }
  )
  ipcMain.handle(
    ipcChannels.readUdpPort,
    (_event, localSettingsPath: unknown) => {
      if (typeof localSettingsPath !== 'string') {
        throw new Error('Invalid local settings path.')
      }

      return torchlightSettingsService.readUdpPort(localSettingsPath)
    }
  )
  ipcMain.handle(
    ipcChannels.applyUdpPort,
    (_event, request: unknown) => {
      if (!isUdpPortApplyRequest(request)) {
        throw new Error('Invalid UDP port request.')
      }

      return torchlightSettingsService.applyUdpPort(
        request.localSettingsPath,
        request.port
      )
    }
  )
  ipcMain.handle(ipcChannels.launchGame, () => gameLaunchService.launch())
}

const createMainWindow = (): BrowserWindow => {
  const mainWindow = new BrowserWindow({
    width: 1120,
    height: 720,
    minWidth: 820,
    minHeight: 600,
    show: false,
    backgroundColor: '#0b1017',
    title: 'LogicSet Launcher',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

app.whenReady().then(() => {
  registerEnvironmentHandlers()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
