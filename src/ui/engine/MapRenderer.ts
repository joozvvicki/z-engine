import { TileSelection, ZLayer, ZMap, ZTool } from '@ui/stores/editor'
import * as PIXI from 'pixi.js'
import 'pixi.js/unsafe-eval'

export class MapRenderer {
  public app: PIXI.Application
  private tileSize: number

  private currentMapData: ZMap | null = null
  private mapWidth: number
  private mapHeight: number

  private mapContainer: PIXI.Container
  private gridGraphics: PIXI.Graphics
  private layers: Record<ZLayer, PIXI.Container>
  private tilesetTextures: Map<string, PIXI.Texture> = new Map()

  private tileSprites: Record<ZLayer, (PIXI.Sprite | null)[][]>
  private ghostContainer: PIXI.Container = new PIXI.Container()

  constructor(tileSize: number = 48, width: number = 20, height: number = 15) {
    this.tileSize = tileSize
    this.mapWidth = width
    this.mapHeight = height

    PIXI.TextureSource.defaultOptions.scaleMode = 'nearest'

    this.app = new PIXI.Application()
    this.mapContainer = new PIXI.Container()
    this.gridGraphics = new PIXI.Graphics()

    this.layers = {
      [ZLayer.ground]: new PIXI.Container(),
      [ZLayer.walls]: new PIXI.Container(),
      [ZLayer.decoration]: new PIXI.Container(),
      [ZLayer.events]: new PIXI.Container(),
      [ZLayer.trees]: new PIXI.Container(),
      [ZLayer.roofs]: new PIXI.Container()
    }

    this.tileSprites = {
      [ZLayer.ground]: this.createEmptyArray(),
      [ZLayer.walls]: this.createEmptyArray(),
      [ZLayer.decoration]: this.createEmptyArray(),
      [ZLayer.events]: this.createEmptyArray(),
      [ZLayer.trees]: this.createEmptyArray(),
      [ZLayer.roofs]: this.createEmptyArray()
    }
  }

  public async init(container: HTMLElement): Promise<void> {
    await this.app.init({
      resizeTo: container,
      backgroundColor: 0xffffff,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1
    })
    container.appendChild(this.app.canvas)

    this.app.stage.eventMode = 'static'
    this.app.stage.hitArea = this.app.screen

    this.setupScene()
  }

  private setupScene(): void {
    this.drawGrid()
    this.mapContainer.addChild(
      ...Object.values(this.layers).sort((a, b) => a.zIndex - b.zIndex),
      this.ghostContainer,
      this.gridGraphics
    )
    this.app.stage.addChild(this.mapContainer)
  }

  public async loadTileset(id: string, url: string): Promise<void> {
    try {
      const texture = await PIXI.Assets.load(url)
      this.tilesetTextures.set(id, texture)
    } catch (e) {
      console.error(`Failed to load tileset ${id}`, e)
    }
  }

  // Dodaj do klasy MapRenderer
  private playerSprite: PIXI.Sprite | null = null

  public setupPlayer(pos: { x: number; y: number }): void {
    // Jeśli gracz już istnieje, usuwamy go
    if (this.playerSprite) {
      this.layers.events.removeChild(this.playerSprite)
      this.playerSprite.destroy()
    }

    // Tworzymy tymczasowy sprite gracza (np. biały kwadrat lub kafelek)
    const graphics = new PIXI.Graphics()
      .rect(0, 0, this.tileSize, this.tileSize)
      .fill({ color: 0x3b82f6 }) // Niebieski kolor gracza
      .stroke({ width: 2, color: 0xffffff })

    // Generujemy teksturę z grafiki (v8 way)
    const texture = this.app.renderer.generateTexture(graphics)
    this.playerSprite = new PIXI.Sprite(texture)

    this.layers.events.addChild(this.playerSprite)
    this.updatePlayerPosition(pos.x, pos.y)
  }

