import { access } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron'
import type {
  GamePaths,
  LocalSettings,
  PathDialogKind,
  PathValidation,
  RestoreSaveRequest,
  SaveManifestUrlRequest,
  TrashSaveRequest,
  UdpPortApplyRequest
} from '../shared/types'
import { DEFAULT_LOGICSET_MANIFEST_URL } from '../shared/types'
import { PostHogAnalyticsService } from './services/analytics.service'
import type { AnalyticsService } from './services/analytics.service'
import { TorchlightGameLaunchService } from './services/game-launch.service'
import { JsonLinesLocalLogService } from './services/local-log.service'
import { JsonLocalSettingsService } from './services/local-settings.service'
import { DefaultModUpdateService } from './services/mod-update.service'
import { SystemProcessService } from './services/process.service'
import { DefaultSaveManagerService } from './services/save-manager.service'
import {
  isLogicSetSetEntries,
  JsonSetsService
} from './services/sets.service'
import {
  isSocketableEntries,
  JsonSkullsEyesService
} from './services/skulls-eyes.service'
import { FileTorchlightSettingsService } from './services/torchlight-settings.service'

const ipcChannels = {
  getDevMode: 'dev-mode:get',
  devModeChanged: 'dev-mode:changed',
  loadConfig: 'environment:load-config',
  saveConfig: 'environment:save-config',
  validatePaths: 'environment:validate-paths',
  browsePath: 'environment:browse-path',
  readUdpPort: 'environment:read-udp-port',
  applyUdpPort: 'environment:apply-udp-port',
  launchGame: 'environment:launch-game',
  listSaves: 'saves:list',
  openSavesFolder: 'saves:open-folder',
  listSaveTrash: 'saves:list-trash',
  moveSaveToTrash: 'saves:move-to-trash',
  restoreSave: 'saves:restore',
  getSocketables: 'skulls-eyes:get',
  saveSocketables: 'skulls-eyes:save',
  resetSocketables: 'skulls-eyes:reset',
  getSets: 'sets:get',
  saveSets: 'sets:save',
  resetSets: 'sets:reset',
  getModUpdateInfo: 'mod-update:get-info',
  saveManifestUrl: 'mod-update:save-manifest-url',
  checkModUpdate: 'mod-update:check',
  installModUpdate: 'mod-update:install',
  getAnalyticsSettings: 'analytics:get-settings',
  setAnalyticsEnabled: 'analytics:set-enabled'
} as const

let isDevMode = false
let analyticsServiceForShutdown: AnalyticsService | null = null
let isAnalyticsShuttingDown = false

const setDevMode = (enabled: boolean): void => {
  isDevMode = enabled
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(ipcChannels.devModeChanged, enabled)
  }
}

const createApplicationMenu = (): void => {
  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [{ role: 'quit' }]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Dev Mode',
          type: 'checkbox',
          checked: isDevMode,
          click: (menuItem) => setDevMode(menuItem.checked)
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'close' }]
    }
  ])
  Menu.setApplicationMenu(menu)
}

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
    },
    modUpdate: {
      manifestUrl: DEFAULT_LOGICSET_MANIFEST_URL,
      installedVersion: null
    },
    analytics: {
      enabled: false,
      anonymousId: randomUUID(),
      userActivated: false
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

const isTrashSaveRequest = (value: unknown): value is TrashSaveRequest =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Record<string, unknown>).fullPath === 'string'

const isRestoreSaveRequest = (value: unknown): value is RestoreSaveRequest =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Record<string, unknown>).trashId === 'string'

const isSaveManifestUrlRequest = (
  value: unknown
): value is SaveManifestUrlRequest =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Record<string, unknown>).manifestUrl === 'string'

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

