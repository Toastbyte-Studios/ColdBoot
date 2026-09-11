import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../hooks/useTheme';
import { withAlpha } from '../theme/colorUtils';
import { INK, PAPER } from '../theme/fixedSurfaces';

interface MoonPhaseGlyphProps {
  /**
   * Lunar phase as returned by suncalc's `getMoonIllumination().phase`:
   * 0 new, 0.25 first quarter, 0.5 full, 0.75 last quarter.
   */
  phase: number;
  /** Diameter in points. @default 28 */
  size?: number;
}

/**
 * Draws the moon at a given phase.
 *
 * Replaces the moon-phase emoji, which resolved from whatever font covered
 * them, differed between iOS and Android, and were announced by name to screen
 * readers. Callers render the phase name as text alongside, so the glyph is
 * hidden from accessibility.
 *
 * The lit and shadowed parts use the fixed `PAPER` and `INK` surfaces rather
 * than theme tokens: this is a picture of the physical moon, and the lit side
 * has to read as light in both colour schemes. Only the rim follows the theme.
 */
export default function MoonPhaseGlyph({
  phase,
  size = 28,
}: MoonPhaseGlyphProps) {
  const COLORS = useTheme();
  const r = size / 2;
  const p = ((phase % 1) + 1) % 1;

  // The terminator is a half-ellipse whose horizontal radius shrinks to zero
  // at the quarters and grows back to a full semicircle at new and full.
  const k = Math.cos(2 * Math.PI * p);
  const rx = Math.abs(k) * r;
  const waxing = p < 0.5;

  // Lit limb: the right half while waxing, the left half while waning.
  const limbSweep = waxing ? 1 : 0;
  // Crescents bulge the terminator toward the lit limb; gibbous phases away.
  const terminatorSweep = waxing === k > 0 ? 0 : 1;

  const lit =
    `M ${r} 0 A ${r} ${r} 0 0 ${limbSweep} ${r} ${size} ` +
    `A ${rx} ${r} 0 0 ${terminatorSweep} ${r} 0 Z`;

  return (
    <Svg
      width={size}
      height={size}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Circle cx={r} cy={r} r={r} fill={INK} />
      <Path d={lit} fill={PAPER} />
      <Circle
        cx={r}
        cy={r}
        r={r - 0.5}
        fill="none"
        stroke={withAlpha(COLORS.PRIMARY_DARK, 0.4)}
        strokeWidth={1}
      />
    </Svg>
  );
}