  public updatePlayerPosition(x: number, y: number): void {
    if (this.playerSprite) {
      this.playerSprite.x = x * this.tileSize
      this.playerSprite.y = y * this.tileSize
    }
  }

  public removePlayer(): void {
    if (this.playerSprite) {
      this.layers.events.removeChild(this.playerSprite)
      this.playerSprite = null
    }
  }
  /**
   * Oblicza przesunięcie (offset) wewnątrz bloku autotile dla konkretnej ćwiartki.
   * Obsługuje specyficzne układy A1, A2, A3 oraz nieregularne rzędy A4.
   */
  private getQuadrantOffset(
    x: number,
    y: number,
    qx: number,
    qy: number,
    sel: TileSelection,
    layer: ZLayer
  ): { x: number; y: number } {
    // 1. Kierunki sprawdzenia sąsiadów dla konkretnej ćwiartki
    const dx = qx === 0 ? -1 : 1 // Lewo dla ćwiartek lewych, prawo dla prawych
    const dy = qy === 0 ? -1 : 1 // Góra dla ćwiartek górnych, dół dla dolnych

    const hasH = this.isSameTile(x + dx, y, layer, sel) // Sąsiad Poziomy
    const hasV = this.isSameTile(x, y + dy, layer, sel) // Sąsiad Pionowy
    const hasD = this.isSameTile(x + dx, y + dy, layer, sel) // Sąsiad po skosie (Diagonal)

    // 2. ROZPOZNANIE TYPU AUTOTILE
    // W A4 rzędy o wysokości 2 i 4 to ŚCIANY. Rzędy o wysokości 3 to SUFITY.
    const isA3 = sel.tilesetId === 'A3'
    const isA4Wall = sel.tilesetId === 'A4' && (sel.y === 3 || sel.y === 8 || sel.y === 13)

    if (isA3 || isA4Wall) {
      if (qx === 0 && qy === 0)
        return { x: hasH ? this.tileSize / 2 : 0, y: hasV ? this.tileSize / 2 : 0 }
      if (qx === 1 && qy === 0)
        return { x: hasH ? this.tileSize : this.tileSize * 1.5, y: hasV ? this.tileSize / 2 : 0 }

      if (qx === 0 && qy === 1) {
        return { x: hasH ? this.tileSize / 2 : 0, y: !hasV ? this.tileSize * 1.5 : 24 }
      }

      if (qx === 1 && qy === 1) {
        return {
          x: hasH ? this.tileSize : this.tileSize * 1.5,
          y: !hasV ? this.tileSize * 1.5 : 24
        }
      }
    }

    // --- LOGIKA DLA SUFITÓW/ANIMACJI (A1, A2 oraz rzędy 2x3 w A4) ---
    /**
     * Używamy pełnej matrycy 5-stanowej RPG Maker (Corner, H-Edge, V-Edge, Inner, Fill).
     * Współrzędne są relatywne do bloku autotile wybranego w selektorze.
     */

    // TOP-LEFT (qx: 0, qy: 0)
    if (qx === 0 && qy === 0) {
      if (!hasH && !hasV) return { x: 0, y: this.tileSize } // Narożnik zewnętrzny
      if (hasH && !hasV) return { x: this.tileSize, y: this.tileSize } // Krawędź pozioma
      if (!hasH && hasV) return { x: 0, y: this.tileSize * 2 } // Krawędź pionowa
      if (hasH && hasV && !hasD) return { x: this.tileSize, y: 0 } // Narożnik wewnętrzny
      return { x: this.tileSize, y: this.tileSize * 2 } // Środek (Fill)
    }

    // TOP-RIGHT (qx: 1, qy: 0)
    if (qx === 1 && qy === 0) {
      if (!hasH && !hasV) return { x: this.tileSize * 1.5, y: this.tileSize }
      if (hasH && !hasV) return { x: this.tileSize / 2, y: this.tileSize }
      if (!hasH && hasV) return { x: this.tileSize * 1.5, y: this.tileSize * 2 }
      if (hasH && hasV && !hasD) return { x: this.tileSize * 1.5, y: 0 }
      return { x: this.tileSize / 2, y: this.tileSize * 2 }
    }

    // BOTTOM-LEFT (qx: 0, qy: 1)
    if (qx === 0 && qy === 1) {
      if (!hasH && !hasV) return { x: 0, y: this.tileSize * 2.5 }
      if (hasH && !hasV) return { x: this.tileSize, y: this.tileSize * 2.5 }
      if (!hasH && hasV) return { x: 0, y: this.tileSize * 1.5 }
      if (hasH && hasV && !hasD) return { x: this.tileSize, y: this.tileSize / 2 }
      return { x: this.tileSize, y: this.tileSize * 1.5 }
    }

    // BOTTOM-RIGHT (qx: 1, qy: 1)
    if (qx === 1 && qy === 1) {
      if (!hasH && !hasV) return { x: this.tileSize * 1.5, y: this.tileSize * 2.5 }
      if (hasH && !hasV) return { x: this.tileSize / 2, y: this.tileSize * 2.5 }
      if (!hasH && hasV) return { x: this.tileSize * 1.5, y: this.tileSize * 1.5 }
      if (hasH && hasV && !hasD) return { x: this.tileSize * 1.5, y: this.tileSize / 2 }
      return { x: this.tileSize / 2, y: this.tileSize * 1.5 }
    }

    return { x: 0, y: 0 } // Default fill
  }

