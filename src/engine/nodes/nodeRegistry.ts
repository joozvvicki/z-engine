import type { ZNodeRegistry, ZCommandCode, ZEventCommand, ZMoveCommand } from '@engine/types'
import { compileNodeBranch } from './nodeCompiler'

/**
 * Visual Scripting Node Registry
 * Maps node IDs to their definitions for the visual node editor
 */

// ==================== EVENT NODES ====================
// Entry points for event graphs

export const EventNodes: ZNodeRegistry = {
  'event.action': {
    title: 'On Action Button',
    category: 'event',
    inputs: [],
    outputs: [{ id: 'exec', label: 'Execute', type: 'execution' }],
    values: []
  },
  'event.player_touch': {
    title: 'On Player Touch',
    category: 'event',
    inputs: [],
    outputs: [{ id: 'exec', label: 'Execute', type: 'execution' }],
    values: []
  },
  'event.event_touch': {
    title: 'On Event Touch',
    category: 'event',
    inputs: [],
    outputs: [{ id: 'exec', label: 'Execute', type: 'execution' }],
    values: []
  },
  'event.autorun': {
    title: 'On Autorun',
    category: 'event',
    inputs: [],
    outputs: [{ id: 'exec', label: 'Execute', type: 'execution' }],
    values: []
  },
  'event.parallel': {
    title: 'On Parallel',
    category: 'event',
    inputs: [],
    outputs: [{ id: 'exec', label: 'Execute', type: 'execution' }],
    values: []
  }
}

// ==================== MESSAGE & CHOICE NODES ====================

