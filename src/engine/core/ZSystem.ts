/* eslint-disable @typescript-eslint/no-unused-vars */
export enum SystemMode {
  ALWAYS = 'always',
  PLAY = 'play',
  EDIT = 'edit'
}

export abstract class ZSystem {
  public updateMode: SystemMode = SystemMode.ALWAYS

  // Lifecycle methods
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
