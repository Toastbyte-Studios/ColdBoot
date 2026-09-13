import { Platform } from 'react-native';

/**
 * Height of the bottom tab bar, excluding the safe-area inset beneath it.
 *
 * Screens add this as bottom padding so content scrolls clear of the bar.
 * Prefer `useFooterClearance()` in new code: it adds the device's bottom
 * inset, which this bare constant cannot know about.
 *
 * iOS is the 82pt blurred tab bar; Android the 80dp M3 navigation bar.
 */
export const FOOTER_HEIGHT = Platform.select({ android: 80, default: 82 })!;
export const SCROLL_PADDING = 20;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

/** Horizontal gutter from the screen edge to content. */
export const SCREEN_GUTTER = 16;

/**
 * Side padding `ScreenContainer` puts around every screen.
 *
 * Exported so that screens with full-bleed content — Android's list items run
 * edge to edge — can cancel it with a matching negative margin rather than
 * hardcoding the number in two places.
 */
export const SCREEN_INSET = 10;

/**
 * Gutter for text that sits directly on the screen ground rather than inside a
 * container — screen titles, section eyebrows, supporting lines.
 *
 * On Android that text is full-bleed, so it carries its own 20dp gutter; on
 * iOS it sits inside the same inset the cards use.
 */
export const TEXT_GUTTER = Platform.select({
  android: 20,
  default: SCREEN_GUTTER,
})!;

/**
 * Grouped-list row metrics. `ROW_MIN_HEIGHT` is a floor, not a fixed height:
 * rows grow when Dynamic Type scales their labels up.
 *
 * iOS rows are 60pt inside an inset group; Android's are 72dp and full-bleed.
 */
export const ROW_MIN_HEIGHT = Platform.select({ android: 72, default: 60 })!;
export const ROW_PADDING_VERTICAL = 12;
export const ROW_PADDING_HORIZONTAL = Platform.select({
  android: 16,
  default: 14,
})!;

/** Diameter of the floating SOS action. Android's extended FAB is 56dp tall. */
export const SOS_SIZE = Platform.select({ android: 56, default: 62 })!;

/**
 * Corner radii, by the surface each one belongs to.
 *
 * Material 3 is flatter and more uniform than the iOS pass: containers and
 * cards share one 12dp radius, sheets open to 28dp, and the FAB takes the
 * large-button 16dp rather than a full circle.
 */
export const RADIUS = Platform.select({
  android: {
    /** Grouped list container. */
    group: 12,
    /** Feature card (solar cycle, daylight). */
    card: 12,
    /** Icon container inside a row — a full circle on Android. */
    tile: 20,
    /** Small icon container. */
    tileSmall: 18,
    /** Pills and toggles. */
    pill: 16,
    /** Chips and small buttons. */
    chip: 8,
    /** The extended SOS FAB. */
    sos: 16,
    /** Top corners of a bottom sheet. */
    sheet: 28,
  },
  default: {
    /** Grouped list container. */
    group: 18,
    /** Feature card (solar cycle, daylight). */
    card: 20,
    /** 36px icon tile inside a row. */
    tile: 11,
    /** 34px icon tile — nav bar mark, tool rows. */
    tileSmall: 10,
    /** Pills and toggles. */
    pill: 16,
    /** Chips and small buttons. */
    chip: 8,
    /** SOS circle: half of SOS_SIZE. */
    sos: 31,
    /** Top corners of a bottom sheet. */
    sheet: 24,
  },
})!;