  private isSameTile(x: number, y: number, layer: ZLayer, sel: TileSelection): boolean {
    if (!this.currentMapData) return false
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return true

    const tile = this.currentMapData.layers[layer].data[y][x]
    return tile !== null && tile.tilesetId === sel.tilesetId && tile.x === sel.x && tile.y === sel.y
  }

  public drawTile(x: number, y: number, selection: TileSelection, layer: ZLayer): void {
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return
    this.clearTileAt(x, y, layer)

    const tex = this.tilesetTextures.get(selection.tilesetId)
    if (!tex) return

    const container = new PIXI.Container()
    const tsId = selection.tilesetId

    if (selection.isAutotile && ['A1', 'A2', 'A3', 'A4'].includes(tsId)) {
      const isA1 = tsId === 'A1'
      let frameCount = 1

      if (isA1) {
        const blockXIndex = Math.floor(selection.x / 2)
        if (blockXIndex !== 3) frameCount = 3
      }

      for (let qy = 0; qy < 2; qy++) {
        for (let qx = 0; qx < 2; qx++) {
          const offset = this.getQuadrantOffset(x, y, qx, qy, selection, layer)
          const textures: PIXI.Texture[] = []

          for (let i = 0; i < frameCount; i++) {
            const animOffset = isA1 ? i * (this.tileSize * 2) : 0
            const frameX = selection.x * this.tileSize + animOffset + offset.x
            const frameY = selection.y * this.tileSize + offset.y

            textures.push(
              new PIXI.Texture({
                source: tex.source,
                frame: new PIXI.Rectangle(frameX, frameY, this.tileSize / 2, this.tileSize / 2)
              })
            )
          }

          if (textures.length > 1) {
            const anim = new PIXI.AnimatedSprite(textures)
            anim.x = qx * (this.tileSize / 2)
            anim.y = qy * (this.tileSize / 2)
            anim.animationSpeed = 0.025
            anim.play()
            container.addChild(anim)
          } else {
            const sprite = new PIXI.Sprite(textures[0])
            sprite.x = qx * (this.tileSize / 2)
            sprite.y = qy * (this.tileSize / 2)
            container.addChild(sprite)
          }
        }
      }
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
      container.addChild(sprite)
    }

    container.x = x * this.tileSize
    container.y = y * this.tileSize
    this.layers[layer].addChild(container)
    this.tileSprites[layer][y][x] = container as PIXI.Sprite
  }

