import type {
  SpotlightLayout,
  TutorialSpotlightTarget,
} from './TutorialSpotlightContext';

/** Breathing room between a spotlit control and the edge of its hole. */
export const SPOTLIGHT_PADDING = 6;

/** Targets that are panels, not buttons: cut out as rounded boxes. */
const PANEL_TARGETS = new Set<TutorialSpotlightTarget>([
  'sectionHeader',
  'mapView',
  'mapCompass',
  'footerButtons',
]);
const PANEL_RADIUS = 12;

/** How far the tutorial panel sits in from the safe area on every side. */
export const PANEL_MARGIN = 10;
/** Space kept clear between the hole and the step's text. */
export const HOLE_GAP = 16;
/**
 * The least height the step's text and buttons get. A hole too large to leave
 * this much room (the whole map) is trimmed on the side the text goes.
 */
export const MIN_CONTENT_HEIGHT = 340;
/** A trimmed hole keeps at least this much, so the target still shows. */
const MIN_HOLE_HEIGHT = 96;

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A hole in the tutorial panel, already padded, in the shell's coordinates. */
export type SpotlightShapeSpec =
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | {
      kind: 'rect';
      x: number;
      y: number;
      width: number;
      height: number;
      radius: number;
    };

/**
 * The hole cut around a target: a circle for the round logo, a pill for
 * buttons, a rounded box for a panel such as the map.
 */
export function spotlightShapeFor(
  target: TutorialSpotlightTarget | undefined,
  layout: SpotlightLayout | null,
): SpotlightShapeSpec | null {
  if (!layout || !target) {
    return null;
  }
  if (target === 'logo') {
    return {
      kind: 'circle',
      cx: layout.x + layout.width / 2,
      cy: layout.y + layout.height / 2,
      r: Math.min(layout.width, layout.height) / 2 + SPOTLIGHT_PADDING,
    };
  }
  const height = layout.height + SPOTLIGHT_PADDING * 2;
  return {
    kind: 'rect',
    x: layout.x - SPOTLIGHT_PADDING,
    y: layout.y - SPOTLIGHT_PADDING,
    width: layout.width + SPOTLIGHT_PADDING * 2,
    height,
    radius: PANEL_TARGETS.has(target)
      ? PANEL_RADIUS + SPOTLIGHT_PADDING
      : height / 2,
  };
}

function boundsOf(shape: SpotlightShapeSpec): { top: number; bottom: number } {
  return shape.kind === 'circle'
    ? { top: shape.cy - shape.r, bottom: shape.cy + shape.r }
    : { top: shape.y, bottom: shape.y + shape.height };
}

export interface TutorialPanelLayout {
  /** The opaque panel that fills most of the screen. */
  panel: Box;
  /** The see-through hole, trimmed if it was too large. Null when none. */
  hole: SpotlightShapeSpec | null;
  /** Where the step's text and buttons go: the panel, less the hole. */
  content: Box;
}

/**
 * Lays out the tutorial over a screen of the given size: a panel inset from
 * the safe area, a hole where the step points, and the text in whichever part
 * of the panel above or below the hole is taller.
 */
export function tutorialPanelLayout({
  width,
  height,
  insets,
  shape,
}: {
  width: number;
  height: number;
  insets: { top: number; bottom: number; left: number; right: number };
  shape: SpotlightShapeSpec | null;
}): TutorialPanelLayout {
  const panelTop = insets.top + PANEL_MARGIN;
  const panelBottom = height - insets.bottom - PANEL_MARGIN;
  const panelLeft = insets.left + PANEL_MARGIN;
  const panel: Box = {
    x: panelLeft,
    y: panelTop,
    width: Math.max(0, width - insets.right - PANEL_MARGIN - panelLeft),
    height: Math.max(0, panelBottom - panelTop),
  };

  if (!shape) {
    return { panel, hole: null, content: panel };
  }

  let hole = shape;
  let { top, bottom } = boundsOf(hole);
  const spaceAbove = top - HOLE_GAP - panelTop;
  const spaceBelow = panelBottom - (bottom + HOLE_GAP);
  const textBelow = spaceBelow >= spaceAbove;

  // Trim a large panel-shaped hole on the text's side so the text fits.
  if (
    hole.kind === 'rect' &&
    Math.max(spaceAbove, spaceBelow) < MIN_CONTENT_HEIGHT
  ) {
    const shortfall = MIN_CONTENT_HEIGHT - Math.max(spaceAbove, spaceBelow);
    const trimmedHeight = Math.max(
      Math.min(MIN_HOLE_HEIGHT, hole.height),
      hole.height - shortfall,
    );
    const trimmedBy = hole.height - trimmedHeight;
    hole = {
      ...hole,
      y: textBelow ? hole.y : hole.y + trimmedBy,
      height: trimmedHeight,
    };
    ({ top, bottom } = boundsOf(hole));
  }

  const contentTop = Math.max(
    panelTop,
    textBelow ? bottom + HOLE_GAP : panelTop,
  );
  const contentBottom = Math.min(
    panelBottom,
    textBelow ? panelBottom : top - HOLE_GAP,
  );
  return {
    panel,
    hole,
    content: {
      x: panel.x,
      y: contentTop,
      width: panel.width,
      height: Math.max(0, contentBottom - contentTop),
    },
  };
}
