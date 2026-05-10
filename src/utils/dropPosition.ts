/**
 * Converts a viewport pointer position to percentage coordinates inside a
 * placement box (the studio hero), then clamps to the full 0–100% range so the
 * entire bloomPlacementEl maps to placement coords (blooms may sit flush at edges).
 */

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

/** Clamp normalized percentage coords (0–100); same helper for drops and drags. */
export function clampPlacementPercent(
  xPct: number,
  yPct: number,
): { xPct: number; yPct: number } {
  return {
    xPct: clamp(xPct, 0, 100),
    yPct: clamp(yPct, 0, 100),
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
