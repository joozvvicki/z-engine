interface ZSystem {
  onBoot(): void
  onSetup(): void
  onPreUpdate(delta: number): void
  onUpdate(delta: number): void
  onPostUpdate(delta: number): void
  onDestroy(): void
}
