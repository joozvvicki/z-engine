import { Application } from '@engine/utils/pixi.js'
import { ZEventBus } from '@engine/core'
import {
  GameStateManager,
  InputManager,
  MapManager,
  SceneManager,
  TextureManager,
  TilesetManager
} from '@engine/managers'
import { AudioManager } from '@engine/managers/AudioManager'
import type { SaveManager } from '@engine/managers/SaveManager'
import {
  EntityRenderSystem,
  GhostSystem,
  GridSystem,
  PlayerSystem,
  RenderSystem,
  TransitionSystem
} from '@engine/systems'

export interface ZDatabaseEntry {
  id: number
  name: string
  description?: string
  note?: string
}

export enum ZTraitCode {
  // Rates
  ElementRate = 11,
  DebuffRate = 12,
  StateRate = 13,
  StateResist = 14,
  // Params
  Param = 21,
  XParam = 22,
  SParam = 23,
  // Attack
  AttackElement = 31,
  AttackState = 32,
  AttackSpeed = 33,
  AttackTimes = 34,
  // Skills
  AddSkillType = 41,
  SealSkillType = 42,
  AddSkill = 43,
  SealSkill = 44,
  // Equip
  EquipWeapon = 51,
  EquipArmor = 52,
  LockEquip = 53,
  SealEquip = 54,
  SlotType = 55,
  // Other
  ActionTimes = 61,
  SpecialFlag = 62,
  CollapseEffect = 63,
  PartyAbility = 64
}

export interface ZTrait {
  code: ZTraitCode
  dataId: number
  value: number
}

export interface ZClassLearning {
  level: number
  skillId: number
}

export interface ZClass extends ZDatabaseEntry {
  nickname?: string
  params: number[] // [MHP, MMP, ATK, DEF, MAT, MDF, AGI, LUK]
  traits: ZTrait[]
  learnings: ZClassLearning[]
  expCurve: number // 0-4 = presets, 5 = custom
  expParams?: { base: number; extra: number; acceleration: number } // For custom curve
}

export interface ZSkillEffect {
  code: number // 11=HP Damage, 12=MP Damage, 13=HP Recover, 14=MP Recover, 21=Add State, 22=Remove State, 31=Add Buff, 32=Add Debuff
  dataId: number // State ID or param ID
  value1: number // Formula base or turns
  value2: number // Variance or chance
}

export interface ZSkill extends ZDatabaseEntry {
  icon?: string
  mpCost: number
  tpCost: number
  scope: number // 0=None, 1=1 Enemy, 2=All Enemies, 7=1 Ally, 11=All Allies
  occasion: number // 0=Always, 1=Battle, 2=Menu, 3=Never
  hitType: number // 0=Certain, 1=Physical, 2=Magical
  effects: ZSkillEffect[]
}

export interface ZItem extends ZDatabaseEntry {
  icon?: string
  price: number
  consumable: boolean
  target: number
  effects: ZSkillEffect[]
}

export interface ZWeapon extends ZDatabaseEntry {
  icon?: string
  price: number
  params: number[]
  wtypeId?: number
  description?: string
  animationId?: number
}

export interface ZArmor extends ZDatabaseEntry {
  icon?: string
  price: number
  params: number[]
  etypeId?: number // Equipment Type ID (Shield, Head, Body, etc)
  description?: string
}

export interface ZEnemyDropItem {
  itemId: number
  kind: number // 1=Item, 2=Weapon, 3=Armor
  denominator: number // Drop rate: 1/denominator (e.g., 1/2 = 50%, 1/10 = 10%)
}

export interface ZEnemyAction {
  skillId: number
  conditionType: number // 0=Always, 1=Turn, 2=HP%, 3=MP%, 4=State, 5=Party Level, 6=Switch
  conditionParam1: number
  conditionParam2: number
  rating: number // Priority weight (higher = more likely)
}

export interface ZEnemy extends ZDatabaseEntry {
  mhp: number
  mmp: number
  atk: number
  def: number
  mat: number
  mdf: number
  agi: number
  luk: number
  exp: number
  gold: number
  battlerName?: string
  dropItems: ZEnemyDropItem[]
  actions: ZEnemyAction[]
}

export interface ZActor extends ZDatabaseEntry {
  nickname: string
  classId: number
  initialLevel: number
  maxLevel: number
  profile: string
  face: string
  faceX: number
  faceY: number
  faceSrcX?: number
  faceSrcY?: number
  faceSrcW?: number
  faceSrcH?: number
  character: string
  characterX: number
  characterY: number
  characterSrcX?: number
  characterSrcY?: number
  characterSrcW?: number
  characterSrcH?: number
  baseParams: number[] // Level-independent bonuses
  traits: ZTrait[]
}

