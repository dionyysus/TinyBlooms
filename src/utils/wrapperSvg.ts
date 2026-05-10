export const WRAPPER_VIEWBOX_W = 260
export const WRAPPER_VIEWBOX_H = 440

/** Pixel width for a given rendered height (matches SVG aspect). */
export function wrapperDisplayWidthPx(sceneHeightPx: number): number {
  return (WRAPPER_VIEWBOX_W / WRAPPER_VIEWBOX_H) * sceneHeightPx
}