export const MessageNodes: ZNodeRegistry = {
  'action.show_message': {
    title: 'Show Message',
    category: 'action',
    inputs: [{ id: 'exec', label: '', type: 'execution' }],
    outputs: [{ id: 'exec', label: '', type: 'execution' }],
    values: [
      { key: 'text', label: 'Message Text', type: 'string', required: true },
      { key: 'face', label: 'Face Graphic', type: 'graphic' },
      { key: 'faceIndex', label: 'Face Index', type: 'number', default: 0, min: 0 }
    ],
    commandCode: 101 as ZCommandCode // ShowMessage
  },
  'action.show_choices': {
    title: 'Show Choices',
    category: 'action',
    commandCode: 102 as ZCommandCode, // ShowChoices
    inputs: [{ id: 'exec', label: '', type: 'execution' }],
    outputs: [{ id: 'exec', label: 'Finish', type: 'execution' }],
    values: [
      { key: 'choices', label: 'Choices (comma separated)', type: 'string', required: true },
      {
        key: 'cancelType',
        label: 'Cancel Type (-1: Disallow, 0+: Choice Index, 6: Branch)',
        type: 'number',
        default: -1
      },
      {
        key: 'defaultType',
        label: 'Default Choice Index (-1: None)',
        type: 'number',
        default: 0
      },
      {
        key: 'positionType',
        label: 'Position (0: Left, 1: Mid, 2: Right)',
        type: 'number',
        default: 2
      },
      {
        key: 'background',
        label: 'Background (0: Win, 1: Dim, 2: Trans)',
        type: 'number',
        default: 0
      }
    ],
    getOutputs: (values: Record<string, unknown>) => {
      const choicesStr = values.choices?.toString() || ''
      const choices = choicesStr
        .split(',')
        .map((c: string) => c.trim())
        .filter((c: string) => c.length > 0)
      const cancelType = Number(values.cancelType ?? -1)

      const outputs = choices.map((choice: string, idx: number) => ({
        id: `choice_${idx}`,
        label: choice,
        type: 'execution' as const
      }))

      if (cancelType === 6) {
        outputs.push({
          id: 'cancel',
          label: 'When Cancel',
          type: 'execution' as const
        })
      }

      outputs.push({
        id: 'exec',
        label: 'Finish',
        type: 'execution' as const
      })

      return outputs
    },
    compileHandler: (node, graph, visited, baseIndent) => {
      const commands: ZEventCommand[] = []
      const choicesStr = node.values?.choices?.toString() || ''
      const choices = choicesStr
        .split(',')
        .map((c: string) => c.trim())
        .filter((c: string) => c.length > 0)

      const cancelType = Number(node.values?.cancelType ?? -1)
      const defaultType = Number(node.values?.defaultType ?? 0)
      const positionType = Number(node.values?.positionType ?? 2)
      const background = Number(node.values?.background ?? 0)

      // RPG Maker expects cancelType to be choices.length if it's a branch
      // We keep 6 as our "Magic Branch Number" in UI for now for backward compatibility with my recent edit,
      // but we should ideally use choices.length.
      const finalCancelType = cancelType === 6 ? choices.length : cancelType

      // Helper: compile nodes connected to specific output socket
      const compileOutputBranch = (outputId: string, indentInc: number = 1): ZEventCommand[] => {
        return compileNodeBranch(node.id, outputId, graph, visited, baseIndent + indentInc)
      }

      // 1. Setup command (code 102)
      commands.push({
        code: 102,
        indent: baseIndent,
        parameters: [choices, finalCancelType, defaultType, positionType, background]
      })

      // 2. Generate branch commands for each choice
      for (let i = 0; i < choices.length; i++) {
        commands.push({
          code: 402 as ZCommandCode,
          indent: baseIndent,
          parameters: [i, choices[i]]
        })

        // Compile connected nodes from this choice
        const branchCommands = compileOutputBranch(`choice_${i}`)
        commands.push(...branchCommands)
      }

      // 3. Cancel branch if enabled
      if (cancelType === 6) {
        commands.push({
          code: 403 as ZCommandCode, // When Cancel
          indent: baseIndent,
          parameters: []
        })

        // Compile cancel branch
        const cancelCommands = compileOutputBranch('cancel')
        commands.push(...cancelCommands)
      }

      // 4. Branch end (code 404)
      commands.push({
        code: 404 as ZCommandCode,
        indent: baseIndent,
        parameters: []
      })

      // 5. Continuation flow (Then)
      const followUpCommands = compileOutputBranch('exec', 0)
      commands.push(...followUpCommands)

      return commands
    }
  },
  'action.move_route': {
    title: 'Set Move Route',
    category: 'action',
    commandCode: 205 as ZCommandCode,
    inputs: [{ id: 'exec', label: '', type: 'execution' }],
    outputs: [{ id: 'exec', label: 'Finish', type: 'execution' }],
    values: [
      {
        key: 'target',
        label: 'Target Character',
        type: 'select',
        options: [
          { value: -1, label: 'Player' },
          { value: 0, label: 'This Event' },
          { value: 1, label: 'Specific Event ID' }
        ],
        default: 0
      },
      {
        key: 'characterId',
        label: 'Event ID',
        type: 'number',
        default: 1,
        visible: (v) => v['target'] === 1
      },
      { key: 'repeat', label: 'Repeat', type: 'boolean', default: false },
      { key: 'wait', label: 'Wait for Completion', type: 'boolean', default: true },
      { key: 'through', label: 'Through Mode', type: 'boolean', default: false },
      {
        key: 'commands',
        label: 'Move Commands (List)',
        type: 'move_route',
        default: []
      }
    ],
    width: 340,
    compileHandler: (node, graph, visited, baseIndent) => {
      const target = Number(node.values?.target ?? 0)
      const charId = target === 1 ? Number(node.values?.characterId ?? 1) : target
      const repeat = !!node.values?.repeat
      const wait = !!node.values?.wait
      const through = !!node.values?.through
      const moveList = (node.values?.commands as ZMoveCommand[]) || []

      // Prepare commands for the engine.
      // Ensure they all have at least empty params if undefined.
      const processedMoveList = moveList.map((m) => ({
        code: m.code,
        params: m.params || []
      }))

      // RPG Maker move routes usually end with a code 0 command
      processedMoveList.push({ code: '0', params: [] })

      // RPG Maker 205 structure (from MovementParams.vue):
      // [target, list, wait, repeat, through]
      const command: ZEventCommand = {
        code: 205,
        indent: baseIndent,
        parameters: [charId, processedMoveList, wait, repeat, through]
      }

      const nextIndent = baseIndent
      const branchCommands = compileNodeBranch(node.id, 'exec', graph, visited, nextIndent)

      return [command, ...branchCommands]
    }
  }
}

