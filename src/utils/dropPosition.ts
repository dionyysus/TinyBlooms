/**
 * Converts a viewport pointer position to percentage coordinates inside a
 * placement box (the studio hero), then clamps to a small symmetric edge inset
 * so emoji blooms rarely clip half-off the card edges.
 */

/** Fraction of width/height to reserve on each edge (~3%). */
const EDGE_INSET_FRAC = 0.03

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

/** Clamp normalized percentage coords (0–100); same helper for drops and drags. */
export function clampPlacementPercent(
  xPct: number,
  yPct: number,
): { xPct: number; yPct: number } {
  const lo = EDGE_INSET_FRAC * 100
  const hi = 100 - EDGE_INSET_FRAC * 100
  return {
    xPct: clamp(xPct, lo, hi),
    yPct: clamp(yPct, lo, hi),
  }
}

export function clientToClampedPlacementPercent(
  clientX: number,
  clientY: number,
  placementRect: DOMRectReadOnly,
): { xPct: number; yPct: number } {
  const xPctRaw =
    ((clientX - placementRect.left) / Math.max(placementRect.width, 1)) * 100
  const yPctRaw =
    ((clientY - placementRect.top) / Math.max(placementRect.height, 1)) * 100

  return clampPlacementPercent(xPctRaw, yPctRaw)
}
