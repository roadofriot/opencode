import type { ElectronAPI } from "../preload/types"

declare global {
  interface Window {
    api: ElectronAPI
    __MINDSQARQ__?: {
      deepLinks?: string[]
    }
  }
}
