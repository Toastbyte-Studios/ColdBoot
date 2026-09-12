/**
 * Height of the bottom tab bar, excluding the safe-area inset beneath it.
 *
 * Screens add this as bottom padding so content scrolls clear of the bar.
 * Prefer `useFooterClearance()` in new code: it adds the device's bottom
 * inset, which this bare constant cannot know about.
 */
export const FOOTER_HEIGHT = 82;
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
 * Grouped-list row metrics. `ROW_MIN_HEIGHT` is a floor, not a fixed height:
 * rows grow when Dynamic Type scales their labels up.
 */
export const ROW_MIN_HEIGHT = 60;
export const ROW_PADDING_VERTICAL = 12;
export const ROW_PADDING_HORIZONTAL = 14;

/** Diameter of the floating SOS action. */
export const SOS_SIZE = 62;

/** Corner radii, by the surface each one belongs to. */
export const RADIUS = {
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
  /** SOS circle: half of SOS_SIZE. */
  sos: 31,
  /** Top corners of a bottom sheet. */
  sheet: 24,
} as const;
