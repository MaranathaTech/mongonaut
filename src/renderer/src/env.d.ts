/// <reference types="vite/client" />

import type { MongonautAPI } from '../../preload/index';

declare global {
  interface Window {
    api: MongonautAPI;
  }
}
