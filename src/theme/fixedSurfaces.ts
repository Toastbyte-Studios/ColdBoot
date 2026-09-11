/**
 * Colours that deliberately do **not** follow the colour scheme.
 *
 * Most of the app should read colours from `useTheme()`. These two exist for
 * surfaces that hold fixed-colour raster content, where following the scheme
 * would make the content unreadable or — worse — produce artefacts that
 * persist after the scheme changes back.
 *
 * Current users:
 *
 * - `SketchCanvas` draws dark strokes on a light pad and saves the result as
 *   a base64 PNG. The pen and pad colours are baked into every sketch the
 *   user has ever saved. A theme-aware canvas would produce two incompatible
 *   kinds of sketch, and every existing one would replay onto the wrong
 *   background.
 * - `KnotStepCarousel` shows knot diagrams sourced from Wikimedia, which are
 *   dark line art on transparency. On a dark card they disappear.
 * - `MoonPhaseGlyph` draws the physical moon: the lit side is `PAPER` and the
 *   shadowed side `INK`, so a waxing crescent reads the same way round in
 *   both schemes. Following the scheme would invert the phase.
 *
 * The values match the light scheme's `PRIMARY_LIGHT` and `PRIMARY_DARK`, so
 * nothing changes visually today. They are duplicated rather than imported
 * from the light palette on purpose: these surfaces should not move if
 * somebody retunes the light scheme.
 *
 * See docs/NATIVE_REDESIGN.md finding 4.
 */

/** Fixed light surface for content that is authored dark-on-light. */
export const PAPER = '#F7FAFC';

/** Fixed dark stroke colour for content drawn onto PAPER. */
export const INK = '#1D1F20';
