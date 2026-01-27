import * as PIXI from 'pixi.js'
import { ZLayer, TileSelection, ZMap } from '@ui/stores/editor'
import { TextureManager } from '../managers/TextureManager'
import { AutotileSolver } from '@engine/utils/AutotileSolver'

export class MapRenderSystem {
  private container: PIXI.Container
  private layers: Record<ZLayer, PIXI.Container>
  private tileContainers: Record<ZLayer, (PIXI.Container | null)[][]>

  private textureManager: TextureManager
  private tileSize: number

  constructor(stage: PIXI.Container, textureManager: TextureManager, tileSize: number) {
    this.container = new PIXI.Container()
    this.container.label = 'MapContainer'
    stage.addChild(this.container)

    this.textureManager = textureManager
    this.tileSize = tileSize

    // Inicjalizacja warstw PIXI
    this.layers = {
      [ZLayer.ground]: new PIXI.Container(),
      [ZLayer.walls]: new PIXI.Container(),
      [ZLayer.decoration]: new PIXI.Container(),
      [ZLayer.trees]: new PIXI.Container(),
      [ZLayer.events]: new PIXI.Container(),
      [ZLayer.roofs]: new PIXI.Container()
    }

    // Dodanie warstw do kontenera w odpowiedniej kolejności
    const sortedLayers = Object.values(this.layers)
    this.container.addChild(...sortedLayers)

    this.tileContainers = this.createEmptyContainerStructure(0, 0)
  }

  /**
   * Renderuje pojedyncze pole (zastępuje stary drawTile)
   */
  public drawTile(
    x: number,
    y: number,
    tiles: TileSelection[],
    layer: ZLayer,
    mapData: ZMap
  ): void {
    // 1. Wyczyść stare
    this.clearTileAt(x, y, layer)

    if (!tiles || tiles.length === 0) return

    // 2. Stwórz kontener na kafelki w tym polu
    const cellContainer = new PIXI.Container()
    cellContainer.x = x * this.tileSize
    cellContainer.y = y * this.tileSize

    tiles.forEach((selection) => {
      const tex = this.textureManager.get(selection.tilesetId)
      if (!tex) return

      const wrapper = new PIXI.Container()

      if (selection.isAutotile) {
        this.renderAutotile(x, y, selection, layer, wrapper, tex, mapData)
      } else {
        const sprite = new PIXI.Sprite(
          new PIXI.Texture({
            source: tex.source,
            frame: new PIXI.Rectangle(
              selection.x * this.tileSize,
              selection.y * this.tileSize,
              selection.w * this.tileSize,
              selection.h * this.tileSize
            )
          })
        )
        wrapper.addChild(sprite)
      }
      cellContainer.addChild(wrapper)
    })

    this.layers[layer].addChild(cellContainer)
    this.tileContainers[layer][y][x] = cellContainer
  }

  public clearTileAt(x: number, y: number, layer: ZLayer): void {
    if (!this.tileContainers[layer] || !this.tileContainers[layer][y]) return

    const existing = this.tileContainers[layer][y][x]
    if (existing) {
      this.layers[layer].removeChild(existing)
      existing.destroy({ children: true })
      this.tileContainers[layer][y][x] = null
    }
  }

  public renderFullMap(mapData: ZMap): void {
    this.resetLayers(mapData.width, mapData.height)

    const layersOrder: ZLayer[] = [
      ZLayer.ground,
      ZLayer.walls,
      ZLayer.decoration,
      ZLayer.trees,
      ZLayer.events,
      ZLayer.roofs
    ]

    layersOrder.forEach((layer) => {
      const grid = mapData.layers[layer].data
      for (let y = 0; y < mapData.height; y++) {
        for (let x = 0; x < mapData.width; x++) {
          const stack = grid[y][x]
          if (stack && stack.length > 0) {
            this.drawTile(x, y, stack, layer, mapData)
          }
        }
      }
    })
  }

  private renderAutotile(
    x: number,
    y: number,
    sel: TileSelection,
    layer: ZLayer,
    parent: PIXI.Container,
    tex: PIXI.Texture,
    mapData: ZMap
  ): void {
    const isA1 = sel.tilesetId === 'A1'
    let frameCount = 1

    if (isA1) {
      const blockXIndex = Math.floor(sel.x / 2)
      if (blockXIndex !== 3 && blockXIndex !== 7) frameCount = 3
    }

    for (let qy = 0; qy < 2; qy++) {
      for (let qx = 0; qx < 2; qx++) {
        // Użycie UTILS
        const offset = AutotileSolver.getQuadrantOffset(
          x,
          y,
          qx,
          qy,
          this.tileSize,
          sel,
          layer,
          mapData,
          mapData.width,
          mapData.height
        )

        const textures: PIXI.Texture[] = []
        for (let i = 0; i < frameCount; i++) {
          const animOffset = isA1 ? i * (this.tileSize * 2) : 0
          textures.push(
            new PIXI.Texture({
              source: tex.source,
              frame: new PIXI.Rectangle(
                sel.x * this.tileSize + animOffset + offset.x,
                sel.y * this.tileSize + offset.y,
                this.tileSize / 2,
                this.tileSize / 2
              )
            })
          )
        }

        if (textures.length > 1) {
          const anim = new PIXI.AnimatedSprite(textures)
          anim.x = qx * (this.tileSize / 2)
          anim.y = qy * (this.tileSize / 2)
          anim.animationSpeed = 0.025
          anim.play()
          parent.addChild(anim)
        } else {
          const spr = new PIXI.Sprite(textures[0])
          spr.x = qx * (this.tileSize / 2)
          spr.y = qy * (this.tileSize / 2)
          parent.addChild(spr)
        }
      }
    }
  }

  private resetLayers(w: number, h: number): void {
    Object.values(this.layers).forEach((c) => c.removeChildren())
    this.tileContainers = this.createEmptyContainerStructure(w, h)
  }

  private createEmptyContainerStructure(
    w: number,
    h: number
  ): Record<ZLayer, (PIXI.Container | null)[][]> {
    const create = (): (PIXI.Container | null)[][] =>
      Array.from({ length: h }, () => Array(w).fill(null))
    return {
      [ZLayer.ground]: create(),
      [ZLayer.walls]: create(),
      [ZLayer.decoration]: create(),
      [ZLayer.trees]: create(),
      [ZLayer.events]: create(),
      [ZLayer.roofs]: create()
    } as Record<ZLayer, (PIXI.Container | null)[][]>
  }
}
