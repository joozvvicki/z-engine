import {
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconChevronDownLeft,
  IconChevronDownRight,
  IconChevronUpLeft,
  IconChevronUpRight,
  IconRefresh,
  IconUser,
  IconBolt,
  IconHourglass,
  IconClock,
  IconWalk,
  IconShoe,
  IconLock,
  IconGhost,
  IconEyeOff,
  IconEye,
  IconPhoto,
  IconBox,
  IconVolume,
  IconCode,
  IconMessage,
  IconList,
  IconSettings,
  IconVariable,
  IconMapPin,
  IconFlare,
  IconMusic,
  IconSun,
  IconX
} from '@tabler/icons-vue'
import { ZMoveCode, ZCommandCode } from '@engine/types'

export const variableOps = [
  { label: 'Set (=)', value: 0 },
  { label: 'Add (+)', value: 1 },
  { label: 'Sub (-)', value: 2 },
  { label: 'Mul (*)', value: 3 },
  { label: 'Div (/)', value: 4 },
  { label: 'Mod (%)', value: 5 }
]

export const directions = [
  { label: 'Down', value: 2, icon: IconArrowDown },
  { label: 'Left', value: 4, icon: IconArrowLeft },
  { label: 'Right', value: 6, icon: IconArrowRight },
  { label: 'Up', value: 8, icon: IconArrowUp }
]

export const directionsList = directions.map((d) => ({ val: d.value, label: d.label }))

export const speedsList = [
  { val: 1, label: '1: Slowest' },
  { val: 2, label: '2: Slower' },
  { val: 3, label: '3: Slow' },
  { val: 4, label: '4: Normal' },
  { val: 5, label: '5: Fast' },
  { val: 6, label: '6: Fastest' }
]

export const infoTypes = [
  { val: 0, label: 'Terrain Tag' },
  { val: 1, label: 'Event ID' },
  { val: 2, label: 'Tile ID (Layer 1)' },
  { val: 3, label: 'Tile ID (Layer 2)' },
  { val: 4, label: 'Tile ID (Layer 3)' },
  { val: 5, label: 'Region ID' }
]

