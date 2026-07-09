import { contextBridge, ipcRenderer } from 'electron'
import type { LogicSetApi } from '../shared/types'

const logicSetApi: LogicSetApi = {
  getAppInfo: async () => ({
    name: 'LogicSet Launcher',
    version: '0.1.0'
  }),
  devMode: {
    get: () => ipcRenderer.invoke('dev-mode:get'),
    onChanged: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, enabled: boolean) =>
        listener(enabled)
      ipcRenderer.on('dev-mode:changed', handler)
      return () => ipcRenderer.removeListener('dev-mode:changed', handler)
    }
  },
  analytics: {
    getSettings: () => ipcRenderer.invoke('analytics:get-settings'),
    setEnabled: (enabled) =>
      ipcRenderer.invoke('analytics:set-enabled', enabled)
  },
  environment: {
    loadConfig: () => ipcRenderer.invoke('environment:load-config'),
    saveConfig: (settings) =>
      ipcRenderer.invoke('environment:save-config', settings),
    validatePaths: (paths) =>
      ipcRenderer.invoke('environment:validate-paths', paths),
    browsePath: (kind) =>
      ipcRenderer.invoke('environment:browse-path', kind),
    readUdpPort: (localSettingsPath) =>
      ipcRenderer.invoke('environment:read-udp-port', localSettingsPath),
    applyUdpPort: (request) =>
      ipcRenderer.invoke('environment:apply-udp-port', request),
    launchGame: () => ipcRenderer.invoke('environment:launch-game')
  },
  saves: {
    list: () => ipcRenderer.invoke('saves:list'),
    openFolder: () => ipcRenderer.invoke('saves:open-folder'),
    listTrash: () => ipcRenderer.invoke('saves:list-trash'),
    moveToTrash: (request) =>
      ipcRenderer.invoke('saves:move-to-trash', request),
    restore: (request) => ipcRenderer.invoke('saves:restore', request)
  },
  skullsEyes: {
    getSocketables: () => ipcRenderer.invoke('skulls-eyes:get'),
    saveSocketables: (socketables) =>
      ipcRenderer.invoke('skulls-eyes:save', socketables),
    resetSocketablesToDefaults: () =>
      ipcRenderer.invoke('skulls-eyes:reset')
  },
  sets: {
    getSets: () => ipcRenderer.invoke('sets:get'),
    saveSets: (sets) => ipcRenderer.invoke('sets:save', sets),
    resetSetsToDefaults: () => ipcRenderer.invoke('sets:reset')
  },
  bosses: {
    getBosses: () => ipcRenderer.invoke('bosses:get'),
    saveBosses: (bosses) => ipcRenderer.invoke('bosses:save', bosses),
    resetBossesToDefaults: () => ipcRenderer.invoke('bosses:reset')
  },
  modUpdate: {
    getInfo: () => ipcRenderer.invoke('mod-update:get-info'),
    saveManifestUrl: (request) =>
      ipcRenderer.invoke('mod-update:save-manifest-url', request),
    check: () => ipcRenderer.invoke('mod-update:check'),
    install: () => ipcRenderer.invoke('mod-update:install')
  },
  patchNotes: {
    get: () => ipcRenderer.invoke('patch-notes:get'),
    browseImage: () => ipcRenderer.invoke('patch-notes:browse-image'),
    save: (entries) => ipcRenderer.invoke('patch-notes:save', entries)
  }
}

contextBridge.exposeInMainWorld('logicSet', logicSetApi)
