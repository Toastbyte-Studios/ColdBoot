/**
 * ColdBoot theme tokens.
 *
 * Palette concept — "glacier": the logo's pale-ice ground and graphite
 * bootprint, with steel blue as the brand color. Amber is retained as the
 * single signal color (alerts, active tools) because no blue can carry that
 * role in a survival app; everything structural is cold.
 *
 * Both schemes are drawn from the mark itself:
 *   ice        #DCECF7  light tile, top gradient stop
 *   ice deep   #A9C5DA  light tile, bottom stop / hairlines
 *   ink        #1D1F20  the print in light mode
 *   steel      #2F5875  brand, print shadow
 *   steel pale #8FB6CE  brand in dark mode
 *   slate      #2F4F6B → #1B2F42  dark tile gradient
 */

const LIGHT_COLORS = {
  /** Primary brand color — replaces BRAND. */
  BRAND: '#2F5875',
  BRAND_GRADIENT: ['#5980A6', '#2F5875'],

  /** Foreground / body text. Named DARK for historical reasons: it is the
   *  high-contrast color against BACKGROUND, and inverts in dark mode. */
  PRIMARY_DARK: '#1D1F20',
  /** Raised surfaces and inverted text. */
  PRIMARY_LIGHT: '#F7FAFC',

  /** Signal amber — alerts, active tools, primary actions. */
  ACCENT: '#B45309',
  /** Cold teal — confirmed, stocked, in-range. */
  SECONDARY_ACCENT: '#2F6F7A',

  BACKGROUND: '#DCECF7',
  BACKGROUND_GRADIENT: ['#F1F7FB', '#DCECF7', '#C9DEEC', '#A9C5DA'],

  /** Card and sheet fill, distinct from BACKGROUND. */
  SURFACE: '#F7FAFC',
  /** Hairlines, dividers, input outlines. */
  BORDER: '#A9C5DA',
  /** De-emphasised labels, timestamps, placeholder text. */
  MUTED: '#557286',
  /**
   * De-emphasised text sitting directly on the screen ground rather than on a
   * card — header subtitles, notes, empty-state lines. On iOS the ground is
   * BACKGROUND_GRADIENT, whose top stops sit behind the header and are dark
   * enough that MUTED falls to 2.8–3.7:1. This clears 4.5:1 on every stop.
   */
  MUTED_ON_GROUND: '#384F60',

  /**
   * Row separator inside a grouped list. Lighter than BORDER, which outlines
   * the group as a whole — the hairlines between rows sit inside that outline
   * and must not compete with it.
   */
  SEPARATOR: '#DCECF7',
  /** Disclosure chevrons. Recede further than MUTED: they are affordances, not content. */
  CHEVRON: '#A9C5DA',

  ERROR: '#C62828',
  SUCCESS: '#227A66',
  SUCCESS_LIGHT: '#D2E9E2',
  ERROR_LIGHT: '#F6DAD8',

  /* ---------------------------------------------------------------------- */
  /* Material 3 tonal roles                                                  */
  /*                                                                         */
  /* Android expresses the same palette as flat tonal surfaces rather than    */
  /* gradients and hairline cards, which needs a few steps the iOS pass never */
  /* had a use for. Everything here is a tonal step off a colour that is      */
  /* already above — nothing new enters the palette.                          */
  /* ---------------------------------------------------------------------- */

  /** M3 `surface`. The flat screen ground; iOS paints BACKGROUND_GRADIENT. */
  SURFACE_GROUND: '#EDF4F9',
  /** M3 `surface-container`. Solar card, search bar, sheets. */
  SURFACE_CONTAINER: '#DCECF7',
  /** M3 `surface-container-high`. The navigation bar, one step above the rest. */
  SURFACE_CONTAINER_HIGH: '#E3EEF6',

  /** M3 `outline-variant`. 1dp dividers; quieter than BORDER, which outlines. */
  OUTLINE_VARIANT: '#D5E4EF',

  /** M3 `secondary-container`. Icon circles, the nav pill, selected chips. */
  SECONDARY_CONTAINER: '#C9DEEC',
  ON_SECONDARY_CONTAINER: '#14344B',

  /** M3 `tertiary-container`. Confirmed states — "GPS locked". */
  TERTIARY_CONTAINER: '#CFE6E5',
  ON_TERTIARY_CONTAINER: '#1F4D4F',

  /** Amber container. The active-tool card and the solar alert card. */
  ACCENT_CONTAINER: '#F5E3D2',
  ON_ACCENT_CONTAINER: '#8A4A0C',
};

const DARK_COLORS: typeof LIGHT_COLORS = {
  BRAND: '#8FB6CE',
  BRAND_GRADIENT: ['#2F4F6B', '#8FB6CE'],

  PRIMARY_DARK: '#DCECF7',
  PRIMARY_LIGHT: '#101B24',

  ACCENT: '#FFB020',
  SECONDARY_ACCENT: '#5E9BA8',

  BACKGROUND: '#101B24',
  BACKGROUND_GRADIENT: ['#1B2F42', '#152532', '#0B131A', '#22394D'],

  SURFACE: '#17232E',
  BORDER: '#2C4256',
  MUTED: '#8CA3B4',
  // MUTED already clears 4.5:1 on the dark gradient's lightest stop (#22394D).
  MUTED_ON_GROUND: '#8CA3B4',

  SEPARATOR: '#22313D',
  CHEVRON: '#557286',

  ERROR: '#D8352F',
  SUCCESS: '#4CA891',
  SUCCESS_LIGHT: '#173029',
  ERROR_LIGHT: '#3E2129',

  SURFACE_GROUND: '#101B24',
  SURFACE_CONTAINER: '#17232E',
  SURFACE_CONTAINER_HIGH: '#17232E',

  OUTLINE_VARIANT: '#22313D',

  SECONDARY_CONTAINER: '#2F4F6B',
  ON_SECONDARY_CONTAINER: '#DCECF7',

  TERTIARY_CONTAINER: '#1E4045',
  ON_TERTIARY_CONTAINER: '#9CD3D8',

  // The handoff leaves the dark amber container open; this is the same tonal
  // step below ACCENT that SUCCESS_LIGHT and ERROR_LIGHT take below theirs.
  ACCENT_CONTAINER: '#3A2A12',
  ON_ACCENT_CONTAINER: '#FFB020',
};

export type ThemeColors = typeof LIGHT_COLORS;
// ColorScheme is an alias for ThemeColors, used by useTheme hook for consistency
export type ColorScheme = ThemeColors;

// Default export for backwards compatibility
const COLORS = LIGHT_COLORS;

export default COLORS;
export { LIGHT_COLORS, DARK_COLORS };