export const moveActions = [
  // Movement
  { code: ZMoveCode.MOVE_DOWN, label: 'Move Down', icon: IconArrowDown },
  { code: ZMoveCode.MOVE_LEFT, label: 'Move Left', icon: IconArrowLeft },
  { code: ZMoveCode.MOVE_RIGHT, label: 'Move Right', icon: IconArrowRight },
  { code: ZMoveCode.MOVE_UP, label: 'Move Up', icon: IconArrowUp },
  { code: ZMoveCode.MOVE_LOWER_LEFT, label: 'Move Lower Left', icon: IconChevronDownLeft },
  { code: ZMoveCode.MOVE_LOWER_RIGHT, label: 'Move Lower Right', icon: IconChevronDownRight },
  { code: ZMoveCode.MOVE_UPPER_LEFT, label: 'Move Upper Left', icon: IconChevronUpLeft },
  { code: ZMoveCode.MOVE_UPPER_RIGHT, label: 'Move Upper Right', icon: IconChevronUpRight },
  { code: ZMoveCode.MOVE_RANDOM, label: 'Move Random', icon: IconRefresh },
  { code: ZMoveCode.MOVE_TOWARD_PLAYER, label: 'Move Toward Player', icon: IconUser },
  { code: ZMoveCode.MOVE_AWAY_PLAYER, label: 'Move Away From Player', icon: IconUser },
  { code: ZMoveCode.STEP_FORWARD, label: 'Step Forward', icon: IconArrowDown },
  { code: ZMoveCode.STEP_BACKWARD, label: 'Step Backward', icon: IconArrowUp },
  { code: ZMoveCode.JUMP, label: 'Jump...', icon: IconBolt, paramNames: ['X Offset', 'Y Offset'] },

  // Turning
  { code: ZMoveCode.TURN_DOWN, label: 'Turn Down', icon: IconArrowDown },
  { code: ZMoveCode.TURN_LEFT, label: 'Turn Left', icon: IconArrowLeft },
  { code: ZMoveCode.TURN_RIGHT, label: 'Turn Right', icon: IconArrowRight },
  { code: ZMoveCode.TURN_UP, label: 'Turn Up', icon: IconArrowUp },
  { code: ZMoveCode.TURN_90_RIGHT, label: 'Turn 90° Right', icon: IconArrowRight },
  { code: ZMoveCode.TURN_90_LEFT, label: 'Turn 90° Left', icon: IconArrowLeft },
  { code: ZMoveCode.TURN_180, label: 'Turn 180°', icon: IconRefresh },
  { code: ZMoveCode.TURN_90_RIGHT_LEFT, label: 'Turn 90° R/L', icon: IconRefresh },
  { code: ZMoveCode.TURN_RANDOM, label: 'Turn Random', icon: IconRefresh },
  { code: ZMoveCode.TURN_TOWARD_PLAYER, label: 'Turn Toward Player', icon: IconUser },
  { code: ZMoveCode.TURN_AWAY_PLAYER, label: 'Turn Away From Player', icon: IconUser },

  // Wait
  { code: ZMoveCode.WAIT, label: 'Wait...', icon: IconHourglass, paramNames: ['Frames'] },

  // State
  { code: ZMoveCode.SPEED, label: 'Change Speed...', icon: IconBolt, paramNames: ['Speed (1-6)'] },
  {
    code: ZMoveCode.FREQUENCY,
    label: 'Change Freq...',
    icon: IconClock,
    paramNames: ['Freq (1-5)']
  },
  { code: ZMoveCode.WALK_ANIM_ON, label: 'Walk Anim ON', icon: IconWalk },
  { code: ZMoveCode.WALK_ANIM_OFF, label: 'Walk Anim OFF', icon: IconWalk },
  { code: ZMoveCode.STEP_ANIM_ON, label: 'Step Anim ON', icon: IconShoe },
  { code: ZMoveCode.STEP_ANIM_OFF, label: 'Step Anim OFF', icon: IconShoe },
  { code: ZMoveCode.DIR_FIX_ON, label: 'Dir Fix ON', icon: IconLock },
  { code: ZMoveCode.DIR_FIX_OFF, label: 'Dir Fix OFF', icon: IconLock },
  { code: ZMoveCode.THROUGH_ON, label: 'Through ON', icon: IconGhost },
  { code: ZMoveCode.THROUGH_OFF, label: 'Through OFF', icon: IconGhost },
  { code: ZMoveCode.TRANSPARENT_ON, label: 'Transparent ON', icon: IconEyeOff },
  { code: ZMoveCode.TRANSPARENT_OFF, label: 'Transparent OFF', icon: IconEye },
  {
    code: ZMoveCode.CHANGE_GRAPHIC,
    label: 'Change Graphic...',
    icon: IconPhoto,
    paramNames: ['Asset']
  },
  {
    code: ZMoveCode.CHANGE_OPACITY,
    label: 'Change Opacity...',
    icon: IconBox,
    paramNames: ['Opacity (0-255)']
  },
  {
    code: ZMoveCode.CHANGE_BLEND,
    label: 'Change Blend...',
    icon: IconBox,
    paramNames: ['Blend Mode']
  },

  // Other
  { code: ZMoveCode.PLAY_SE, label: 'Play SE...', icon: IconVolume, paramNames: ['SE File'] },
  { code: ZMoveCode.SCRIPT, label: 'Script...', icon: IconCode, paramNames: ['Script'] }
]