// ==================== FLOW CONTROL NODES ====================

export const FlowNodes: ZNodeRegistry = {
  'flow.if': {
    title: 'If Condition',
    category: 'flow',
    commandCode: 111 as ZCommandCode, // ConditionalBranch
    inputs: [{ id: 'exec', label: '', type: 'execution' }],
    outputs: [
      { id: 'true', label: 'True', type: 'execution' },
      { id: 'false', label: 'False', type: 'execution' },
      { id: 'exec', label: 'Finish', type: 'execution' }
    ],
    values: [
      {
        key: 'conditionType',
        label: 'Condition Type',
        type: 'select',
        options: [
          { value: 'switch', label: 'Switch' },
          { value: 'variable', label: 'Variable' },
          { value: 'selfSwitch', label: 'Self Switch' }
        ],
        default: 'switch',
        required: true
      },
      // Switch fields
      {
        key: 'switchId',
        label: 'Switch',
        type: 'switch',
        visible: (v) => v['conditionType'] === 'switch'
      },
      {
        key: 'switchValue',
        label: 'Switch Value',
        type: 'select',
        options: [
          { value: 0, label: 'ON' },
          { value: 1, label: 'OFF' }
        ],
        default: 0,
        visible: (v) => v['conditionType'] === 'switch'
      },
      // Self Switch fields
      {
        key: 'selfSwitchId',
        label: 'Self Switch',
        type: 'select',
        options: [
          { value: 'A', label: 'A' },
          { value: 'B', label: 'B' },
          { value: 'C', label: 'C' },
          { value: 'D', label: 'D' }
        ],
        default: 'A',
        visible: (v) => v['conditionType'] === 'selfSwitch'
      },
      {
        key: 'selfSwitchValue',
        label: 'Self Switch Value',
        type: 'select',
        options: [
          { value: 0, label: 'ON' },
          { value: 1, label: 'OFF' }
        ],
        default: 0,
        visible: (v) => v['conditionType'] === 'selfSwitch'
      },
      // Variable fields
      {
        key: 'variableId',
        label: 'Variable',
        type: 'variable',
        visible: (v) => v['conditionType'] === 'variable'
      },
      {
        key: 'variableOp',
        label: 'Operator',
        type: 'select',
        options: [
          { value: 0, label: '==' },
          { value: 1, label: '≥' },
          { value: 2, label: '≤' },
          { value: 3, label: '>' },
          { value: 4, label: '<' },
          { value: 5, label: '≠' }
        ],
        default: 0,
        visible: (v) => v['conditionType'] === 'variable'
      },
      {
        key: 'operandType',
        label: 'Operand',
        type: 'select',
        options: [
          { value: 0, label: 'Constant' },
          { value: 1, label: 'Variable' }
        ],
        default: 0,
        visible: (v) => v['conditionType'] === 'variable'
      },
      {
        key: 'variableValue',
        label: 'Constant Value',
        type: 'number',
        default: 0,
        visible: (v) => v['conditionType'] === 'variable' && v['operandType'] === 0
      },
      {
        key: 'compareVariableId',
        label: 'Compare with Variable',
        type: 'variable',
        visible: (v) => v['conditionType'] === 'variable' && v['operandType'] === 1
      }
    ],
    getOutputs: () => [
      { id: 'true', label: 'True', type: 'execution' as const },
      { id: 'false', label: 'False', type: 'execution' as const },
      { id: 'exec', label: 'Finish', type: 'execution' as const }
    ],
    compileHandler: (node, graph, visited, baseIndent) => {
      const commands: ZEventCommand[] = []

      // 1. Build parameters
      const conditionType = node.values?.conditionType || 'switch'
      let params: unknown[] = []

      if (conditionType === 'switch') {
        const switchId = Number(node.values?.switchId ?? 1)
        const value = Number(node.values?.switchValue ?? 0) // 0: ON, 1: OFF
        params = [0, switchId, value]
      } else if (conditionType === 'selfSwitch') {
        const selfSwitchId = node.values?.selfSwitchId || 'A'
        const value = Number(node.values?.selfSwitchValue ?? 0) // 0: ON, 1: OFF
        params = [2, selfSwitchId, value]
      } else if (conditionType === 'variable') {
        const varId = Number(node.values?.variableId ?? 1)
        const op = Number(node.values?.variableOp ?? 0)
        const operandType = Number(node.values?.operandType ?? 0) // 0: Constant, 1: Variable
        const val =
          operandType === 0
            ? Number(node.values?.variableValue ?? 0)
            : Number(node.values?.compareVariableId ?? 1)
        params = [1, varId, operandType, val, op]
      } else {
        // Fallback for other types
        params = [0, 1, 0]
      }

      // 2. Add header
      commands.push({
        code: 111,
        indent: baseIndent,
        parameters: params
      })

      // 3. Compile True branch
      const trueCommands = compileNodeBranch(node.id, 'true', graph, visited, baseIndent + 1)
      commands.push(...trueCommands)

      // 4. Add Else marker (411) if False output is connected
      const hasElse = graph.connections.some(
        (c) => c.fromNode === node.id && c.fromSocket === 'false'
      )
      if (hasElse) {
        commands.push({
          code: 411 as ZCommandCode,
          indent: baseIndent,
          parameters: []
        })
        const falseCommands = compileNodeBranch(node.id, 'false', graph, visited, baseIndent + 1)
        commands.push(...falseCommands)
      }

      // 5. Add End marker (412)
      commands.push({
        code: 412 as ZCommandCode,
        indent: baseIndent,
        parameters: []
      })

      // 6. Continuation flow (Then)
      const followUpCommands = compileNodeBranch(node.id, 'exec', graph, visited, baseIndent)
      commands.push(...followUpCommands)

      return commands
    }
  },
  'flow.loop': {
    title: 'Loop',
    category: 'flow',
    inputs: [{ id: 'exec', label: '', type: 'execution' }],
    outputs: [
      { id: 'body', label: 'Loop Body', type: 'execution' },
      { id: 'exit', label: 'After Loop', type: 'execution' }
    ],
    values: [],
    commandCode: 112 as ZCommandCode // Loop
  },
  'flow.break': {
    title: 'Break Loop',
    category: 'flow',
    inputs: [{ id: 'exec', label: '', type: 'execution' }],
    outputs: [],
    values: [],
    commandCode: 113 as ZCommandCode // BreakLoop
  }
}

