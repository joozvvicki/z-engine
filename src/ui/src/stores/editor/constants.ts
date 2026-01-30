import imgA1 from '@ui/assets/img/tilesets/World_A1.png'
import imgA2 from '@ui/assets/img/tilesets/World_A2.png'
import imgA3 from '@ui/assets/img/tilesets/World_A3.png'
import imgA4 from '@ui/assets/img/tilesets/World_A4.png'
import imgA5 from '@ui/assets/img/tilesets/World_A5.png'
import imgB from '@ui/assets/img/tilesets/World_B.png'
import imgC from '@ui/assets/img/tilesets/World_C.png'
import imgD from '@ui/assets/img/tilesets/World_D.png'
import roofs from '@ui/assets/img/tilesets/Roofs.png'

import type { ZEventGraphic } from '@engine/types'

export const DEFAULT_PLAYER_GRAPHIC: ZEventGraphic = {
  assetId: '@ui/assets/img/characters/character.png',
  group: 'character',
  x: 0,
  y: 0,
  w: 1,
  h: 1
}

export const TILESETS = [
  { id: 'A1', url: imgA1 },
  { id: 'A2', url: imgA2 },
  { id: 'A3', url: imgA3 },
  { id: 'A4', url: imgA4 },
  { id: 'A5', url: imgA5 },
  { id: 'B', url: imgB },
  { id: 'C', url: imgC },
  { id: 'D', url: imgD },
  { id: 'Roofs', url: roofs }
]
