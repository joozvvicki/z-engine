import type {
  ZNode,
  ZNodeGraph,
  ZEventCommand,
  ZConnection,
  ZNodeDefinition,
  ZEventTrigger,
  ZMoveCommand,
  ZMoveCommandItem
} from '@engine/types'
import { NodeRegistry } from './nodeRegistry'

/**
 * Enhanced Node Graph Decompiler
 * Converts linear ZEventCommands back into a visual node graph with full branching support
 */
export const nodeDecompiler = {
  decompile(commands: ZEventCommand[], trigger: ZEventTrigger = 0): ZNodeGraph {
    const nodes: ZNode[] = []
    const connections: ZConnection[] = []

    if (!commands || commands.length === 0) {
      return { nodes: [createEntryNode(trigger)], connections: [] }
    }

    // Add entry node
    const entryNode = createEntryNode(trigger)
    nodes.push(entryNode)

    // Start recursive processing
    processCommands({
      commands,
      startIndex: 0,
      endIndex: commands.length,
      indent: 0,
      x: 450,
      y: 150,
      nodes,
      connections,
      parentNodeId: entryNode.id,
      parentSocketId: 'exec'
    })

    console.log(
      `[Decompiler] Decompiled ${nodes.length} nodes and ${connections.length} connections`
    )
    return { nodes, connections }
  }
}

interface DecompileContext {
  commands: ZEventCommand[]
  startIndex: number
  endIndex: number
  indent: number
  x: number
  y: number
  nodes: ZNode[]
  connections: ZConnection[]
  parentNodeId: string | null
  parentSocketId: string | null
}

/**
 * Process a range of commands and build nodes/connections
 */
function processCommands(ctx: DecompileContext): {
  lastNodeId: string
  lastX: number
  lastY: number
} {
  const { commands, nodes, connections } = ctx
  let currentX = ctx.x
  let currentY = ctx.y
  let currentParentId = ctx.parentNodeId
  let currentSocketId = ctx.parentSocketId

  let i = ctx.startIndex
  while (i < ctx.endIndex) {
    const cmd = commands[i]

    // Skip commands that are not at the current indent level
    // (They should be processed by recursive calls)
    if ((cmd.indent || 0) < ctx.indent) {
      break // End of current block
    }
    if ((cmd.indent || 0) > ctx.indent) {
      i++
      continue
    }

    // --- Special Branching Handlers ---

    // 102: Show Choices
    if (cmd.code === 102) {
      const result = handleShowChoices({
        ...ctx,
        startIndex: i,
        x: currentX,
        y: currentY,
        parentNodeId: currentParentId,
        parentSocketId: currentSocketId
      })
      if (result) {
        currentX = result.nextX
        currentY = result.nextY
        currentParentId = result.lastNodeId
        currentSocketId = 'exec'
        i = result.consumedCount
        continue
      }
    }

    // 111: Conditional Branch
    if (cmd.code === 111) {
      const result = handleConditionalBranch({
        ...ctx,
        startIndex: i,
        x: currentX,
        y: currentY,
        parentNodeId: currentParentId,
        parentSocketId: currentSocketId
      })
      if (result) {
        currentX = result.nextX
        currentY = result.nextY
        currentParentId = result.lastNodeId
        currentSocketId = 'exec'
        i = result.consumedCount
        continue
      }
    }

    // 205: Set Move Route
    if (cmd.code === 205) {
      const result = handleSetMoveRoute({
        ...ctx,
        startIndex: i,
        x: currentX,
        y: currentY,
        parentNodeId: currentParentId,
        parentSocketId: currentSocketId
      })
      if (result) {
        currentX = result.nextX
        currentY = result.nextY
        currentParentId = result.lastNodeId
        currentSocketId = 'exec'
        i = result.consumedCount
        continue
      }
    }

    // --- Standard Node Handler ---
    const nodeInfo = findNodeByCommandCode(cmd.code)
    let node: ZNode

    if (nodeInfo) {
      node = createNodeFromCommand(cmd, nodeInfo, currentX, currentY, i)
    } else {
      // Fallback for unknown commands
      if (isBranchMarker(cmd.code)) {
        i++
        continue
      }
      node = createUnknownNode(cmd, currentX, currentY, i)
    }

    nodes.push(node)

    // Connect to parent
    if (currentParentId && currentSocketId) {
      connections.push({
        id: `conn-${nodes.length}-${Date.now()}`,
        fromNode: currentParentId,
        fromSocket: currentSocketId,
        toNode: node.id,
        toSocket: 'exec'
      })
    }

    currentParentId = node.id
    currentSocketId = 'exec'
    currentX += 350
    i++
  }

  return { lastNodeId: currentParentId || '', lastX: currentX, lastY: currentY }
}

