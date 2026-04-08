/// <reference types="vite/client" />

import type { MongoViewerAPI } from '../../preload/index'

declare global {
  interface Window {
    api: MongoViewerAPI
  }
}