// ==================== DATA & VARIABLE NODES ====================

export const DataNodes: ZNodeRegistry = {
  'data.set_switch': {
    title: 'Set Switch',
    category: 'variable',
    inputs: [{ id: 'exec', label: '', type: 'execution' }],
    outputs: [{ id: 'exec', label: '', type: 'execution' }],
    values: [
      { key: 'switchId', label: 'Switch', type: 'switch', required: true },
      {
        key: 'value',
        label: 'Value',
        type: 'select',
        options: [
          { value: true, label: 'ON' },
          { value: false, label: 'OFF' }
        ],
        default: true
      }
    ],
    commandCode: 121 as ZCommandCode // ControlSwitch
  },
  'data.set_variable': {
    title: 'Set Variable',
    category: 'variable',
    inputs: [{ id: 'exec', label: '', type: 'execution' }],
    outputs: [{ id: 'exec', label: '', type: 'execution' }],
    values: [
      { key: 'variableId', label: 'Variable', type: 'variable', required: true },
      {
        key: 'operation',
        label: 'Operation',
        type: 'select',
        options: [
          { value: 0, label: 'Set' },
          { value: 1, label: 'Add' },
          { value: 2, label: 'Sub' },
          { value: 3, label: 'Mul' },
          { value: 4, label: 'Div' },
          { value: 5, label: 'Mod' }
        ],
        default: 0
      },
      {
        key: 'operandType',
        label: 'Operand',
        type: 'select',
        options: [
          { value: 0, label: 'Constant' },
          { value: 1, label: 'Variable' }
        ],
        default: 0
      },
      { key: 'value', label: 'Value', type: 'number', default: 0 }
    ],
    commandCode: 122 as ZCommandCode // ControlVariable
  },
  'data.set_self_switch': {
    title: 'Set Self Switch',
    category: 'variable',
    inputs: [{ id: 'exec', label: '', type: 'execution' }],
    outputs: [{ id: 'exec', label: '', type: 'execution' }],
    values: [
      {
        key: 'selfSwitch',
        label: 'Self Switch',
        type: 'select',
        options: [
          { value: 'A', label: 'A' },
          { value: 'B', label: 'B' },
          { value: 'C', label: 'C' },
          { value: 'D', label: 'D' }
        ],
        default: 'A',
        required: true
      },
      {
        key: 'value',
        label: 'Value',
        type: 'select',
        options: [
          { value: true, label: 'ON' },
          { value: false, label: 'OFF' }
        ],
        default: true
      }
    ],
    commandCode: 123 as ZCommandCode // ControlSelfSwitch
  }
}