/**
 * Handle Show Choices (102 -> 402... -> 404)
 */
function handleShowChoices(
  ctx: DecompileContext
): { lastNodeId: string; nextX: number; nextY: number; consumedCount: number } | null {
  const { commands, startIndex, nodes, connections, parentNodeId, parentSocketId } = ctx
  const cmd = commands[startIndex]
  const [choicesRaw = [], cancelTypeRaw = -1, defaultType = 0, positionType = 2, background = 0] =
    cmd.parameters as [string[], number, number, number, number]

  const choices = Array.isArray(choicesRaw) ? choicesRaw : []
  const indent = cmd.indent || 0

  // Map engine cancelType back to registry value
  // In RPG Maker, if cancelType === choices.length, it's a branch
  let cancelType = cancelTypeRaw
  if (cancelTypeRaw === choices.length && choices.length > 0) {
    cancelType = 6 // Branch
  }

  // 1. Create the node
  const nodeInfo = { key: 'action.show_choices', definition: NodeRegistry['action.show_choices'] }
  const node = createNodeFromCommand(cmd, nodeInfo, ctx.x, ctx.y, startIndex)
  node.values = {
    choices: choices.join(', '),
    cancelType,
    defaultType,
    positionType,
    background
  }
  nodes.push(node)

  // Connect to parent
  if (parentNodeId && parentSocketId) {
    connections.push({
      id: `conn-choice-${Date.now()}`,
      fromNode: parentNodeId,
      fromSocket: parentSocketId,
      toNode: node.id,
      toSocket: 'exec'
    })
  }

  // 2. Find markers and process branches
  let i = startIndex + 1
  let branchIndex = 0
  let consumedCount = i

  while (i < commands.length) {
    const current = commands[i]
    if ((current.indent || 0) === indent && current.code === 404) {
      consumedCount = i + 1
      break
    }

    // Standard Choice (402)
    if ((current.indent || 0) === indent && current.code === 402) {
      // Find end of this branch body
      let branchEnd = i + 1
      while (branchEnd < commands.length) {
        const next = commands[branchEnd]
        if (
          (next.indent || 0) === indent &&
          (next.code === 402 || next.code === 403 || next.code === 404)
        )
          break
        branchEnd++
      }

      // Process branch body
      processCommands({
        ...ctx,
        startIndex: i + 1,
        endIndex: branchEnd,
        indent: indent + 1,
        x: ctx.x + 400,
        y: ctx.y + branchIndex * 150,
        parentNodeId: node.id,
        parentSocketId: `choice_${branchIndex}`
      })

      branchIndex++
      i = branchEnd
      continue
    }

    // Cancel/Else Choice (403)
    if ((current.indent || 0) === indent && current.code === 403) {
      // Find end of cancel branch
      let branchEnd = i + 1
      while (branchEnd < commands.length) {
        const next = commands[branchEnd]
        if ((next.indent || 0) === indent && next.code === 404) break
        branchEnd++
      }

      processCommands({
        ...ctx,
        startIndex: i + 1,
        endIndex: branchEnd,
        indent: indent + 1,
        x: ctx.x + 400,
        y: ctx.y + branchIndex * 150,
        parentNodeId: node.id,
        parentSocketId: 'cancel'
      })

      i = branchEnd
      continue
    }

    i++
  }

  return { lastNodeId: node.id, nextX: ctx.x + 500, nextY: ctx.y, consumedCount }
}

/**
 * Handle Conditional Branch (111 -> 411... -> 412)
 */
