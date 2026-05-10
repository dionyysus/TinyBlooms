/**
 * Shared layout constants for VaseCanvas (studio) and PreviewScene.
 *
 * The bloom placement surface uses the **full width** of its parent card and a
 * fixed height (`BOUQUET_SCENE_H`) so xPct/yPct map identically in studio and
 * preview for the same container width.
 */

/** Height of the wrapper SVG image in px — identical in studio and preview. */
export const WRAPPER_H = 420

/** Fixed height of the bloom placement zone (wrapper + blooms stack). Width is fluid (`w-full`). */
export const BOUQUET_SCENE_H = 420
