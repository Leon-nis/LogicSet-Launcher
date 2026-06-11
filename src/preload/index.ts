import { contextBridge, ipcRenderer } from 'electron'
import type { LogicSetApi } from '../shared/types'

const logicSetApi: LogicSetApi = {
  getAppInfo: async () => ({
    name: 'LogicSet Launcher',
    version: '0.1.0'
  }),
  analytics: {
    getSettings: () => ipcRenderer.invoke('analytics:get-settings'),
    setEnabled: (enabled) =>
      ipcRenderer.invoke('analytics:set-enabled', enabled),
    trackEvent: (event, properties) =>
      ipcRenderer.invoke('analytics:track-event', event, properties)
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
  modUpdate: {
    getInfo: () => ipcRenderer.invoke('mod-update:get-info'),
    saveManifestUrl: (request) =>
      ipcRenderer.invoke('mod-update:save-manifest-url', request),
    check: () => ipcRenderer.invoke('mod-update:check'),
    install: () => ipcRenderer.invoke('mod-update:install')
  }
}

contextBridge.exposeInMainWorld('logicSet', logicSetApi)