export const commandCategories = [
  {
    id: 'Messages',
    icon: IconMessage,
    commands: [
      { code: ZCommandCode.ShowMessage, label: 'Show Message', icon: IconMessage },
      { code: ZCommandCode.ShowChoices, label: 'Show Choices', icon: IconList }
    ]
  },
  {
    id: 'Flow',
    icon: IconSettings,
    commands: [
      { code: ZCommandCode.ConditionalBranch, label: 'Conditional Branch', icon: IconSettings },
      { code: ZCommandCode.Loop, label: 'Loop', icon: IconRefresh },
      { code: ZCommandCode.BreakLoop, label: 'Break Loop', icon: IconX },
      { code: ZCommandCode.Wait, label: 'Wait', icon: IconHourglass },
      { code: ZCommandCode.ControlTimer, label: 'Control Timer', icon: IconClock }
    ]
  },
  {
    id: 'State',
    icon: IconVariable,
    commands: [
      { code: ZCommandCode.ControlSwitch, label: 'Control Switch', icon: IconVariable },
      { code: ZCommandCode.ControlVariable, label: 'Control Variable', icon: IconVariable },
      { code: ZCommandCode.ControlSelfSwitch, label: 'Control Self Switch', icon: IconVariable }
    ]
  },
  {
    id: 'Movement',
    icon: IconMapPin,
    commands: [
      { code: ZCommandCode.TransferPlayer, label: 'Transfer Player', icon: IconMapPin },
      { code: ZCommandCode.SetEventLocation, label: 'Set Event Location', icon: IconMapPin },
      { code: ZCommandCode.SetMoveRoute, label: 'Set Move Route', icon: IconMapPin },
      { code: ZCommandCode.SetEventDirection, label: 'Change Direction', icon: IconSettings }
    ]
  },
  {
    id: 'Visuals',
    icon: IconFlare,
    commands: [
      { code: ZCommandCode.SetEventGraphic, label: 'Change Graphic', icon: IconFlare },
      { code: ZCommandCode.ShowAnimation, label: 'Show Animation', icon: IconFlare },
      { code: ZCommandCode.ShowBalloonIcon, label: 'Show Balloon', icon: IconFlare },
      { code: ZCommandCode.EraseEvent, label: 'Erase Event', icon: IconX }
    ]
  },
  {
    id: 'Audio',
    icon: IconMusic,
    commands: [
      { code: ZCommandCode.PlayBGM, label: 'Play BGM', icon: IconMusic },
      { code: ZCommandCode.FadeOutBGM, label: 'Fadeout BGM', icon: IconVolume },
      { code: ZCommandCode.PlayBGS, label: 'Play BGS', icon: IconVolume },
      { code: ZCommandCode.FadeOutBGS, label: 'Fadeout BGS', icon: IconVolume },
      { code: ZCommandCode.PlayME, label: 'Play ME', icon: IconMusic },
      { code: ZCommandCode.PlaySE, label: 'Play SE', icon: IconVolume },
      { code: ZCommandCode.StopSE, label: 'Stop SE', icon: IconVolume }
    ]
  },
  {
    id: 'Pictures',
    icon: IconPhoto,
    commands: [
      { code: ZCommandCode.ShowPicture, label: 'Show Picture', icon: IconPhoto },
      { code: ZCommandCode.MovePicture, label: 'Move Picture', icon: IconPhoto },
      { code: ZCommandCode.RotatePicture, label: 'Rotate Picture', icon: IconRefresh },
      { code: ZCommandCode.TintPicture, label: 'Tint Picture', icon: IconFlare },
      { code: ZCommandCode.ErasePicture, label: 'Erase Picture', icon: IconX }
    ]
  },
  {
    id: 'Map',
    icon: IconMapPin,
    commands: [
      { code: ZCommandCode.ScrollMap, label: 'Scroll Map', icon: IconMapPin },
      { code: ZCommandCode.GetLocationInfo, label: 'Get Location Info', icon: IconMapPin }
    ]
  },
  {
    id: 'Screen',
    icon: IconSun,
    commands: [
      { code: ZCommandCode.FadeInScreen, label: 'Fade-in Screen', icon: IconEye },
      { code: ZCommandCode.FadeOutScreen, label: 'Fade-out Screen', icon: IconEyeOff },
      { code: ZCommandCode.TintScreen, label: 'Tint Screen', icon: IconFlare },
      { code: ZCommandCode.FlashScreen, label: 'Flash Screen', icon: IconFlare },
      { code: ZCommandCode.ShakeScreen, label: 'Shake Screen', icon: IconRefresh },
      { code: ZCommandCode.SetWeather, label: 'Set Weather', icon: IconSun }
    ]
  }
]
