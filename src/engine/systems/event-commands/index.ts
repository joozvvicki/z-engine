import { ZCommandCode, ZCommandProcessor } from '@engine/types'
import { commandShowMessage } from './ShowMessage'
import { commandControlSwitch } from './ControlSwitch'
import { commandControlVariable } from './ControlVariable'
import { commandControlSelfSwitch } from './ControlSelfSwitch'
import { commandConditionalBranch, commandElse } from './ConditionalBranch'
import { commandTransferPlayer } from './TransferPlayer'
import { commandSetMoveRoute } from './SetMoveRoute'
import { commandWait } from './Wait'
import { commandSetEventDirection } from './SetEventDirection'
import { commandSetEventGraphic } from './SetEventGraphic'
import { commandShowChoices, commandWhen } from './ShowChoices'
import { commandPlayBGM, commandFadeOutBGM, commandPlaySE, commandStopSE } from './AudioCommands'

export const CommandRegistry: Record<number, ZCommandProcessor> = {
  [ZCommandCode.ShowMessage]: commandShowMessage,
  [ZCommandCode.ControlSwitch]: commandControlSwitch,
  [ZCommandCode.ControlVariable]: commandControlVariable,
  [ZCommandCode.ControlSelfSwitch]: commandControlSelfSwitch,
  [ZCommandCode.ConditionalBranch]: commandConditionalBranch,
  [ZCommandCode.Else]: commandElse,
  [ZCommandCode.EndBranch]: () => 'continue',
  [ZCommandCode.TransferPlayer]: commandTransferPlayer,
  [ZCommandCode.SetMoveRoute]: commandSetMoveRoute,
  [ZCommandCode.Wait]: commandWait,
  [ZCommandCode.SetEventDirection]: commandSetEventDirection,
  [ZCommandCode.SetEventGraphic]: commandSetEventGraphic,
  [ZCommandCode.ShowChoices]: commandShowChoices,
  [ZCommandCode.When]: commandWhen,
  [ZCommandCode.EndChoices]: () => 'continue',
  [ZCommandCode.ShowAnimation]: () => 'continue', // TODO: Implement

  // Audio
  [ZCommandCode.PlayBGM]: commandPlayBGM,
  [ZCommandCode.FadeOutBGM]: commandFadeOutBGM,
  [ZCommandCode.PlaySE]: commandPlaySE,
  [ZCommandCode.StopSE]: commandStopSE
}
