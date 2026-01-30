import type { ZEventGraphic } from '@engine/types'

export const DEFAULT_PLAYER_GRAPHIC: ZEventGraphic = {
  assetId: 'img/characters/character.png',
  group: 'character',
  x: 0,
  y: 0,
  w: 1,
  h: 1
}

export const TILESETS = [
  { id: 'A1', url: 'img/tilesets/World_A1.png' },
  { id: 'A2', url: 'img/tilesets/World_A2.png' },
  { id: 'A3', url: 'img/tilesets/World_A3.png' },
  { id: 'A4', url: 'img/tilesets/World_A4.png' },
  { id: 'A5', url: 'img/tilesets/World_A5.png' },
  { id: 'B', url: 'img/tilesets/World_B.png' },
  { id: 'C', url: 'img/tilesets/World_C.png' },
  { id: 'D', url: 'img/tilesets/World_D.png' },
  { id: 'Roofs', url: 'img/tilesets/Roofs.png' }
]
