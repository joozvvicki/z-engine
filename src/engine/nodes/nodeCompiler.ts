import type {
  ZNode,
  ZNodeGraph,
  ZEventCommand,
  ZNodeCompiler,
  ZNodeDefinition
} from '@engine/types'
import { NodeRegistry } from './nodeRegistry'

/**
 * Node Graph Compiler
 * Converts a visual node graph into an array of ZEventCommands
 * that can be executed by the game engine
 */
export const nodeCompiler: ZNodeCompiler = {
  compile(graph: ZNodeGraph, startNodeId?: string): ZEventCommand[] {
    const commands: ZEventCommand[] = []

    // Find entry node (event.* type nodes)
    const entryNode = startNodeId
      ? graph.nodes.find((n) => n.id === startNodeId)
      : graph.nodes.find((n) => n.type === 'event')

    if (!entryNode) {
      console.warn('[NodeCompiler] No entry node found in graph')
      return []
    }

    // Traverse graph starting from entry node
    const visited = new Set<string>()
    traverseNode(entryNode, graph, commands, visited, 0)

    return commands
  }
}

/**
 * Recursively traverse nodes and build command list
 */
function traverseNode(
  node: ZNode,
  graph: ZNodeGraph,
  commands: ZEventCommand[],
  visited: Set<string>,
  indent: number
): void {
  // Prevent infinite loops
  if (visited.has(node.id)) {
    console.warn(`[NodeCompiler] Circular reference detected at node ${node.id}`)
    return
  }
  visited.add(node.id)

  const key = node.config?.nodeKey as string
  if (!key || !NodeRegistry[key]) {
    console.warn(`[NodeCompiler] Unknown node key: ${key}`)
    return
  }

  const definition = NodeRegistry[key]

  // Skip event nodes (they're just entry points)
  if (node.type === 'event') {
    // Continue to next node without generating commands
  }
  // Use custom compile handler if available
  else if (definition.compileHandler) {
    const nodeCommands = definition.compileHandler(node)
    nodeCommands.forEach((cmd) => {
      commands.push({ ...cmd, indent })
    })
  }
  // Use default commandCode
  else if (definition.commandCode) {
    const params = buildParams(node, definition)
    commands.push({
      code: definition.commandCode,
      indent,
      parameters: params
    })
  }

  // Find next node(s) via execution outputs
  const executionOutputs = node.outputs.filter((o) => o.type === 'execution')

  for (const output of executionOutputs) {
    const connection = graph.connections.find(
      (c) => c.fromNode === node.id && c.fromSocket === output.id
    )

    if (connection) {
      const nextNode = graph.nodes.find((n) => n.id === connection.toNode)
      if (nextNode) {
        // Special handling for flow control (like 'if')
        const nextIndent = shouldIndent(node, output) ? indent + 1 : indent
        traverseNode(nextNode, graph, commands, visited, nextIndent)
      }
    }
  }
}

/**
 * Build parameters array from node values based on schema
 */
function buildParams(node: ZNode, definition: ZNodeDefinition): unknown[] {
  const params: unknown[] = []

  for (const schema of definition.values) {
    const value = node.values?.[schema.key]
    params.push(value !== undefined ? value : schema.default)
  }

  return params
}

/**
 * Determine if the next node should be indented
 * (e.g., for if/then/else branches)
 */
function shouldIndent(node: ZNode, output: { id: string; label: string }): boolean {
  // If node with 'true' or 'false' outputs should indent
  if (node.type === 'flow' || node.type === 'condition') {
    if (
      output.label.toLowerCase().includes('true') ||
      output.label.toLowerCase().includes('then')
    ) {
      return true
    }
  }

  return false
}

/**
 * Export compiler instance
 */
export default nodeCompiler