const registerEnvironmentHandlers = async (): Promise<void> => {
  const settingsService = new JsonLocalSettingsService(
    join(app.getPath('userData'), 'config.json'),
    createDefaultSettings()
  )
  await settingsService.save(await settingsService.load())

  const analyticsService = new PostHogAnalyticsService(
    settingsService,
    app.getVersion()
  )
  analyticsServiceForShutdown = analyticsService
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
  const saveManagerService = new DefaultSaveManagerService(
    settingsService,
    processService,
    logService,
    join(app.getPath('userData'), 'trash', 'saves')
  )
  const modUpdateService = new DefaultModUpdateService(
    settingsService,
    processService,
    logService,
    join(app.getPath('userData'), 'downloads'),
    join(app.getPath('userData'), 'backups', 'mod-update')
  )
  const skullsEyesService = new JsonSkullsEyesService(
    join(app.getPath('userData'), 'skulls-eyes.json')
  )
  const setsService = new JsonSetsService(
    join(app.getPath('userData'), 'sets.json')
  )

  ipcMain.handle(ipcChannels.getDevMode, () => isDevMode)
  ipcMain.handle(ipcChannels.getAnalyticsSettings, () =>
    analyticsService.getSettings()
  )
  ipcMain.handle(
    ipcChannels.setAnalyticsEnabled,
    (_event, enabled: unknown) => {
      if (typeof enabled !== 'boolean') {
        throw new Error('Invalid analytics setting.')
      }

      return analyticsService.setEnabled(enabled)
    }
  )
  ipcMain.handle(ipcChannels.loadConfig, () => settingsService.load())
  ipcMain.handle(
    ipcChannels.saveConfig,
    async (_event, settings: LocalSettings) => {
      const currentSettings = await settingsService.load()
      return settingsService.save({
        ...settings,
        analytics: {
          ...settings.analytics,
          userActivated: currentSettings.analytics.userActivated
        }
      })
    }
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
  ipcMain.handle(ipcChannels.launchGame, async () => {
    const result = await gameLaunchService.launch()
    if (result.success) {
      void analyticsService.trackGameLaunched()
    }
    return result
  })
  ipcMain.handle(ipcChannels.listSaves, () => saveManagerService.listSaves())
  ipcMain.handle(ipcChannels.openSavesFolder, () =>
    saveManagerService.openSavesFolder()
  )
  ipcMain.handle(ipcChannels.listSaveTrash, () =>
    saveManagerService.listTrash()
  )
  ipcMain.handle(
    ipcChannels.moveSaveToTrash,
    (_event, request: unknown) => {
      if (!isTrashSaveRequest(request)) {
        throw new Error('Invalid move to trash request.')
      }

      return saveManagerService.moveToTrash(request.fullPath)
    }
  )
  ipcMain.handle(ipcChannels.restoreSave, (_event, request: unknown) => {
    if (!isRestoreSaveRequest(request)) {
      throw new Error('Invalid restore request.')
    }

    return saveManagerService.restore(request.trashId)
  })
  ipcMain.handle(ipcChannels.getSocketables, () =>
    skullsEyesService.load()
  )
  ipcMain.handle(
    ipcChannels.saveSocketables,
    (_event, socketables: unknown) => {
      if (!isSocketableEntries(socketables)) {
        throw new Error('Invalid skulls and eyes data.')
      }

      return skullsEyesService.save(socketables)
    }
  )
  ipcMain.handle(ipcChannels.resetSocketables, () =>
    skullsEyesService.reset()
  )
  ipcMain.handle(ipcChannels.getSets, () => setsService.load())
  ipcMain.handle(ipcChannels.saveSets, (_event, sets: unknown) => {
    if (!isLogicSetSetEntries(sets)) {
      throw new Error('Invalid sets data.')
    }

    return setsService.save(sets)
  })
  ipcMain.handle(ipcChannels.resetSets, () => setsService.reset())
  ipcMain.handle(ipcChannels.getModUpdateInfo, () =>
    modUpdateService.getInfo()
  )
  ipcMain.handle(
    ipcChannels.saveManifestUrl,
    (_event, request: unknown) => {
      if (!isSaveManifestUrlRequest(request)) {
        throw new Error('Invalid manifest URL request.')
      }

      return modUpdateService.saveManifestUrl(request.manifestUrl)
    }
  )
  ipcMain.handle(ipcChannels.checkModUpdate, async () => {
    return modUpdateService.checkForUpdate()
  })
  ipcMain.handle(ipcChannels.installModUpdate, async () => {
    return modUpdateService.installUpdate()
  })
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

app.whenReady().then(async () => {
  await registerEnvironmentHandlers()
  await analyticsServiceForShutdown?.startSession()
  createApplicationMenu()
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

app.on('before-quit', (event) => {
  if (isAnalyticsShuttingDown || analyticsServiceForShutdown === null) {
    return
  }

  event.preventDefault()
  isAnalyticsShuttingDown = true
  void analyticsServiceForShutdown.shutdown().finally(() => app.exit(0))
})
