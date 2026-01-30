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

export interface ZEventGraphic {
  assetId: string
  group: 'tile' | 'character'
  x: number // Grid X or Frame Index
  y: number // Grid Y or Row Index
  w: number // Width in Cells or Frames
  h: number // Height in Cells or Frames
  // Optional pixel overrides for rendering source
  srcX?: number
  srcY?: number
  srcW?: number
  srcH?: number
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
  graphic: ZEventGraphic | null
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
  isHighPriority: boolean
  dirBlock: number
  collisionMask?: boolean[]
  sortYOffset?: number
}

export type TilesetConfig = Record<string, TileConfig>

export enum ZCommandCode {
  ShowMessage = 101,
  ShowChoices = 102,
  ConditionalBranch = 111,
  ControlSwitch = 121,
  ControlVariable = 122,
  TransferPlayer = 201,
  Else = 411,
  EndBranch = 412,
  When = 402,
  EndChoices = 404
}

export type ZCommandResult = 'continue' | 'wait' | 'stop'

export interface ZCommandProcessor {
  (params: unknown[]): ZCommandResult
}

export interface ZTileDelta {
  x: number
  y: number
  layer: ZLayer
  oldStack: TileSelection[] | null
  newStack: TileSelection[] | null
}

export interface ZHistoryEntry {
  id: string
  label: string
  deltas: ZTileDelta[]
}

export interface ZDataProvider {
  getMap(id: number): Promise<ZMap | null>
  getTilesetConfigs(): Promise<Record<string, TilesetConfig>> // URL-indexed
  getTilesetUrl(slotId: string): string // Resolver for slotId -> default URL
  setTileAt(
    x: number,
    y: number,
    tile: TileSelection | null,
    isStacking: boolean,
    layer: ZLayer
  ): void
  resolveAssetUrl(path: string): string
}

export enum ZEngineSignal {
  PlayerMoved = 'player:moved',
  MapLoaded = 'map:loaded',
  EventTriggered = 'event:triggered',
  InteractionRequested = 'interaction:requested',
  ShowMessage = 'ui:show-message',
  ShowChoices = 'ui:show-choices',
  ChoiceSelected = 'ui:choice-selected',
  MessageClosed = 'ui:message-closed',
  GameStateChanged = 'state:changed'
}

export interface ZSignalData {
  [ZEngineSignal.PlayerMoved]: { x: number; y: number; prevX: number; prevY: number }
  [ZEngineSignal.MapLoaded]: { mapId: number; map: ZMap }
  [ZEngineSignal.EventTriggered]: { event: ZEvent; trigger: ZEventTrigger }
  [ZEngineSignal.InteractionRequested]: { x: number; y: number }
  [ZEngineSignal.ShowMessage]: { text: string }
  [ZEngineSignal.ShowChoices]: { choices: string[] }
  [ZEngineSignal.ChoiceSelected]: { index: number }
  [ZEngineSignal.MessageClosed]: Record<string, never>
  [ZEngineSignal.GameStateChanged]: {
    type: 'switch' | 'variable' | 'load' | 'new'
    id?: number
    value?: boolean | number
  }
}
