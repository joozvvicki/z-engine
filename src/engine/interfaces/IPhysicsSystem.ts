export interface IObstacleProvider {
  isOccupied(
    x: number,
    y: number,
    options?: { isThrough?: boolean; skipPlayer?: boolean; excludeId?: string }
  ): boolean
}

export interface IPhysicsSystem {
  registerProvider(provider: IObstacleProvider): void
  isPassable(x: number, y: number, options?: { isThrough?: boolean; skipPlayer?: boolean }): boolean
  checkPassage(
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    options?: { isThrough?: boolean; skipPlayer?: boolean }
  ): boolean
}
