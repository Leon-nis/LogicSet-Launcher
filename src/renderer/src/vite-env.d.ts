/// <reference types="vite/client" />

import type { LogicSetApi } from '../../shared/types'

declare global {
  interface Window {
    readonly logicSet: LogicSetApi
  }
}

export {}
