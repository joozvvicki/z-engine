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
  // Optional pixel-based overrides for custom sized events/objects
  pixelX?: number
  pixelY?: number
  pixelW?: number
  pixelH?: number
}

export interface ZEvent {
  id: string
  name: string
  x: number
  y: number
  pages: ZEventPage[]
}

export interface ZEventPage {
  id: string
  conditions: ZEventCondition
  graphic: TileSelection | null
  trigger: ZEventTrigger
  options: ZEventOptions
  list: ZEventCommand[]
}

export interface ZEventCondition {
  switch1Id?: string
  switch2Id?: string
  variableId?: string
  variableValue?: number
  selfSwitchCh?: string // 'A', 'B', 'C', 'D'
  item?: string
  actor?: string
}

export enum ZEventTrigger {
  Action = 0,
  PlayerTouch = 1,
  EventTouch = 2,
  Autorun = 3,
  Parallel = 4
}

export interface ZEventOptions {
  moveRoute: unknown // Placeholder for future Move Route definition
  walkAnim: boolean
  stepAnim: boolean
  directionFix: boolean
  through: boolean
}

export interface ZEventCommand {
  code: number
  parameters: unknown[]
  indent?: number
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
  tilesetConfig: Record<string, string> // Map slot (A1, B, etc) to URL
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
  url: string
  isAuto: boolean
}

export interface TileConfig {
  isSolid: boolean
  collisionMask?: boolean[] // 48x48 true/false
  sortYOffset?: number // positive = sorts lower (front), negative = sorts higher (back)
}

export type TilesetConfig = Record<string, TileConfig> // Key is tileId ("x_y") -> "0_0", "1_0" etc.

export enum ZCommandCode {
  TransferPlayer = 201
}