function handleConditionalBranch(
  ctx: DecompileContext
): { lastNodeId: string; nextX: number; nextY: number; consumedCount: number } | null {
  const { commands, startIndex, nodes, connections, parentNodeId, parentSocketId } = ctx
  const cmd = commands[startIndex]
  const indent = cmd.indent || 0

  // 1. Create the node
  const nodeInfo = { key: 'flow.if', definition: NodeRegistry['flow.if'] }
  const node = createNodeFromCommand(cmd, nodeInfo, ctx.x, ctx.y, startIndex)

  // 2. Parse parameters
  const [type, p1, p2, p3, p4] = cmd.parameters as [number, unknown, number, unknown, number]
  if (type === 0) {
    // Switch
    node.values = {
      conditionType: 'switch',
      switchId: p1,
      switchValue: p2 // 0: ON, 1: OFF
    }
  } else if (type === 1) {
    // Variable
    const operandType = p2 // 0: Constant, 1: Variable
    node.values = {
      conditionType: 'variable',
      variableId: p1,
      operandType,
      variableOp: p4,
      variableValue: operandType === 0 ? p3 : 0,
      compareVariableId: operandType === 1 ? p3 : 1
    }
  } else if (type === 2) {
    // Self Switch
    node.values = {
      conditionType: 'selfSwitch',
      selfSwitchId: p1, // 'A', 'B', 'C', 'D'
      selfSwitchValue: p2 // 0: ON, 1: OFF
    }
  }

  nodes.push(node)

  // Connect to parent
  if (parentNodeId && parentSocketId) {
    connections.push({
      id: `conn-if-${Date.now()}`,
      fromNode: parentNodeId,
      fromSocket: parentSocketId,
      toNode: node.id,
      toSocket: 'exec'
    })
  }

  // 3. Process True/False branches
  let elseIndex = -1
  let endIndex = -1

  // Find structure at same indent level
  let depth = 0
  for (let j = startIndex + 1; j < commands.length; j++) {
    const c = commands[j]
    const cIndent = c.indent || 0
    if (c.code === 111 && cIndent === indent) depth++
    if (c.code === 412 && cIndent === indent) {
      if (depth === 0) {
        endIndex = j
        break
      }
      depth--
    }
    if (depth === 0 && c.code === 411 && cIndent === indent) {
      elseIndex = j
    }
  }

  if (endIndex === -1) {
    endIndex = commands.length
  }

  // Process True branch
  processCommands({
    ...ctx,
    startIndex: startIndex + 1,
    endIndex: elseIndex !== -1 ? elseIndex : endIndex,
    indent: indent + 1,
    x: ctx.x + 400,
    y: ctx.y,
    parentNodeId: node.id,
    parentSocketId: 'true'
  })

  // Process False branch if exists
  if (elseIndex !== -1) {
    processCommands({
      ...ctx,
      startIndex: elseIndex + 1,
      endIndex: endIndex,
      indent: indent + 1,
      x: ctx.x + 400,
      y: ctx.y + 150,
      parentNodeId: node.id,
      parentSocketId: 'false'
    })
  }

  return { lastNodeId: node.id, nextX: ctx.x + 500, nextY: ctx.y, consumedCount: endIndex + 1 }
}

/**
 * Handle Set Move Route (205)
 */
function handleSetMoveRoute(
  ctx: DecompileContext
): { lastNodeId: string; nextX: number; nextY: number; consumedCount: number } | null {
  const { commands, startIndex, nodes, connections, parentNodeId, parentSocketId } = ctx
  const cmd = commands[startIndex]

  // parameters[0]: characterId (target)
  // parameters[1]: list (array of commands)
  // parameters[2]: wait
  // parameters[3]: repeat
  // parameters[4]: through
  const params = cmd.parameters || []
  const characterIdRaw = params[0] as number | undefined
  const moveListRaw = params[1] as ZMoveCommandItem[] | undefined

  // Some versions might still use the object-based routeData
  const routeData =
    typeof params[1] === 'object' && !Array.isArray(params[1])
      ? (params[1] as {
          list?: ZMoveCommandItem[]
          wait?: boolean
          repeat?: boolean
          through?: boolean
          skippable?: boolean
        })
      : {
          list: moveListRaw || [],
          wait: !!params[2],
          repeat: !!params[3],
          through: !!params[4]
        }

  // 1. Create the node
  const nodeInfo = { key: 'action.move_route', definition: NodeRegistry['action.move_route'] }
  const node = createNodeFromCommand(cmd, nodeInfo, ctx.x, ctx.y, startIndex)

  // 2. Map data to values
  // Map characterId back to target selector
  const characterId = Number(characterIdRaw ?? 0)
  let target = 0
  let actualCharId = 1

  if (characterId === -1) target = -1
  else if (characterId === 0) target = 0
  else {
    target = 1
    actualCharId = characterId
  }

  // Move Code Mapping (Numeric -> String)
  const MOVE_CODE_MAP: Record<number, string> = {
    1: 'MOVE_DOWN',
    2: 'MOVE_LEFT',
    3: 'MOVE_RIGHT',
    4: 'MOVE_UP',
    5: 'MOVE_LOWER_LEFT',
    6: 'MOVE_LOWER_RIGHT',
    7: 'MOVE_UPPER_LEFT',
    8: 'MOVE_UPPER_RIGHT',
    9: 'MOVE_RANDOM',
    10: 'MOVE_TOWARD_PLAYER',
    11: 'MOVE_AWAY_PLAYER',
    12: 'STEP_FORWARD',
    13: 'STEP_BACKWARD',
    14: 'JUMP',
    15: 'WAIT',
    16: 'TURN_DOWN',
    17: 'TURN_LEFT',
    18: 'TURN_RIGHT',
    19: 'TURN_UP',
    20: 'TURN_90_RIGHT',
    21: 'TURN_90_LEFT',
    22: 'TURN_180',
    23: 'TURN_90_RIGHT_LEFT',
    24: 'TURN_RANDOM',
    25: 'TURN_TOWARD_PLAYER',
    26: 'TURN_AWAY_PLAYER',
    27: 'SPEED',
    28: 'FREQUENCY',
    29: 'WALK_ANIM_ON',
    30: 'WALK_ANIM_OFF',
    31: 'STEP_ANIM_ON',
    32: 'STEP_ANIM_OFF',
    33: 'DIR_FIX_ON',
    34: 'DIR_FIX_OFF',
    35: 'THROUGH_ON',
    36: 'THROUGH_OFF',
    37: 'TRANSPARENT_ON',
    38: 'TRANSPARENT_OFF',
    44: 'PLAY_SE',
    45: 'SCRIPT'
  }

  // Filter out END (0) commands from the list for the UI
  // RPG Maker uses structured list { code, parameters } or { code, params }
  const moveList = routeData?.list || []
  const moveCommands: ZMoveCommand[] = moveList
    .map((m: ZMoveCommandItem) => {
      if (!m) return null

      let code = m.code
      if (typeof code === 'number') {
        code = MOVE_CODE_MAP[code] || code.toString()
      }

      if (!code || code === '0') return null

      // Handle parameters (support both 'params' and 'parameters')
      const pRaw = m.params || m.parameters || []
      const p = Array.isArray(pRaw) ? pRaw : []

      return {
        code: code as string,
        params: p
      } as ZMoveCommand
    })
    .filter((cmd): cmd is ZMoveCommand => cmd !== null)

  node.values = {
    target,
    characterId: actualCharId,
    repeat: !!routeData?.repeat,
    wait: !!routeData?.wait,
    through: !!routeData?.through,
    commands: moveCommands
  }

  nodes.push(node)

  // Connect to parent
  if (parentNodeId && parentSocketId) {
    connections.push({
      id: `conn-move-${Date.now()}`,
      fromNode: parentNodeId,
      fromSocket: parentSocketId,
      toNode: node.id,
      toSocket: 'exec'
    })
  }

  return { lastNodeId: node.id, nextX: ctx.x + 500, nextY: ctx.y, consumedCount: startIndex + 1 }
}

