/**
 * Color math shared by the interactive components.
 *
 * These live in `theme/` rather than next to a component because more than one
 * control needs them: filled buttons need a readable label color, and every
 * pressable needs a translucent ripple derived from its own tint.
 */

const HEX = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i;

/** Ink and paper: the only two label colors a filled surface ever gets. */
const INK = '#101B24';
const PAPER = '#FFFFFF';

function channels(hex: string): [number, number, number] | null {
  const match = HEX.exec(hex.trim());
  if (!match) return null;
  return [
    parseInt(match[1], 16),
    parseInt(match[2], 16),
    parseInt(match[3], 16),
  ];
}

/**
 * WCAG relative luminance. Returns 0 for anything that isn't a six-digit hex
 * value, which is the safe direction: an unparseable color falls back to being
 * treated as dark, so it gets a light label.
 */
export function relativeLuminance(hex: string): number {
  const rgb = channels(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colors, from 1 (identical) to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Picks the more readable label color for a filled surface by comparing actual
 * contrast ratios.
 *
 * Comparing ratios rather than thresholding luminance matters for the
 * mid-luminance tints: the dark scheme's SUCCESS (#4CA891) sits just below a
 * naive 0.45 cutoff and would get white at 2.9:1, when ink gives it 6.1:1.
 */
export function onColor(background: string): string {
  return contrastRatio(background, INK) >= contrastRatio(background, PAPER)
    ? INK
    : PAPER;
}

/**
 * Converts a hex color to `rgba()` at the given alpha. Values that aren't hex
 * (`'transparent'`, an existing `rgba()` string) pass through untouched.
 */
export function withAlpha(hex: string, alpha: number): string {
  const rgb = channels(hex);
  if (!rgb) return hex;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}
