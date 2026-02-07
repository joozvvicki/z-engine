import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ZNode, ZConnection, ZNodeGraph } from '@engine/types'
import { ProjectService } from '../services/ProjectService'

export const NODE_WIDTH = 240
export const NODE_HEADER_HEIGHT = 40
export const NODE_PADDING = 24
export const SOCKET_SIZE = 12
export const SOCKET_ROW_HEIGHT = 28
export const SOCKET_OFFSET = 0

export const useNodeScriptStore = defineStore('nodeScript', () => {
  const nodes = ref<ZNode[]>([])
  const connections = ref<ZConnection[]>([])

  // Viewport State
  const zoom = ref(1)
  const pan = ref({ x: 0, y: 0 })

  // Temporary state for connection dragging
  const activeDragConnection = ref<{
    fromNode: string
    fromSocket: string
    toX: number
    toY: number
  } | null>(null)

  const loadAll = async (): Promise<void> => {
    const data = await ProjectService.loadDatabaseFile<ZNodeGraph>('Nodes.json')
    if (data) {
      nodes.value = data.nodes || []
      connections.value = data.connections || []
    }
  }

  const saveAll = async (): Promise<void> => {
    await ProjectService.saveDatabaseFile('Nodes.json', {
      nodes: nodes.value,
      connections: connections.value
    })
  }

  const addNode = (node: ZNode): void => {
    nodes.value.push(node)
  }

  const removeNode = (nodeId: string): void => {
    nodes.value = nodes.value.filter((n) => n.id !== nodeId)
    connections.value = connections.value.filter(
      (c) => c.fromNode !== nodeId && c.toNode !== nodeId
    )
  }

  const updateNodePosition = (nodeId: string, x: number, y: number): void => {
    const node = nodes.value.find((n) => n.id === nodeId)
    if (node) {
      node.x = x
      node.y = y
    }
  }

  const addConnection = (conn: ZConnection): void => {
    // Basic validation: Avoid duplicate connections
    const exists = connections.value.some(
      (c) =>
        c.fromNode === conn.fromNode &&
        c.fromSocket === conn.fromSocket &&
        c.toNode === conn.toNode &&
        c.toSocket === conn.toSocket
    )
    if (!exists) {
      connections.value.push(conn)
    }
  }

  const removeConnection = (connId: string): void => {
    connections.value = connections.value.filter((c) => c.id !== connId)
  }

  return {
    nodes,
    connections,
    zoom,
    pan,
    activeDragConnection,
    loadAll,
    saveAll,
    addNode,
    removeNode,
    updateNodePosition,
    addConnection,
    removeConnection
  }
})
