import { contextBridge, ipcRenderer } from 'electron'
import type { LogicSetApi } from '../shared/types'

const logicSetApi: LogicSetApi = {
  getAppInfo: async () => ({
    name: 'LogicSet Launcher',
    version: '0.1.0'
  }),
  environment: {
    loadConfig: () => ipcRenderer.invoke('environment:load-config'),
    saveConfig: (settings) =>
      ipcRenderer.invoke('environment:save-config', settings),
    validatePaths: (paths) =>
      ipcRenderer.invoke('environment:validate-paths', paths),
    browsePath: (kind) =>
      ipcRenderer.invoke('environment:browse-path', kind)
  }
}

contextBridge.exposeInMainWorld('logicSet', logicSetApi)