export interface ZAudioConfig {
  name: string
  volume: number
  pitch: number
}

export interface ZSystemData {
  switches: string[]
  variables: string[]
  startMapId: number
  startX: number
  startY: number
  screenWidth: number
  screenHeight: number
  screenZoom: number
  projectName: string
  version: string
  startingParty: number[]
  sounds: {
    cursor: ZAudioConfig
    ok: ZAudioConfig
    cancel: ZAudioConfig
    buzzer: ZAudioConfig
    save: ZAudioConfig
    load: ZAudioConfig
    titleBGM: ZAudioConfig
    battleBGM: ZAudioConfig
  }
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
  divW?: number
  divH?: number
}

export interface ZEvent {
  id: string
  name: string
  x: number
  y: number
  isThrough?: boolean // Runtime collision override
  pages: ZEventPage[]
}

export interface ZEventPage {
  id: string
  conditions: ZEventCondition
  graphic: ZEventGraphic | null
  trigger: ZEventTrigger
  moveType: 'fixed' | 'random' | 'approach' | 'custom'
  moveSpeed: number
  moveFrequency: number
  moveRoute: ZMoveCommand[]
  moveRouteRepeat: boolean
  moveRouteSkip: boolean
  moveRouteIndex?: number
  isThrough?: boolean
  options: ZEventOptions
  list: ZEventCommand[]
}

export interface ZEventCondition {
  switch1Id?: string
  switch2Id?: string
  variableId?: string
  variableValue?: number
  variableOp?: number // 0: >=, 1: <=, 2: >, 3: <, 4: ==, 5: !=
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

export enum ZMoveCode {
  MOVE_DOWN = 'MOVE_DOWN',
  MOVE_LEFT = 'MOVE_LEFT',
  MOVE_RIGHT = 'MOVE_RIGHT',
  MOVE_UP = 'MOVE_UP',
  MOVE_LOWER_LEFT = 'MOVE_LOWER_LEFT',
  MOVE_LOWER_RIGHT = 'MOVE_LOWER_RIGHT',
  MOVE_UPPER_LEFT = 'MOVE_UPPER_LEFT',
  MOVE_UPPER_RIGHT = 'MOVE_UPPER_RIGHT',
  MOVE_RANDOM = 'MOVE_RANDOM',
  MOVE_TOWARD_PLAYER = 'MOVE_TOWARD_PLAYER',
  MOVE_AWAY_PLAYER = 'MOVE_AWAY_PLAYER',
  STEP_FORWARD = 'STEP_FORWARD',
  STEP_BACKWARD = 'STEP_BACKWARD',
  JUMP = 'JUMP',
  WAIT = 'WAIT',
  TURN_DOWN = 'TURN_DOWN',
  TURN_LEFT = 'TURN_LEFT',
  TURN_RIGHT = 'TURN_RIGHT',
  TURN_UP = 'TURN_UP',
  TURN_90_RIGHT = 'TURN_90_RIGHT',
  TURN_90_LEFT = 'TURN_90_LEFT',
  TURN_180 = 'TURN_180',
  TURN_90_RIGHT_LEFT = 'TURN_90_RIGHT_LEFT',
  TURN_RANDOM = 'TURN_RANDOM',
  TURN_TOWARD_PLAYER = 'TURN_TOWARD_PLAYER',
  TURN_AWAY_PLAYER = 'TURN_AWAY_PLAYER',
  SPEED = 'SPEED',
  FREQUENCY = 'FREQUENCY',
  WALK_ANIM_ON = 'WALK_ANIM_ON',
  WALK_ANIM_OFF = 'WALK_ANIM_OFF',
  STEP_ANIM_ON = 'STEP_ANIM_ON',
  STEP_ANIM_OFF = 'STEP_ANIM_OFF',
  DIR_FIX_ON = 'DIR_FIX_ON',
  DIR_FIX_OFF = 'DIR_FIX_OFF',
  THROUGH_ON = 'THROUGH_ON',
  THROUGH_OFF = 'THROUGH_OFF',
  TRANSPARENT_ON = 'TRANSPARENT_ON',
  TRANSPARENT_OFF = 'TRANSPARENT_OFF',
  CHANGE_GRAPHIC = 'CHANGE_GRAPHIC',
  CHANGE_OPACITY = 'CHANGE_OPACITY',
  CHANGE_BLEND = 'CHANGE_BLEND',
  PLAY_SE = 'PLAY_SE',
  SCRIPT = 'SCRIPT'
}

export interface ZMoveCommand {
  code: ZMoveCode | string // Allow string for flexibility during transition
  params?: unknown[]
}

export interface ZMoveable {
  id: string
  x: number
  y: number
  direction: 'down' | 'left' | 'right' | 'up'
  isMoving: boolean
  moveSpeed: number
  moveFrequency: number
  moveRoute: ZMoveCommand[]
  moveRouteIndex: number
  moveRouteRepeat: boolean
  moveRouteSkip: boolean
  moveType: 'fixed' | 'random' | 'approach' | 'custom'
  isThrough: boolean
  waitTimer: number

