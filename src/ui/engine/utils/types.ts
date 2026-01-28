/* eslint-disable @typescript-eslint/no-unused-vars */
export abstract class ZSystem {
  onBoot(): void {
    /* Boot */
  }
  onSetup(): void {
    /* Setup */
  }
  onPreUpdate(_delta: number): void {
    /* Pre Update */
  }
  onUpdate(_delta: number): void {
    /* Update */
  }
  onPostUpdate(_delta: number): void {
    /* Post Update */
  }
  onDestroy(): void {
    /* Destroy */
  }
}

export type TileCoords = { x: number; y: number }
