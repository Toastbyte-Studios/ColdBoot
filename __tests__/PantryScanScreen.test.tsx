/**
 * @format
 * The Pantry scan screen with a real (in-memory) PantryStore. The camera is
 * replaced by a stand-in that hands the test its `onCodes` callback, so a
 * test can "show" the screen a barcode.
 */

import React from 'react';
import { ActionSheetIOS, ScrollView, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import PantryScanScreen from '../src/screens/Pantry/PantryScanScreen';
import { PantryStore } from '../src/stores/PantryStore';

jest.mock('react-native-sqlite-storage', () => null);
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');
jest.spyOn(console, 'warn').mockImplementation(() => {});

const mockNavigate = jest.fn();
let mockStore: PantryStore;
let mockOnCodes: ((values: string[]) => void) | undefined;
let mockCameraActive: boolean | undefined;
const mockScreenHeader = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useIsFocused: () => true,
}));

jest.mock('../src/stores', () => ({
  usePantryStore: () => mockStore,
  useSettingsStore: () => ({ themeMode: 'light', fontScale: 1 }),
}));

jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => require('../src/theme/colors').LIGHT_COLORS,
}));

jest.mock('../src/hooks/useFooterClearance', () => ({
  useFooterClearance: () => 100,
}));

jest.mock('../src/navigation/ScreenHeaderContext', () => ({
  useScreenHeader: (header: unknown) => mockScreenHeader(header),
}));

jest.mock('../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
}));

jest.mock('../src/components/PinnedHeaderScreen', () => {
  const { View: MockView } = require('react-native');
  return ({
    header,
    children,
  }: {
    header: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <MockView>
      {header}
      {children}
    </MockView>
  );
});

jest.mock('../src/screens/Pantry/scan/PantryScanCamera', () => ({
  PantryScanCamera: ({
    isActive,
    onCodes,
  }: {
    isActive: boolean;
    onCodes: (values: string[]) => void;
  }) => {
    mockOnCodes = onCodes;
    mockCameraActive = isActive;
    return null;
  },
}));

/** Text of every `Text` node on screen. */
function screenText(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  return tree.root
    .findAllByType(Text)
    .map((node) => [node.props.children].flat().join(''));
}

function render() {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<PantryScanScreen />);
  });
  return tree;
}

/** The camera reports `values`, then pending store writes settle. */
async function scan(values: string[]) {
  await ReactTestRenderer.act(async () => {
    mockOnCodes!(values);
  });
}

