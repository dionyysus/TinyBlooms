/**
 * Shared layout constants used by both VaseCanvas (studio) and PreviewScene.
 *
 * The bloom placement surface MUST be the same fixed pixel size in both
 * components so that xPct/yPct coordinates map to identical screen positions.
 */

/** Height of the wrapper SVG image in px — identical in studio and preview. */
export const WRAPPER_H = 420

/**
 * Fixed pixel dimensions of the bloom placement container.
 * xPct and yPct are percentages of this rect, so it must never change
 * between the studio and the preview.
 */
export const BOUQUET_SCENE_W = 360
export const BOUQUET_SCENE_H = 420
