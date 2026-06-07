import { contextBridge } from 'electron'
import type { LogicSetApi } from '../shared/types'

const logicSetApi: LogicSetApi = {
  getAppInfo: async () => ({
    name: 'LogicSet Launcher',
    version: '0.1.0'
  })
}

contextBridge.exposeInMainWorld('logicSet', logicSetApi)