describe('PantryScanScreen', () => {
  let nowSpy: jest.SpyInstance;
  let now: number;
  let actionSheet: jest.SpyInstance;

  /** Moves the clock past the rescan gap, as if the can left the frame. */
  const later = () => {
    now += 2000;
  };

  beforeEach(async () => {
    mockNavigate.mockReset();
    mockScreenHeader.mockReset();
    mockOnCodes = undefined;
    now = 1_000_000;
    nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => now);
    actionSheet = jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation(() => {});

    mockStore = new PantryStore();
    // In-memory mode loads the default categories.
    await mockStore.initDatabase();
  });

  afterEach(() => {
    nowSpy.mockRestore();
    actionSheet.mockRestore();
    mockStore.dispose();
  });

  async function addBeans(quantity = 2) {
    return mockStore.createItem(
      'Black Beans',
      'Canned Goods',
      quantity,
      'cans',
      undefined,
      undefined,
      undefined,
      { barcode: '036000291452' },
    );
  }

  it('titles the app bar and runs the camera while shown', () => {
    const tree = render();
    expect(mockScreenHeader).toHaveBeenCalledWith({ title: 'Scan to Pantry' });
    expect(mockCameraActive).toBe(true);
    const camera = tree.root.findByProps({ testID: 'scan-camera-frame' });
    expect(
      tree.root.findByType(ScrollView).findAllByProps({
        testID: 'scan-camera-frame',
      }),
    ).toHaveLength(0);

    const frame = tree.root.findAll(
      (node) => typeof node.props.onLayout === 'function',
    )[0];
    ReactTestRenderer.act(() => {
      frame.props.onLayout({
        nativeEvent: { layout: { height: 350 } },
      });
    });
    expect(camera.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ height: 96 })]),
    );
  });

  it('adds one to an item already in the pantry', async () => {
    const item = await addBeans(2);
    const tree = render();

    // iOS reports the UPC-A as an EAN-13.
    await scan(['0036000291452']);

    expect(mockStore.items.find((i) => i.id === item.id)!.quantity).toBe(3);
    expect(screenText(tree)).toEqual(
      expect.arrayContaining(['Black Beans', '+1 this session', '3 cans']),
    );
  });

  it('counts a can held in view once', async () => {
    const item = await addBeans(2);
    render();

    await scan(['0036000291452']);
    for (let i = 0; i < 10; i++) {
      now += 33;
      await scan(['0036000291452']);
    }

    expect(mockStore.items.find((i) => i.id === item.id)!.quantity).toBe(3);
  });

  it('counts the next can of the same product', async () => {
    const item = await addBeans(2);
    const tree = render();

    await scan(['0036000291452']);
    later();
    await scan(['036000291452']);

    expect(mockStore.items.find((i) => i.id === item.id)!.quantity).toBe(4);
    expect(screenText(tree)).toContain('+2 this session');
  });

  it('ignores codes that are not retail barcodes', async () => {
    await addBeans(2);
    const tree = render();

    await scan(['036000291453', 'hello']);

    expect(mockStore.items[0].quantity).toBe(2);
    expect(screenText(tree)).not.toContain('New barcode');
  });

  it('lists an unknown barcode and offers it to Add Pantry Item', async () => {
    const tree = render();

    await scan(['4006381333931']);
    later();
    await scan(['4006381333931']);

    expect(screenText(tree)).toEqual(
      expect.arrayContaining([
        'New barcode',
        '4006381333931, scanned 2×. Tap to add.',
      ]),
    );

    const row = tree.root.findByProps({ title: 'New barcode' });
    ReactTestRenderer.act(() => row.props.onPress());

    const [options, choose] = actionSheet.mock.calls[0];
    expect(options.options).toEqual([
      'Canned Goods',
      'Dry Goods',
      'Frozen',
      'Fresh',
      'Remove from list',
      'Cancel',
    ]);
    await ReactTestRenderer.act(async () => choose(1));

    expect(mockNavigate).toHaveBeenCalledWith('NewPantryItem', {
      category: 'Dry Goods',
      barcode: '4006381333931',
      quantity: 2,
      onSaved: expect.any(Function),
    });
  });

  it('removes an unknown barcode from the list', async () => {
    const tree = render();
    await scan(['4006381333931']);

    ReactTestRenderer.act(() =>
      tree.root.findByProps({ title: 'New barcode' }).props.onPress(),
    );
    const [, choose] = actionSheet.mock.calls[0];
    await ReactTestRenderer.act(async () => choose(4));

    expect(screenText(tree)).not.toContain('New barcode');
  });

  it('shows an added barcode as its new item', async () => {
    const tree = render();
    await scan(['4006381333931']);
    ReactTestRenderer.act(() =>
      tree.root.findByProps({ title: 'New barcode' }).props.onPress(),
    );
    const [, choose] = actionSheet.mock.calls[0];
    await ReactTestRenderer.act(async () => choose(1));

    // What Add Pantry Item does when the user saves.
    let item!: Awaited<ReturnType<PantryStore['createItem']>>;
    await ReactTestRenderer.act(async () => {
      item = await mockStore.createItem(
        'Muesli',
        'Dry Goods',
        1,
        undefined,
        undefined,
        undefined,
        undefined,
        { barcode: '4006381333931' },
      );
    });
    const onSaved = mockNavigate.mock.calls[0][1].onSaved;
    ReactTestRenderer.act(() => onSaved(item, item.quantity));

    expect(screenText(tree)).toEqual(
      expect.arrayContaining(['Muesli', '+1 this session']),
    );
    expect(screenText(tree)).not.toContain('New barcode');
  });

  it('takes one back from a counted item', async () => {
    const item = await addBeans(2);
    const tree = render();
    await scan(['0036000291452']);

    ReactTestRenderer.act(() =>
      tree.root.findByProps({ title: 'Black Beans' }).props.onPress(),
    );
    const [options, choose] = actionSheet.mock.calls[0];
    expect(options.options).toEqual(['Take one back', 'Open item', 'Cancel']);
    await ReactTestRenderer.act(async () => choose(0));

    expect(mockStore.items.find((i) => i.id === item.id)!.quantity).toBe(2);
    expect(screenText(tree)).not.toContain('Black Beans');
  });

  it('opens a counted item', async () => {
    await addBeans(2);
    const tree = render();
    await scan(['0036000291452']);

    ReactTestRenderer.act(() =>
      tree.root.findByProps({ title: 'Black Beans' }).props.onPress(),
    );
    const [, choose] = actionSheet.mock.calls[0];
    await ReactTestRenderer.act(async () => choose(1));

    expect(mockNavigate).toHaveBeenCalledWith('EditPantryItem', {
      item: expect.objectContaining({ name: 'Black Beans' }),
    });
  });

  it('ignores scans while a row action sheet is open', async () => {
    const item = await addBeans(2);
    const tree = render();
    await scan(['0036000291452']);

    ReactTestRenderer.act(() =>
      tree.root.findByProps({ title: 'Black Beans' }).props.onPress(),
    );
    later();
    await scan(['0036000291452']);
    const [, choose] = actionSheet.mock.calls[0];
    await ReactTestRenderer.act(async () => choose(1));

    expect(mockStore.items.find((i) => i.id === item.id)!.quantity).toBe(3);
    expect(screenText(tree)).toContain('+1 this session');
    expect(mockNavigate).toHaveBeenCalledWith(
      'EditPantryItem',
      expect.objectContaining({
        item: expect.objectContaining({ quantity: 3 }),
      }),
    );
  });

  it('keeps new scans separate after an item barcode changes', async () => {
    const item = await addBeans(2);
    const tree = render();
    await scan(['0036000291452']);
    await ReactTestRenderer.act(async () =>
      mockStore.updateItem(item.id, { barcode: '4006381333931' }),
    );
    later();
    await scan(['0036000291452']);

    expect(screenText(tree)).toEqual(
      expect.arrayContaining([
        'Black Beans',
        '+1 this session',
        'New barcode',
        '0036000291452, scanned 1×. Tap to add.',
      ]),
    );
    expect(mockStore.items.find((i) => i.id === item.id)!.quantity).toBe(3);
  });

  it('binds a replacement item after the scanned item is deleted', async () => {
    const item = await addBeans(2);
    const tree = render();
    await scan(['0036000291452']);
    await ReactTestRenderer.act(async () => mockStore.deleteItem(item.id));
    later();
    await scan(['0036000291452']);
    ReactTestRenderer.act(() =>
      tree.root.findByProps({ title: 'New barcode' }).props.onPress(),
    );
    const [, choose] = actionSheet.mock.calls[0];
    await ReactTestRenderer.act(async () => choose(1));
    const onSaved = mockNavigate.mock.calls[0][1].onSaved;
    const replacement = await mockStore.createItem(
      'Replacement Beans',
      'Dry Goods',
      2,
      'cans',
      undefined,
      undefined,
      undefined,
      { barcode: '036000291452' },
    );
    ReactTestRenderer.act(() => onSaved(replacement, replacement.quantity));

    expect(screenText(tree)).toEqual(
      expect.arrayContaining(['Replacement Beans', '+2 this session']),
    );
    expect(screenText(tree)).not.toContain('New barcode');
  });

  it('reconciles an added barcode with the quantity the form saved', async () => {
    const tree = render();
    await scan(['4006381333931']);
    later();
    await scan(['4006381333931']);
    later();
    await scan(['4006381333931']);
    ReactTestRenderer.act(() =>
      tree.root.findByProps({ title: 'New barcode' }).props.onPress(),
    );
    const [, choose] = actionSheet.mock.calls[0];
    await ReactTestRenderer.act(async () => choose(1));
    const onSaved = mockNavigate.mock.calls[0][1].onSaved;
    const item = await mockStore.createItem(
      'Muesli',
      'Dry Goods',
      1,
      undefined,
      undefined,
      undefined,
      undefined,
      { barcode: '4006381333931' },
    );
    ReactTestRenderer.act(() => onSaved(item, item.quantity));

    expect(screenText(tree)).toEqual(
      expect.arrayContaining(['Muesli', '+1 this session']),
    );
    expect(screenText(tree)).not.toContain('+3 this session');
  });

  it('puts the newest lot first when several items share a barcode', async () => {
    const older = await addBeans(2);
    later();
    const newer = await addBeans(5);
    render();

    later();
    await scan(['0036000291452']);

    const quantity = (id: string) =>
      mockStore.items.find((i) => i.id === id)!.quantity;
    expect(quantity(older.id)).toBe(2);
    expect(quantity(newer.id)).toBe(6);
  });
});
