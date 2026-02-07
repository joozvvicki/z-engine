import { ZCommandCode, ZCommandProcessor } from '@engine/types'
import { commandShowMessage } from './messages/ShowMessage'
import { commandShowChoices, commandWhen } from './messages/ShowChoices'
import { commandControlSwitch } from './state/ControlSwitch'
import { commandControlVariable } from './state/ControlVariable'
import { commandControlSelfSwitch } from './state/ControlSelfSwitch'
import { commandConditionalBranch, commandElse } from './flow/ConditionalBranch'
import { commandWait } from './flow/Wait'
import { commandTransferPlayer } from './movement/TransferPlayer'
import { commandSetMoveRoute } from './movement/SetMoveRoute'
import { commandSetEventDirection } from './movement/SetEventDirection'
import { commandSetEventGraphic } from './visuals/SetEventGraphic'
import {
  commandPlayBGM,
  commandFadeOutBGM,
  commandPlayBGS,
  commandFadeOutBGS,
  commandPlaySE,
  commandStopSE
} from './audio/AudioCommands'

import { commandLoop, commandEndLoop, commandBreakLoop } from './flow/Loop'

export const CommandRegistry: Record<number, ZCommandProcessor> = {
  [ZCommandCode.ShowMessage]: commandShowMessage,
  [ZCommandCode.ShowChoices]: commandShowChoices,
  [ZCommandCode.When]: commandWhen,
  [ZCommandCode.EndChoices]: () => 'continue',

  [ZCommandCode.ControlSwitch]: commandControlSwitch,
  [ZCommandCode.ControlVariable]: commandControlVariable,
  [ZCommandCode.ControlSelfSwitch]: commandControlSelfSwitch,

  [ZCommandCode.ConditionalBranch]: commandConditionalBranch,
  [ZCommandCode.Else]: commandElse,
  [ZCommandCode.EndBranch]: () => 'continue',
  [ZCommandCode.Wait]: commandWait,

  [ZCommandCode.Loop]: commandLoop,
  [ZCommandCode.EndLoop]: commandEndLoop,
  [ZCommandCode.BreakLoop]: commandBreakLoop,

  [ZCommandCode.TransferPlayer]: commandTransferPlayer,
  [ZCommandCode.SetMoveRoute]: commandSetMoveRoute,
  [ZCommandCode.SetEventDirection]: commandSetEventDirection,

  [ZCommandCode.SetEventGraphic]: commandSetEventGraphic,
  [ZCommandCode.ShowAnimation]: () => 'continue', // TODO: Implement

  [ZCommandCode.PlayBGM]: commandPlayBGM,
  [ZCommandCode.FadeOutBGM]: commandFadeOutBGM,
  [ZCommandCode.PlayBGS]: commandPlayBGS,
  [ZCommandCode.FadeOutBGS]: commandFadeOutBGS,
  [ZCommandCode.PlaySE]: commandPlaySE,
  [ZCommandCode.StopSE]: commandStopSE
}
