import {
  HOLE_GAP,
  MIN_CONTENT_HEIGHT,
  PANEL_MARGIN,
  SPOTLIGHT_PADDING,
  spotlightShapeFor,
  tutorialPanelLayout,
} from '../src/components/tutorialLayout';

// An iPhone-sized shell with a notch and a home indicator.
const SCREEN = { width: 390, height: 844 };
const INSETS = { top: 47, bottom: 34, left: 0, right: 0 };
const PANEL_TOP = INSETS.top + PANEL_MARGIN;
const PANEL_BOTTOM = SCREEN.height - INSETS.bottom - PANEL_MARGIN;

describe('spotlightShapeFor', () => {
  test('pads a button into a pill', () => {
    expect(
      spotlightShapeFor('navSearch', { x: 300, y: 60, width: 34, height: 34 }),
    ).toEqual({
      kind: 'rect',
      x: 300 - SPOTLIGHT_PADDING,
      y: 60 - SPOTLIGHT_PADDING,
      width: 34 + SPOTLIGHT_PADDING * 2,
      height: 34 + SPOTLIGHT_PADDING * 2,
      radius: (34 + SPOTLIGHT_PADDING * 2) / 2,
    });
  });

  test('cuts the logo as a circle', () => {
    expect(
      spotlightShapeFor('logo', { x: 16, y: 60, width: 40, height: 40 }),
    ).toEqual({
      kind: 'circle',
      cx: 36,
      cy: 80,
      r: 20 + SPOTLIGHT_PADDING,
    });
  });

  test('cuts the shortcut bar as a rounded box', () => {
    const shape = spotlightShapeFor('footerButtons', {
      x: 0,
      y: 760,
      width: 390,
      height: 84,
    });
    expect(shape).toMatchObject({ kind: 'rect', y: 760 - SPOTLIGHT_PADDING });
    expect(shape?.kind === 'rect' && shape.radius).toBeLessThan(30);
  });

  test('nothing to cut without a target or a measurement', () => {
    expect(spotlightShapeFor(undefined, null)).toBeNull();
    expect(spotlightShapeFor('logo', null)).toBeNull();
  });
});

describe('tutorialPanelLayout', () => {
  test('without a hole, the panel fills the safe area and the text fills it', () => {
    const { panel, hole, content } = tutorialPanelLayout({
      ...SCREEN,
      insets: INSETS,
      shape: null,
    });

    expect(panel).toEqual({
      x: PANEL_MARGIN,
      y: PANEL_TOP,
      width: SCREEN.width - PANEL_MARGIN * 2,
      height: PANEL_BOTTOM - PANEL_TOP,
    });
    expect(hole).toBeNull();
    expect(content).toEqual(panel);
  });

  test('a hole near the top puts the text below it', () => {
    const shape = spotlightShapeFor('logo', {
      x: 16,
      y: 61,
      width: 40,
      height: 40,
    });
    const { hole, content } = tutorialPanelLayout({
      ...SCREEN,
      insets: INSETS,
      shape,
    });

    expect(hole).toEqual(shape);
    expect(content.y).toBe(61 + 40 + SPOTLIGHT_PADDING + HOLE_GAP);
    expect(content.y + content.height).toBe(PANEL_BOTTOM);
  });

  test('a hole at the bottom puts the text above it', () => {
    const shape = spotlightShapeFor('footerButtons', {
      x: 0,
      y: 760,
      width: 390,
      height: 84,
    });
    const { content } = tutorialPanelLayout({
      ...SCREEN,
      insets: INSETS,
      shape,
    });

    expect(content.y).toBe(PANEL_TOP);
    expect(content.y + content.height).toBe(760 - SPOTLIGHT_PADDING - HOLE_GAP);
  });

  test('a hole too big to leave room (the map) is trimmed to fit the text', () => {
    // The map fills everything between its toolbar and the shortcut bar.
    const shape = spotlightShapeFor('mapView', {
      x: 0,
      y: 160,
      width: 390,
      height: 600,
    });
    const { hole, content } = tutorialPanelLayout({
      ...SCREEN,
      insets: INSETS,
      shape,
    });

    expect(content.height).toBeGreaterThanOrEqual(MIN_CONTENT_HEIGHT - 1);
    expect(hole?.kind).toBe('rect');
    if (hole?.kind === 'rect' && shape?.kind === 'rect') {
      // Still a good window onto the map, trimmed only on the text's side.
      expect(hole.height).toBeLessThan(shape.height);
      expect(hole.height).toBeGreaterThan(150);
      const holeBottom = hole.y + hole.height;
      const textBelow = content.y >= holeBottom;
      if (textBelow) {
        expect(hole.y).toBe(shape.y);
        expect(content.y).toBe(holeBottom + HOLE_GAP);
      } else {
        expect(holeBottom).toBe(shape.y + shape.height);
        expect(content.y + content.height).toBe(hole.y - HOLE_GAP);
      }
    }
  });

  test('a zero-size shell before layout gives empty boxes, not negative ones', () => {
    const { panel, content } = tutorialPanelLayout({
      width: 0,
      height: 0,
      insets: INSETS,
      shape: null,
    });

    expect(panel.width).toBe(0);
    expect(panel.height).toBe(0);
    expect(content.height).toBe(0);
  });
});