  startX?: number
  startY?: number
  targetX?: number
  targetY?: number
  realX?: number
  realY?: number

  walkAnim?: boolean
  stepAnim?: boolean
  directionFix?: boolean
  opacity?: number
  transparent?: boolean
}

export interface ZEventRuntimeState extends ZMoveable {
  eventId: string
  realX: number
  realY: number
}

export interface ZMap {
  id: number
  name: string
  width: number
  height: number
  tileWidth?: number
  tileHeight?: number
  layers: Record<
    ZLayer,
    {
      icon: string
      data: (TileSelection[] | null)[][]
      index: number
    }
  >
  events: ZEvent[]
  tilesetConfig: Record<string, string>
  displayName?: string
  bgm?: ZAudioConfig
  bgs?: ZAudioConfig
  parallax?: {
    name: string
    loopX: boolean
    loopY: boolean
    scrollX: number
    scrollY: number
  }
  note?: string
  disableAutoshadow?: boolean
}

export interface ZMapInfo {
  id: number
  name: string
  parentId: number
  order: number
  expanded?: boolean
  isFolder?: boolean
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
  Loop = 112,
  BreakLoop = 113,
  ControlSwitch = 121,
  ControlVariable = 122,
  ControlSelfSwitch = 123,
  TransferPlayer = 201,
  SetMoveRoute = 205,
  ShowAnimation = 212,
  Else = 411,
  EndBranch = 412,
  When = 402,
  EndChoices = 404,
  SetEventDirection = 213,
  SetEventGraphic = 214,
  Wait = 230,
  PlayBGM = 241,
  FadeOutBGM = 242,
  PlayBGS = 245,
  FadeOutBGS = 246,
  PlayME = 249,
  PlaySE = 250,
  StopSE = 251,

  // Message extension
  ShowMakeText = 1011,
  ShowScrollingText = 105,

  // Game Flow
  ControlTimer = 124,

  // Map / Scene
  GetLocationInfo = 202,
  ScrollMap = 204,

  // Character
  ShowBalloonIcon = 215,
  EraseEvent = 216,

  // Screen/Picture
  ShowPicture = 231,
  MovePicture = 232,
  RotatePicture = 233,
  TintPicture = 234,
  ErasePicture = 235
}

export type ZCommandResult = 'continue' | 'wait' | 'stop'

export interface IEngineContext {
  app: Application
  systemData: ZSystemData | null
  textures: TextureManager
  tilesets: TilesetManager
  renderer: RenderSystem
  player: PlayerSystem
  entities: EntityRenderSystem
  grid: GridSystem
  ghost: GhostSystem
  scenes: SceneManager
  audio: AudioManager
  input: InputManager
  gameState: GameStateManager
  eventBus: ZEventBus
  map: MapManager
  dataProvider: ZDataProvider | null
  transitions: TransitionSystem
  save: SaveManager
  config: { mode: 'play' | 'edit' }
}

export interface ZEventInterpreter {
  list: ZEventCommand[]
  index: number
  eventId: string
  waitCount?: number
  waitingForMoveEventId?: string | null
  isWaitingForMessage?: boolean
  pendingChoice?: number
}

export interface ZCommandProcessor {
  (params: unknown[], interpreter: ZEventInterpreter, services: IEngineContext): ZCommandResult
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

export interface GameSaveFile {
  header: {
    timestamp: number
    playtime: number
    version: string
  }
  player: {
    x: number
    y: number
    direction: string
    mapId: number
    transparent: boolean
  }
  system: {
    switches: Record<number, boolean>
    variables: Record<number, number>
    selfSwitches: Record<string, boolean>
    party: any // Serialized Party
    actors: any // Serialized Actors
  }
}

export interface ZDataProvider {
  getMap(id: number): Promise<ZMap | null>
  getTilesetConfigs(): Promise<Record<string, TilesetConfig>> // URL-indexed
  getSystemData(): Promise<ZSystemData>
  getTilesetUrl(slotId: string): string // Resolver for slotId -> default URL
  setTileAt(
    x: number,
    y: number,
    tile: TileSelection | null,
    isStacking: boolean,
    layer: ZLayer
  ): void
  resolveAssetUrl(path: string): string