  public placeSelection(mx: number, my: number, sel: TileSelection, l: ZLayer): void {
    if (sel.isAutotile) {
      this.drawTile(mx, my, sel, l)
      return
    }

    for (let ox = 0; ox < sel.w; ox++) {
      for (let oy = 0; oy < sel.h; oy++) {
        const currentSel = { ...sel, x: sel.x + ox, y: sel.y + oy, w: 1, h: 1 }
        this.drawTile(mx + ox, my + oy, currentSel, l)
      }
    }
  }

  public clearTileAt(x: number, y: number, layer: ZLayer): void {
    const existing = this.tileSprites[layer][y][x]
    if (existing) {
      this.layers[layer].removeChild(existing)
      existing.destroy()
      this.tileSprites[layer][y][x] = null
    }
  }

  public renderMapFromStore(mapData: ZMap): void {
    this.currentMapData = mapData
    Object.keys(this.layers).forEach((key) => {
      this.layers[key as ZLayer].removeChildren()
      this.tileSprites[key as ZLayer] = this.createEmptyArray()
    })

    const layersOrder: ZLayer[] = [
      ZLayer.ground,
      ZLayer.walls,
      ZLayer.decoration,
      ZLayer.events,
      ZLayer.trees,
      ZLayer.roofs
    ]
    layersOrder.forEach((layer) => {
      const grid = mapData.layers[layer].data
      for (let y = 0; y < mapData.height; y++) {
        for (let x = 0; x < mapData.width; x++) {
          const tile = grid[y][x]
          if (tile) this.drawTile(x, y, tile, layer)
        }
      }
    })
  }

  public getTileCoordsFromEvent(e: PIXI.FederatedPointerEvent): { x: number; y: number } | null {
    const l = this.mapContainer.toLocal(e.global)
    const x = Math.floor(l.x / this.tileSize)
    const y = Math.floor(l.y / this.tileSize)
    return x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight ? { x, y } : null
  }

  public clearSelection(mx: number, my: number, sel: TileSelection, l: ZLayer): void {
    for (let ox = 0; ox < sel.w; ox++) {
      for (let oy = 0; oy < sel.h; oy++) {
        this.clearTileAt(mx + ox, my + oy, l)
      }
    }
  }

  public hideGhost(): void {
    this.ghostContainer.visible = false
  }

  public drawGrid(): void {
    this.gridGraphics.clear()
    this.gridGraphics.rect(0, 0, this.mapWidth * this.tileSize, this.mapHeight * this.tileSize)
    for (let x = 0; x <= this.mapWidth; x++) {
      this.gridGraphics
        .moveTo(x * this.tileSize, 0)
        .lineTo(x * this.tileSize, this.mapHeight * this.tileSize)
        .stroke({ width: 1, color: 0x000000, alpha: 0.05 })
    }
    for (let y = 0; y <= this.mapHeight; y++) {
      this.gridGraphics
        .moveTo(0, y * this.tileSize)
        .lineTo(this.mapWidth * this.tileSize, y * this.tileSize)
        .stroke({ width: 1, color: 0x000000, alpha: 0.05 })
    }
  }

  // --- Wewnątrz MapRenderer.ts ---

  // Pomocnicza funkcja do sprawdzania, czy dwa kafelki są identyczne
  private tilesMatch(t1: TileSelection | null, t2: TileSelection | null): boolean {
    if (!t1 && !t2) return true
    if (!t1 || !t2) return false
    return t1.tilesetId === t2.tilesetId && t1.x === t2.x && t1.y === t2.y
  }

