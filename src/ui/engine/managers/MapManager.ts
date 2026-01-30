import { ZEvent, ZMap } from '@engine/types'

export class MapManager {
  public currentMap: ZMap | null = null

  public setMap(map: ZMap): void {
    this.currentMap = map
  }

  public getEventsAt(x: number, y: number): ZEvent[] {
    if (!this.currentMap) return []
    return this.currentMap.events.filter((e) => e.x === x && e.y === y)
  }
}