// ==================== AUDIO NODES ====================

export const AudioNodes: ZNodeRegistry = {
  'audio.play_bgm': {
    title: 'Play BGM',
    category: 'audio',
    inputs: [{ id: 'exec', label: '', type: 'execution' }],
    outputs: [{ id: 'exec', label: '', type: 'execution' }],
    values: [
      { key: 'name', label: 'Audio File', type: 'audio', required: true },
      { key: 'volume', label: 'Volume', type: 'number', default: 90, min: 0, max: 100 },
      { key: 'pitch', label: 'Pitch', type: 'number', default: 100, min: 50, max: 150 }
    ],
    commandCode: 241 as ZCommandCode // PlayBGM
  },
  'audio.fade_out_bgm': {
    title: 'Fade Out BGM',
    category: 'audio',
    inputs: [{ id: 'exec', label: '', type: 'execution' }],
    outputs: [{ id: 'exec', label: '', type: 'execution' }],
    values: [
      { key: 'duration', label: 'Duration (seconds)', type: 'number', default: 2, min: 1, max: 10 }
    ],
    commandCode: 242 as ZCommandCode // FadeOutBGM
  },
  'audio.play_bgs': {
    title: 'Play BGS',
    category: 'audio',
    inputs: [{ id: 'exec', label: '', type: 'execution' }],
    outputs: [{ id: 'exec', label: '', type: 'execution' }],
    values: [
      { key: 'name', label: 'Audio File', type: 'audio', required: true },
      { key: 'volume', label: 'Volume', type: 'number', default: 90, min: 0, max: 100 },
      { key: 'pitch', label: 'Pitch', type: 'number', default: 100, min: 50, max: 150 }
    ],
    commandCode: 245 as ZCommandCode // PlayBGS
  },
  'audio.fade_out_bgs': {
    title: 'Fade Out BGS',
    category: 'audio',
    inputs: [{ id: 'exec', label: '', type: 'execution' }],
    outputs: [{ id: 'exec', label: '', type: 'execution' }],
    values: [
      { key: 'duration', label: 'Duration (seconds)', type: 'number', default: 2, min: 1, max: 10 }
    ],
    commandCode: 246 as ZCommandCode // FadeOutBGS
  },
  'audio.play_me': {
    title: 'Play ME',
    category: 'audio',
    inputs: [{ id: 'exec', label: '', type: 'execution' }],
    outputs: [{ id: 'exec', label: '', type: 'execution' }],
    values: [
      { key: 'name', label: 'Audio File', type: 'audio', required: true },
      { key: 'volume', label: 'Volume', type: 'number', default: 90, min: 0, max: 100 },
      { key: 'pitch', label: 'Pitch', type: 'number', default: 100, min: 50, max: 150 }
    ],
    commandCode: 249 as ZCommandCode // PlayME
  },
  'audio.play_se': {
    title: 'Play Sound Effect',
    category: 'audio',
    inputs: [{ id: 'exec', label: '', type: 'execution' }],
    outputs: [{ id: 'exec', label: '', type: 'execution' }],
    values: [
      { key: 'name', label: 'Sound File', type: 'audio', required: true },
      { key: 'volume', label: 'Volume', type: 'number', default: 90, min: 0, max: 100 },
      { key: 'pitch', label: 'Pitch', type: 'number', default: 100, min: 50, max: 150 }
    ],
    commandCode: 250 as ZCommandCode // PlaySE
  },
  'audio.stop_se': {
    title: 'Stop Sound Effect',
    category: 'audio',
    inputs: [{ id: 'exec', label: '', type: 'execution' }],
    outputs: [{ id: 'exec', label: '', type: 'execution' }],
    values: [],
    commandCode: 251 as ZCommandCode // StopSE
  }
}

