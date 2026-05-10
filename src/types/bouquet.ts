export type ShelfTab = 'flowers' | 'wrappers'

/** Steps in the bouquet flow: studio (build), letter (write note), preview (final scene) */
export type Step = 'studio' | 'letter' | 'preview'

export type FlowerId =
  | 'pink-lily'
  | 'red-poppy'
  | 'blue-cornflower'
  | 'pink-wildflower'
  | 'sage-leaf'
  | 'pink-ginkgo'
  | 'yellow-rose'

export interface Flower {
  id: FlowerId
  name: string
  imagePath: string
  /** emoji kept as optional fallback */
  emoji?: string
  /** subtle tint applied to the card background gradient */
  tint: {
    from: string
    to: string
    ring: string
  }
}

export type WrapperId = 'paper' | 'tulle' | 'cellophane'

export interface Wrapper {
  id: WrapperId
  name: string
  description: string
  imagePath: string
}

/** A flower placed in the bouquet at the user's drop point, with light variation. */
export interface PlacedFlower {
  instanceId: string
  flowerId: FlowerId
  /** horizontal position inside the bloom placement layer, 0–100% (center-anchored) */
  xPct: number
  /** vertical position inside the bloom placement layer, 0–100% (center-anchored) */
  yPct: number
  /** rotation in degrees */
  rotation: number
  /** scale multiplier */
  scale: number
}
