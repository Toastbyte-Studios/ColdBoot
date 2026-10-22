import React from 'react';
import { Alert, ScrollView, TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { OfflineMapService } from '../src/navigation/services/OfflineMapService';
import MapsTab from '../src/screens/Map/components/LibrarySheet/MapsTab';
import { OfflineMapLibraryStore } from '../src/stores/OfflineMapLibraryStore';
import {
  loadPackNameOverrides,
  setPackNameOverride,
} from '../src/utils/offlinePackNames';
import type { OfflineMapPack } from '../src/navigation/services/OfflineMapService';

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

// A real library store per test; only the native service and AsyncStorage
// helpers under it are mocked.
let mockLibraryStore: OfflineMapLibraryStore;

jest.mock('../src/stores/StoreContext', () => ({
  useOfflineMapLibraryStore: () => mockLibraryStore,
  useSettingsStore: () => ({ highDetailOffline: false }),
}));

jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => ({
    BORDER: '#111',
    BRAND: '#2c6e78',
    MUTED: '#666',
    PRIMARY_DARK: '#000',
    SECONDARY_ACCENT: '#2c6e78',
  }),
}));

jest.mock('../src/components/AppButton', () => {
  const { Text: MockText, TouchableOpacity } = require('react-native');
  return ({
    label,
    onPress,
    accessibilityLabel,
  }: {
    label: string;
    onPress?: () => void;
    accessibilityLabel?: string;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      testID={`app-button-${accessibilityLabel ?? label}`}
    >
      <MockText>{label}</MockText>
    </TouchableOpacity>
  );
});

jest.mock('../src/navigation/services/OfflineMapService', () => ({
  ...jest.requireActual('../src/navigation/services/OfflineMapService'),
  OfflineMapService: {
    // Real tile counting, so refreshes are checked against the cap.
    ...jest.requireActual('../src/navigation/services/OfflineMapService')
      .OfflineMapService,
    listPacks: jest.fn(),
    deletePack: jest.fn(),
    downloadRegion: jest.fn(),
  },
}));

jest.mock('../src/utils/offlinePackNames', () => ({
  ...jest.requireActual('../src/utils/offlinePackNames'),
  loadPackNameOverrides: jest.fn(),
  setPackNameOverride: jest.fn(),
  clearPackNameOverride: jest.fn(),
  transferPackNameOverride: jest.fn(),
}));

const MB = 1024 * 1024;

function makePack(overrides: Partial<OfflineMapPack> = {}): OfflineMapPack {
  return {
    id: 'pack-1',
    metadata: {
      name: 'Area Download 10/12/2026',
      createdAt: '2026-10-12T12:00:00.000Z',
      radiusMiles: 50,
      centerLat: 36.14,
      centerLng: -115.07,
    },
    status: {
      state: 'complete',
      completedResourceCount: 10,
      requiredResourceCount: 10,
      completedResourceSize: 46.7 * MB,
    },
    ...overrides,
  } as OfflineMapPack;
}

const collectText = (tree: ReactTestRenderer.ReactTestRenderer): string =>
  tree.root
    .findAll((node) => typeof node.props.children === 'string')
    .map((node) => node.props.children)
    .join(' ');

/**
 * The overflow menu of the row at `index` (the mock MenuView passes its props
 * through, so a menu is the node carrying `actions`).
 */
const findMenu = (tree: ReactTestRenderer.ReactTestRenderer, index = 0) =>
  tree.root.findAll((node) => Array.isArray(node.props.actions), {
    deep: false,
  })[index];

async function renderTab(props: Partial<React.ComponentProps<typeof MapsTab>>) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <MapsTab onViewRegion={jest.fn()} onDownload={jest.fn()} {...props} />,
    );
  });
  await ReactTestRenderer.act(async () => {
    await Promise.resolve();
  });
  return tree;
}

