interface ZActor {
  id: number
  name: string
  nickname: string
  classId: number
  initialLevel: number
  maxLevel: number
  profile: string
  face: string
  character: string
}

interface TileSelection {
  x: number
  y: number
  w: number
  h: number
  tilesetId: string
  isAutotile: boolean
  isWall?: boolean
}

interface ZEvent {
  id: string
  name: string
  x: number
  y: number
  graphic: TileSelection | null
  pages: unknown[]
}

interface ZMap {
  id: number
  name: string
  width: number
  height: number
  layers: Record<
    ZLayer,
    {
      icon: string
      data: (TileSelection[] | null)[][]
      index: number
    }
  >
  events: ZEvent[]
}
