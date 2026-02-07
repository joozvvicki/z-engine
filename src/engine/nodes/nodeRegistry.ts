import type { ZNodeRegistry, ZCommandCode, ZEventCommand } from '@engine/types'
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
    inputs: [{ id: 'exec', label: '', type: 'execution' }],
    outputs: [
      { id: 'choice_0', label: 'Choice 1', type: 'execution' },
      { id: 'choice_1', label: 'Choice 2', type: 'execution' },
      { id: 'choice_2', label: 'Choice 3', type: 'execution' },
      { id: 'choice_3', label: 'Choice 4', type: 'execution' },
      { id: 'cancel', label: 'Cancel', type: 'execution' }
    ],
    values: [
      { key: 'choices', label: 'Choices (comma separated)', type: 'string', required: true },
      {
        key: 'cancelType',
        label: 'Cancel Type',
        type: 'select',
        options: [
          { value: -1, label: 'Disallow' },
          { value: 0, label: 'Branch' }
        ],
        default: -1
      }
    ],
    commandCode: 102 as ZCommandCode, // ShowChoices
    compileHandler: (node, graph, visited, baseIndent) => {
      const commands: ZEventCommand[] = []
      const choicesStr = node.values?.choices?.toString() || ''
      const choices = choicesStr
        .split(',')
        .map((c: string) => c.trim())
        .filter((c: string) => c.length > 0)
      const cancelType = node.values?.cancelType ?? -1

      // Helper: compile nodes connected to specific output socket
      const compileOutputBranch = (outputId: string): ZEventCommand[] => {
        return compileNodeBranch(node.id, outputId, graph, visited, baseIndent + 1)
      }

      // Setup command (code 102)
      commands.push({
        code: 102,
        indent: baseIndent,
        parameters: [choices, cancelType]
      })

      // Generate branch commands for each choice
      for (let i = 0; i < choices.length && i < 4; i++) {
        // When choice N (standard RPG Maker uses 402 for all when markers)
        commands.push({
          code: 402 as ZCommandCode,
          indent: baseIndent + 1,
          parameters: [i, choices[i]]
        })

        // Compile connected nodes from this choice
        const branchCommands = compileOutputBranch(`choice_${i}`)
        commands.push(...branchCommands)
      }

      // Cancel branch if enabled
      if ((cancelType as number) >= 0) {
        commands.push({
          code: 406 as ZCommandCode,
          indent: baseIndent + 1,
          parameters: []
        })

        // Compile cancel branch
        const cancelCommands = compileOutputBranch('cancel')
        commands.push(...cancelCommands)
      }

      // Branch end (code 404)
      commands.push({
        code: 404 as ZCommandCode,
        indent: baseIndent,
        parameters: []
      })

      return commands
    }
  }
}

// ==================== FLOW CONTROL NODES ====================

export const FlowNodes: ZNodeRegistry = {
  'flow.if': {
    title: 'If Condition',
    category: 'flow',
    inputs: [{ id: 'exec', label: '', type: 'execution' }],
    outputs: [
      { id: 'true', label: 'True', type: 'execution' },
      { id: 'false', label: 'False', type: 'execution' }
    ],
    values: [
      {
        key: 'conditionType',
        label: 'Condition Type',
        type: 'select',
        options: [
          { value: 'switch', label: 'Switch' },
          { value: 'variable', label: 'Variable' }
        ],
        default: 'switch',
        required: true
      },
      { key: 'switchId', label: 'Switch', type: 'switch' },
      { key: 'variableId', label: 'Variable', type: 'variable' },
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
        default: 0
      },
      { key: 'variableValue', label: 'Value', type: 'number', default: 0 }
    ],
    commandCode: 111 as ZCommandCode // ConditionalBranch
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