describe('Library sheet — Maps tab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLibraryStore = new OfflineMapLibraryStore();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    (loadPackNameOverrides as jest.Mock).mockResolvedValue({
      'pack-1': 'Near Main Way',
    });
  });

  it('lists downloaded areas by their saved name', async () => {
    (OfflineMapService.listPacks as jest.Mock).mockResolvedValue([makePack()]);

    const tree = await renderTab({});
    const text = collectText(tree);

    expect(text).toContain('Near Main Way');
    expect(text).toContain('~50 mi · ≈ 46.7 MB');
  });

  it('offers a download when there are no offline maps', async () => {
    (OfflineMapService.listPacks as jest.Mock).mockResolvedValue([]);
    const onDownload = jest.fn();

    const tree = await renderTab({ onDownload });

    expect(collectText(tree)).toContain('No offline maps yet.');
    const button = tree.root.findByProps({
      testID: 'app-button-Download your area',
    });
    await ReactTestRenderer.act(async () => {
      button.props.onPress();
    });
    expect(onDownload).toHaveBeenCalled();
  });

  it('shows a retry instruction when the initial library read fails', async () => {
    (OfflineMapService.listPacks as jest.Mock).mockRejectedValue(
      new Error('native failure'),
    );
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const tree = await renderTab({});

    expect(collectText(tree)).toContain(
      'Close and reopen the Library to try again.',
    );
    expect(collectText(tree)).not.toContain('No offline maps yet.');
  });

  it('adjusts the Maps list for the keyboard', async () => {
    (OfflineMapService.listPacks as jest.Mock).mockResolvedValue([makePack()]);

    const tree = await renderTab({});

    expect(
      tree.root.findByType(ScrollView).props.automaticallyAdjustKeyboardInsets,
    ).toBe(true);
  });

  it('offers another download after the list', async () => {
    (OfflineMapService.listPacks as jest.Mock).mockResolvedValue([makePack()]);
    const onDownload = jest.fn();

    const tree = await renderTab({ onDownload });
    const button = tree.root.findByProps({
      testID: 'app-button-Download another area',
    });
    await ReactTestRenderer.act(async () => {
      button.props.onPress();
    });

    expect(onDownload).toHaveBeenCalled();
  });

  it('shows an area on the map with its centre and radius', async () => {
    (OfflineMapService.listPacks as jest.Mock).mockResolvedValue([makePack()]);
    const onViewRegion = jest.fn();

    const tree = await renderTab({ onViewRegion });
    const view = tree.root.findByProps({
      testID: 'app-button-View Near Main Way on map',
    });
    await ReactTestRenderer.act(async () => {
      view.props.onPress();
    });

    expect(onViewRegion).toHaveBeenCalledWith({
      center: { latitude: 36.14, longitude: -115.07 },
      radiusMiles: 50,
    });
  });

  it('refuses to show an area it cannot place', async () => {
    const pack = makePack();
    pack.metadata.centerLat = Number.NaN;
    (OfflineMapService.listPacks as jest.Mock).mockResolvedValue([pack]);
    const onViewRegion = jest.fn();

    const tree = await renderTab({ onViewRegion });
    const view = tree.root.findByProps({
      testID: 'app-button-View Near Main Way on map',
    });
    await ReactTestRenderer.act(async () => {
      view.props.onPress();
    });

    expect(onViewRegion).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      'Area Unavailable',
      expect.any(String),
    );
  });

  it('renames an area in place', async () => {
    (OfflineMapService.listPacks as jest.Mock).mockResolvedValue([makePack()]);

    const tree = await renderTab({});
    await ReactTestRenderer.act(async () => {
      findMenu(tree).props.onPressAction({ nativeEvent: { event: 'rename' } });
    });

    const input = tree.root.findByType(TextInput);
    expect(input.props.value).toBe('Near Main Way');
    await ReactTestRenderer.act(async () => {
      input.props.onChangeText('Red Rock');
    });
    await ReactTestRenderer.act(async () => {
      tree.root.findByProps({ testID: 'app-button-Save' }).props.onPress();
    });

    expect(setPackNameOverride).toHaveBeenCalledWith('pack-1', 'Red Rock');
    expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
    expect(collectText(tree)).toContain('Red Rock');
  });

  it('deletes an area after confirmation', async () => {
    (OfflineMapService.listPacks as jest.Mock)
      .mockResolvedValueOnce([makePack()])
      .mockResolvedValue([]);
    (Alert.alert as jest.Mock).mockImplementation((title, _msg, buttons) => {
      if (title === 'Delete Offline Map') {
        buttons?.[1]?.onPress?.();
      }
    });

    const tree = await renderTab({});
    await ReactTestRenderer.act(async () => {
      findMenu(tree).props.onPressAction({ nativeEvent: { event: 'delete' } });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(OfflineMapService.deletePack).toHaveBeenCalledWith('pack-1');
    expect(collectText(tree)).toContain('No offline maps yet.');
  });

  it('explains when an area is too large to download again', async () => {
    // Saved before the tile cap: 50 miles around Seattle is over it even at
    // standard detail.
    const pack = makePack();
    pack.metadata = { ...pack.metadata, centerLat: 47.6, centerLng: -122.3 };
    (OfflineMapService.listPacks as jest.Mock).mockResolvedValue([pack]);
    (Alert.alert as jest.Mock).mockImplementation((title, _msg, buttons) => {
      if (title === 'Refresh Offline Map') {
        buttons?.[1]?.onPress?.();
      }
    });

    const tree = await renderTab({});
    await ReactTestRenderer.act(async () => {
      findMenu(tree).props.onPressAction({ nativeEvent: { event: 'refresh' } });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(OfflineMapService.downloadRegion).not.toHaveBeenCalled();
    expect(OfflineMapService.deletePack).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      'Area Too Large',
      expect.stringContaining('existing offline map was kept'),
    );
  });

  it('disables refresh and delete while another area is updating', async () => {
    (OfflineMapService.listPacks as jest.Mock).mockResolvedValue([
      makePack(),
      makePack({ id: 'pack-2' }),
    ]);
    let finishDownload: ((value: { id: string }) => void) | undefined;
    (OfflineMapService.downloadRegion as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishDownload = resolve;
        }),
    );
    (Alert.alert as jest.Mock).mockImplementation((title, _msg, buttons) => {
      if (title === 'Refresh Offline Map') {
        buttons?.[1]?.onPress?.();
      }
    });

    const tree = await renderTab({});
    await ReactTestRenderer.act(async () => {
      findMenu(tree).props.onPressAction({ nativeEvent: { event: 'refresh' } });
      await Promise.resolve();
    });

    // The refreshing row swaps its menu for a progress indicator…
    tree.root.findByProps({
      accessibilityRole: 'progressbar',
      accessibilityLabel: 'Updating Near Main Way',
    });
    // …and the other row keeps rename but holds refresh and delete.
    const remaining = findMenu(tree, 0).props.actions as {
      id: string;
      attributes?: { disabled?: boolean };
    }[];
    expect(
      remaining.find((a) => a.id === 'rename')?.attributes,
    ).toBeUndefined();
    expect(
      remaining.find((a) => a.id === 'refresh')?.attributes?.disabled,
    ).toBe(true);
    expect(remaining.find((a) => a.id === 'delete')?.attributes?.disabled).toBe(
      true,
    );

    await ReactTestRenderer.act(async () => {
      finishDownload?.({ id: 'pack-3' });
      await Promise.resolve();
      await Promise.resolve();
    });
  });
});