  public floodFill(
    startX: number,
    startY: number,
    newTile: TileSelection,
    layer: ZLayer,
    store: ReturnType<typeof import('@ui/stores/editor').useEditorStore>
  ): void {
    const grid = this.currentMapData?.layers[layer].data
    if (!grid) return

    const targetTile = grid[startY][startX]
    if (targetTile && this.tilesMatch(targetTile, newTile)) return

    const queue: [number, number][] = [[startX, startY]]
    const visited = new Set<string>()

    while (queue.length > 0) {
      const [x, y] = queue.shift()!
      const key = `${x},${y}`

      if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) continue
      if (visited.has(key)) continue
      if (!this.tilesMatch(grid[y][x], targetTile)) continue

      visited.add(key)

      // Aktualizacja renderer i store
      this.drawTile(x, y, newTile, layer)
      store.setTileAt(x, y, newTile)

      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
    }
  }
  // --- Wewnątrz MapRenderer.ts ---

  public updateGhost(tx: number, ty: number, sel: TileSelection, special?: ZTool): void {
    this.ghostContainer.removeChildren()
    this.ghostContainer.visible = true

    // Ważne: Standardowy duszek przesuwa CAŁY kontener do kafelka
    this.ghostContainer.x = tx * this.tileSize
    this.ghostContainer.y = ty * this.tileSize

    if (special === ZTool.eraser) {
      const g = new PIXI.Graphics()
        .rect(0, 0, this.tileSize, this.tileSize)
        .fill({ color: 0xff0000, alpha: 0.3 })
        .stroke({ width: 1, color: 0xff0000, alpha: 0.5 })
      this.ghostContainer.addChild(g)
    } else if (special === ZTool.event) {
      const g = new PIXI.Graphics()
        .rect(0, 0, this.tileSize, this.tileSize)
        .fill({ color: 0x0000ff, alpha: 0.3 })
        .stroke({ width: 1, color: 0x0000ff, alpha: 0.5 })
      this.ghostContainer.addChild(g)
    } else {
      const t = this.tilesetTextures.get(sel.tilesetId)
      if (t) {
        const s = new PIXI.Sprite(
          new PIXI.Texture({
            source: t.source,
            frame: new PIXI.Rectangle(
              sel.x * this.tileSize,
              sel.y * this.tileSize,
              !sel.isAutotile ? sel.w * this.tileSize : this.tileSize,
              !sel.isAutotile ? sel.h * this.tileSize : this.tileSize
            )
          })
        )
        s.alpha = 0.5
        this.ghostContainer.addChild(s)
      }
    }
  }

  public updateShapeGhost(
    start: { x: number; y: number },
    end: { x: number; y: number },
    tool: ZTool
  ): void {
    this.ghostContainer.removeChildren()

    // Ważne: Przy kształtach resetujemy X/Y kontenera, bo rysujemy
    // Graphics na absolutnych współrzędnych mapy
    this.ghostContainer.x = 0
    this.ghostContainer.y = 0

    const graphics = new PIXI.Graphics()

    const x = Math.min(start.x, end.x) * this.tileSize
    const y = Math.min(start.y, end.y) * this.tileSize
    const w = (Math.abs(start.x - end.x) + 1) * this.tileSize
    const h = (Math.abs(start.y - end.y) + 1) * this.tileSize

    // Składnia PIXI v8: Rysujemy kształt, a potem nakładamy wypełnienie i obrys
    if (tool === 'rectangle') {
      graphics.rect(x, y, w, h)
    } else if (tool === 'circle') {
      graphics.ellipse(x + w / 2, y + h / 2, w / 2, h / 2)
    }

    graphics.fill({ color: 0x00ff00, alpha: 0.2 }).stroke({ width: 2, color: 0x00ff00, alpha: 0.6 })

    this.ghostContainer.addChild(graphics)
    this.ghostContainer.visible = true
  }

  private createEmptyArray(): (PIXI.Sprite | null)[][] {
    return Array.from({ length: this.mapHeight }, () => Array(this.mapWidth).fill(null))
  }

  public destroy(): void {
    this.app.destroy({ removeView: true })
  }
}
