import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import type {
  GamePaths,
  LocalSettings,
  PathDialogKind,
  PathValidation
} from '../shared/types'
import { JsonLocalSettingsService } from './services/local-settings.service'

const ipcChannels = {
  loadConfig: 'environment:load-config',
  saveConfig: 'environment:save-config',
  validatePaths: 'environment:validate-paths',
  browsePath: 'environment:browse-path'
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
}

const createMainWindow = (): BrowserWindow => {
  const mainWindow = new BrowserWindow({
    width: 1120,
    height: 720,
    minWidth: 880,
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
