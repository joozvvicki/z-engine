import * as PIXI from 'pixi.js'
import 'pixi.js/unsafe-eval'
import { TextureManager } from '../managers/TextureManager'

export class GridSystem implements ZSystem {
  private container: PIXI.Container
  private gridGraphics: PIXI.Graphics
  private tileSize: number

  constructor(stage: PIXI.Container, _textureManager: TextureManager, tileSize: number) {
    this.container = new PIXI.Container()
    this.container.label = 'GridSystem'
    this.container.zIndex = 100 // Previous ZEngine zIndex for grid
    stage.addChild(this.container)

    this.gridGraphics = new PIXI.Graphics()
    this.container.addChild(this.gridGraphics)
    this.tileSize = tileSize
  }

  public onBoot(): void {}
  public onSetup(): void {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public onPreUpdate(_delta: number): void {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public onUpdate(_delta: number): void {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public onPostUpdate(_delta: number): void {}
  public onDestroy(): void {
    this.container.destroy({ children: true })
  }

  public drawGrid(w: number, h: number): void {
    const g = this.gridGraphics
    g.clear()

    for (let x = 0; x <= w; x++) {
      g.moveTo(x * this.tileSize, 0)
        .lineTo(x * this.tileSize, h * this.tileSize)
        .stroke({ width: 1, color: 0x000000, alpha: 0.1 })
    }
    for (let y = 0; y <= h; y++) {
      g.moveTo(0, y * this.tileSize)
        .lineTo(w * this.tileSize, y * this.tileSize)
        .stroke({ width: 1, color: 0x000000, alpha: 0.1 })
    }
  }
}
