import type { Flower } from '../types/bouquet'

export const FLOWERS: Flower[] = [
  {
    id: 'pink-lily',
    name: 'Pink Lily',
    imagePath: '/flowers/pink-lily.png',
    tint: { from: '#fde6e1', to: '#f6c5bb', ring: '#e8a094' },
  },
  {
    id: 'red-poppy',
    name: 'Red Poppy',
    imagePath: '/flowers/red-poppy.png',
    tint: { from: '#fde8e8', to: '#f5bfbf', ring: '#e09090' },
  },
  {
    id: 'blue-cornflower',
    name: 'Blue Cornflower',
    imagePath: '/flowers/blue-cornflower.png',
    tint: { from: '#e4f0ee', to: '#bbd8d3', ring: '#7db8b0' },
  },
  {
    id: 'pink-wildflower',
    name: 'Pink Wildflower',
    imagePath: '/flowers/pink-wildflower.png',
    tint: { from: '#fce7ee', to: '#f6cad9', ring: '#e6a3bb' },
  },
  {
    id: 'sage-leaf',
    name: 'Sage Leaf',
    imagePath: '/flowers/sage-leaf.png',
    tint: { from: '#e8ede1', to: '#ccdbc1', ring: '#9ab88a' },
  },
  {
    id: 'pink-ginkgo',
    name: 'Pink Ginkgo',
    imagePath: '/flowers/pink-ginkgo.png',
    tint: { from: '#fbe1ec', to: '#f0bfd6', ring: '#e497b9' },
  },
  {
    id: 'yellow-rose',
    name: 'Yellow Rose',
    imagePath: '/flowers/yellow-rose.png',
    tint: { from: '#fbeecb', to: '#f3d68a', ring: '#dfb04a' },
  },
]

export const FLOWERS_BY_ID: Record<string, Flower> = Object.fromEntries(
  FLOWERS.map((f) => [f.id, f]),
)