// ==================== SCENE & MOVEMENT NODES ====================

export const SceneNodes: ZNodeRegistry = {
  'scene.transfer_player': {
    title: 'Transfer Player',
    category: 'scene',
    inputs: [{ id: 'exec', label: '', type: 'execution' }],
    outputs: [{ id: 'exec', label: '', type: 'execution' }],
    values: [
      { key: 'mapId', label: 'Map', type: 'map', required: true },
      { key: 'x', label: 'X', type: 'number', required: true, min: 0 },
      { key: 'y', label: 'Y', type: 'number', required: true, min: 0 },
      {
        key: 'direction',
        label: 'Direction',
        type: 'select',
        options: [
          { value: 'down', label: 'Down' },
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
          { value: 'up', label: 'Up' }
        ],
        default: 'down'
      },
      {
        key: 'fadeType',
        label: 'Fade',
        type: 'select',
        options: [
          { value: 0, label: 'Black' },
          { value: 1, label: 'White' },
          { value: 2, label: 'None' }
        ],
        default: 0
      }
    ],
    commandCode: 201 as ZCommandCode // TransferPlayer
  },
  'scene.set_event_location': {
    title: 'Set Event Location',
    category: 'scene',
    inputs: [{ id: 'exec', label: '', type: 'execution' }],
    outputs: [{ id: 'exec', label: '', type: 'execution' }],
    values: [
      { key: 'eventId', label: 'Event', type: 'event', required: true },
      { key: 'x', label: 'X', type: 'number', required: true, min: 0 },
      { key: 'y', label: 'Y', type: 'number', required: true, min: 0 }
    ],
    commandCode: 203 as ZCommandCode // SetEventLocation
  },
  'scene.set_event_direction': {
    title: 'Set Event Direction',
    category: 'scene',
    inputs: [{ id: 'exec', label: '', type: 'execution' }],
    outputs: [{ id: 'exec', label: '', type: 'execution' }],
    values: [
      { key: 'eventId', label: 'Event', type: 'event', required: true },
      {
        key: 'direction',
        label: 'Direction',
        type: 'select',
        options: [
          { value: 'down', label: 'Down' },
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
          { value: 'up', label: 'Up' }
        ],
        default: 'down'
      }
    ],
    commandCode: 213 as ZCommandCode // SetEventDirection
  },
  'scene.wait': {
    title: 'Wait',
    category: 'scene',
    inputs: [{ id: 'exec', label: '', type: 'execution' }],
    outputs: [{ id: 'exec', label: '', type: 'execution' }],
    values: [
      {
        key: 'duration',
        label: 'Duration (frames)',
        type: 'number',
        default: 60,
        min: 1,
        required: true
      }
    ],
    commandCode: 230 as ZCommandCode // Wait
  }
}