// --- Helpers ---

function createEntryNode(trigger: ZEventTrigger = 0): ZNode {
  const triggerMapping: Record<number, { key: string; title: string }> = {
    0: { key: 'event.action', title: 'On Action Button' },
    1: { key: 'event.player_touch', title: 'On Player Touch' },
    2: { key: 'event.event_touch', title: 'On Event Touch' },
    3: { key: 'event.autorun', title: 'On Autorun' },
    4: { key: 'event.parallel', title: 'On Parallel' }
  }

  const info = triggerMapping[trigger] || triggerMapping[0]

  return {
    id: 'entry-node',
    type: 'event',
    title: info.title,
    x: 100,
    y: 150,
    inputs: [],
    outputs: [{ id: 'exec', label: 'Execute', type: 'execution' }],
    values: {},
    config: { nodeKey: info.key, isEntry: true }
  }
}

function findNodeByCommandCode(code: number): { key: string; definition: ZNodeDefinition } | null {
  for (const [key, def] of Object.entries(NodeRegistry)) {
    if (def.commandCode === code) return { key, definition: def }
  }
  return null
}

function createNodeFromCommand(
  cmd: ZEventCommand,
  info: { key: string; definition: ZNodeDefinition },
  x: number,
  y: number,
  index: number
): ZNode {
  const values: Record<string, unknown> = {}
  info.definition.values.forEach((schema, idx) => {
    values[schema.key] = cmd.parameters[idx] ?? schema.default
  })

  return {
    id: `node-${index}-${Date.now()}`,
    type: info.definition.category,
    title: info.definition.title,
    x,
    y,
    inputs: JSON.parse(JSON.stringify(info.definition.inputs)),
    outputs: info.definition.getOutputs
      ? info.definition.getOutputs(values)
      : JSON.parse(JSON.stringify(info.definition.outputs)),
    values,
    config: { nodeKey: info.key }
  }
}

function createUnknownNode(cmd: ZEventCommand, x: number, y: number, index: number): ZNode {
  return {
    id: `unknown-${index}-${Date.now()}`,
    type: 'action',
    title: `Unknown (${cmd.code})`,
    x,
    y,
    inputs: [{ id: 'exec', label: '', type: 'execution' }],
    outputs: [{ id: 'exec', label: '', type: 'execution' }],
    values: { parameters: cmd.parameters },
    config: { nodeKey: 'unknown', code: cmd.code }
  }
}

function isBranchMarker(code: number): boolean {
  return [402, 403, 404, 405, 406, 411, 412].includes(code)
}

export default nodeDecompiler
