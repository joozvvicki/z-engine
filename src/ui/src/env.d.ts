/// <reference types="vite/client" />

import type { ZEngine } from '../engine/core/ZEngine'

declare global {
  interface Window {
    $zEngine: ZEngine | null
  }
}