  // Persistence
  saveGame(slotId: number, data: GameSaveFile): Promise<void>
  loadGame(slotId: number): Promise<GameSaveFile | null>
  doesSaveExist(slotId: number): Promise<boolean>
}

export enum ZEngineSignal {
  PlayerMoved = 'player:moved',
  MapWillLoad = 'map:will-load',
  MapLoaded = 'map:loaded',
  MapLoadFailed = 'map:load-failed',
  EventTriggered = 'event:triggered',
  InteractionRequested = 'interaction:requested',
  ShowMessage = 'ui:show-message',
  ShowChoices = 'ui:show-choices',
  ChoiceSelected = 'ui:choice-selected',
  MessageClosed = 'ui:message-closed',
  MessageCloseDirective = 'ui:message-close-directive',
  GameStateChanged = 'state:changed',
  EventInternalStateChanged = 'event:internal-state',
  EventExecutionStarted = 'event:execution-started',
  EventExecutionFinished = 'event:execution-finished',
  MoveRouteFinished = 'event:move-route-finished',
  MenuRequested = 'ui:menu-requested',
  MenuClosed = 'ui:menu-closed',
  SceneTransitionStarted = 'scene:transition-started',
  SceneTransitionFinished = 'scene:transition-finished'
}

export interface ZMenuParams {
  mapOrId: ZMap | number
  playerX: number
  playerY: number
  direction: string
}

export interface ZSignalData {
  [ZEngineSignal.PlayerMoved]: { x: number; y: number; prevX: number; prevY: number }
  [ZEngineSignal.MapWillLoad]: { mapId: number; map: ZMap }
  [ZEngineSignal.MapLoaded]: { mapId: number; map: ZMap }
  [ZEngineSignal.MapLoadFailed]: { mapId: number; error: Error }
  [ZEngineSignal.EventTriggered]: { event: ZEvent; trigger: ZEventTrigger }
  [ZEngineSignal.InteractionRequested]: { x: number; y: number }
  [ZEngineSignal.ShowMessage]: { text: string; style?: number; target?: number | string }
  [ZEngineSignal.ShowChoices]: { choices: string[]; style?: number; target?: number | string }
  [ZEngineSignal.ChoiceSelected]: { index: number }
  [ZEngineSignal.MessageClosed]: Record<string, never>
  [ZEngineSignal.MessageCloseDirective]: Record<string, never>
  [ZEngineSignal.GameStateChanged]: {
    type: 'switch' | 'variable' | 'load' | 'new'
    id?: number
    value?: boolean | number
  }
  [ZEngineSignal.EventInternalStateChanged]: {
    eventId: string
    direction?: 'down' | 'left' | 'right' | 'up'
    graphic?: ZEventGraphic | null
    moveType?: 'fixed' | 'random' | 'approach' | 'custom'
    moveSpeed?: number
    moveFrequency?: number
    moveRoute?: ZMoveCommand[]
    moveRouteRepeat?: boolean
    moveRouteSkip?: boolean
    isThrough?: boolean
    walkAnim?: boolean
    stepAnim?: boolean
    directionFix?: boolean
    trigger?: ZEventTrigger
    opacity?: number
    transparent?: boolean
  }
  [ZEngineSignal.EventExecutionStarted]: {
    eventId: string
    triggererPos?: { x: number; y: number }
  }
  [ZEngineSignal.EventExecutionFinished]: { eventId: string }
  [ZEngineSignal.MoveRouteFinished]: { eventId: string }
  [ZEngineSignal.MenuRequested]: ZMenuParams
  [ZEngineSignal.MenuClosed]: Record<string, never>
  [ZEngineSignal.SceneTransitionStarted]: Record<string, never>
  [ZEngineSignal.SceneTransitionFinished]: Record<string, never>
}

export enum ZInputAction {
  OK = 'OK',
  CANCEL = 'CANCEL',
  MENU = 'MENU',
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  RUN = 'RUN',
  DEBUG = 'DEBUG',
  NOCLIP = 'NOCLIP'
}

export interface ZInputMap {
  keyboard: Record<string, ZInputAction>
  gamepad: Record<number, ZInputAction> // Button Index -> Action
}