// ==================== SCREEN EFFECT NODES ====================

export const ScreenNodes: ZNodeRegistry = {
  'screen.fade_out': {
    title: 'Fade Out Screen',
    category: 'action',
    inputs: [{ id: 'exec', label: '', type: 'execution' }],
    outputs: [{ id: 'exec', label: '', type: 'execution' }],
    values: [],
    commandCode: 221 as ZCommandCode // FadeOutScreen
  },
  'screen.fade_in': {
    title: 'Fade In Screen',
    category: 'action',
    inputs: [{ id: 'exec', label: '', type: 'execution' }],
    outputs: [{ id: 'exec', label: '', type: 'execution' }],
    values: [],
    commandCode: 222 as ZCommandCode // FadeInScreen
  },
  'screen.tint': {
    title: 'Tint Screen',
    category: 'action',
    inputs: [{ id: 'exec', label: '', type: 'execution' }],
    outputs: [{ id: 'exec', label: '', type: 'execution' }],
    values: [
      { key: 'red', label: 'Red', type: 'number', default: 0, min: -255, max: 255 },
      { key: 'green', label: 'Green', type: 'number', default: 0, min: -255, max: 255 },
      { key: 'blue', label: 'Blue', type: 'number', default: 0, min: -255, max: 255 },
      { key: 'gray', label: 'Gray', type: 'number', default: 0, min: 0, max: 255 },
      { key: 'duration', label: 'Duration (frames)', type: 'number', default: 60, min: 1 }
    ],
    commandCode: 223 as ZCommandCode // TintScreen
  },
  'screen.flash': {
    title: 'Flash Screen',
    category: 'action',
    inputs: [{ id: 'exec', label: '', type: 'execution' }],
    outputs: [{ id: 'exec', label: '', type: 'execution' }],
    values: [
      { key: 'red', label: 'Red', type: 'number', default: 255, min: 0, max: 255 },
      { key: 'green', label: 'Green', type: 'number', default: 255, min: 0, max: 255 },
      { key: 'blue', label: 'Blue', type: 'number', default: 255, min: 0, max: 255 },
      { key: 'strength', label: 'Strength', type: 'number', default: 170, min: 0, max: 255 },
      { key: 'duration', label: 'Duration (frames)', type: 'number', default: 60, min: 1 }
    ],
    commandCode: 224 as ZCommandCode // FlashScreen
  },
  'screen.shake': {
    title: 'Shake Screen',
    category: 'action',
    inputs: [{ id: 'exec', label: '', type: 'execution' }],
    outputs: [{ id: 'exec', label: '', type: 'execution' }],
    values: [
      { key: 'power', label: 'Power', type: 'number', default: 5, min: 1, max: 9 },
      { key: 'speed', label: 'Speed', type: 'number', default: 5, min: 1, max: 9 },
      { key: 'duration', label: 'Duration (frames)', type: 'number', default: 60, min: 1 }
    ],
    commandCode: 225 as ZCommandCode // ShakeScreen
  }
}

// ==================== COMBINED REGISTRY ====================

export const NodeRegistry: ZNodeRegistry = {
  ...EventNodes,
  ...MessageNodes,
  ...FlowNodes,
  ...DataNodes,
  ...AudioNodes,
  ...SceneNodes,
  ...ScreenNodes
}

export { NodeRegistry as default }
