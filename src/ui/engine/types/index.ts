export interface ZActor {
  id: number
  name: string
  nickname: string
  classId: number
  initialLevel: number
  maxLevel: number
  profile: string
  face: string
  character: string
}

export interface TileSelection {
  x: number
  y: number
  w: number
  h: number
  tilesetId: string
  isAutotile: boolean
  isWall?: boolean
  pattern?: (TileSelection | null)[][]
  structure?: Partial<Record<ZLayer, (TileSelection[] | null)[][]>>
  isMultiLayer?: boolean
}

export interface ZEvent {
  id: string
  name: string
  x: number
  y: number
  graphic: TileSelection | null
  pages: unknown[]
}

export interface ZMap {
  id: number
  name: string
  width: number
  height: number
  layers: Record<
    ZLayer,
    {
      icon: string
      data: (TileSelection[] | null)[][]
      index: number
    }
  >
  events: ZEvent[]
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export abstract class ZSystem {
  onBoot(): void {
    /* Boot */
  }
  onSetup(): void {
    /* Setup */
  }
  onPreUpdate(_delta: number): void {
    /* Pre Update */
  }
  onUpdate(_delta: number): void {
    /* Update */
  }
  onPostUpdate(_delta: number): void {
    /* Post Update */
  }
  onDestroy(): void {
    /* Destroy */
  }
}

export type TileCoords = { x: number; y: number }

export enum ZTool {
  brush = 'brush',
  eraser = 'eraser',
  bucket = 'bucket',
  event = 'event',
  circle = 'circle',
  rectangle = 'rectangle',
  select = 'select'
}

export enum ZLayer {
  ground = 'ground',
  walls = 'walls',
  decoration = 'decoration',
  events = 'events',
  highest = 'highest'
}

export interface IconMap {
  uiX: number
  uiY: number
  ox: number
  oy: number
  w: number
  h: number
  tilesetId: string
  isAuto: boolean
}

export interface TileConfig {
  isSolid: boolean
  isHighPriority: boolean
  collisionMask?: boolean[] // 48x48 true/false
  sortYOffset?: number // positive = sorts lower (front), negative = sorts higher (back)
}

export type TilesetConfig = Record<string, TileConfig> // Key is tileId ("x_y") -> "0_0", "1_0" etc.
