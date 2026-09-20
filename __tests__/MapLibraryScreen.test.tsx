import { useNavigation } from '@react-navigation/native';
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { OfflineMapService } from '../src/navigation/services/OfflineMapService';
import MapLibraryScreen from '../src/screens/Map/MapLibraryScreen';
import { loadPackNameOverrides } from '../src/utils/offlinePackNames';

jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => ({
    BORDER: '#111',
    SURFACE: '#fff',
    PRIMARY_DARK: '#000',
    MUTED: '#666',
    BACKGROUND: '#fff',
  }),
}));

jest.mock('../src/stores', () => ({
  useSettingsStore: () => ({ highDetailOffline: false }),
}));

jest.mock('../src/components/ScaledText', () => {
  const { Text: MockText } = require('react-native');
  return { Text: MockText };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../src/components/StackScreen', () => {
  const { Text: MockText, View: MockView } = require('react-native');
  return ({
    title,
    subtitle,
    children,
  }: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
  }) => (
    <MockView>
      <MockText testID="stack-title">{title}</MockText>
      <MockText testID="stack-subtitle">{subtitle}</MockText>
      {children}
    </MockView>
  );
});

jest.mock('../src/components/GroupContainer', () => {
  const { View: MockView } = require('react-native');
  return ({ children }: { children: React.ReactNode }) => (
    <MockView>{children}</MockView>
  );
});

jest.mock('../src/components/ModuleRow', () => {
  const { Text: MockText, TouchableOpacity } = require('react-native');
  return ({
    title,
    subtitle,
    onPress,
  }: {
    title: string;
    subtitle?: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity onPress={onPress} testID="map-library-row">
      <MockText>{title}</MockText>
      {subtitle ? <MockText>{subtitle}</MockText> : null}
    </TouchableOpacity>
  );
});

jest.mock('../src/components/AppButton', () => {
  const { Text: MockText, TouchableOpacity } = require('react-native');
  return ({ label, onPress }: { label: string; onPress?: () => void }) => (
    <TouchableOpacity onPress={onPress}>
      <MockText>{label}</MockText>
    </TouchableOpacity>
  );
});

jest.mock('../src/navigation/services/OfflineMapService', () => ({
  ...jest.requireActual('../src/navigation/services/OfflineMapService'),
  OfflineMapService: {
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
  clearPackNameOverride: jest.fn(),
  transferPackNameOverride: jest.fn(),
}));

describe('MapLibraryScreen', () => {
  const navigate = jest.fn();

  const collectText = (tree: ReactTestRenderer.ReactTestRenderer): string =>
    tree.root
      .findAll((node) => typeof node.props.children === 'string')
      .map((node) => node.props.children)
      .join(' ');

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({ navigate });
    (loadPackNameOverrides as jest.Mock).mockResolvedValue({
      'pack-1': 'Near Red Rock Canyon',
    });
  });

  it('renders rows and total storage subtitle', async () => {
    (OfflineMapService.listPacks as jest.Mock).mockResolvedValue([
      {
        id: 'pack-1',
        metadata: {
          name: 'Area Download 9/20/2026',
          createdAt: '2026-09-12T00:00:00.000Z',
          radiusMiles: 10,
          centerLat: 36.17,
          centerLng: -115.13,
        },
        status: {
          state: 'complete',
          completedResourceCount: 10,
          requiredResourceCount: 10,
          completedResourceSize: 82 * 1024 * 1024,
        },
      },
    ]);

    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<MapLibraryScreen />);
    });
    await ReactTestRenderer.act(async () => {
      await Promise.resolve();
    });

    const texts = collectText(tree);

    expect(texts).toContain('Near Red Rock Canyon');
    expect(texts).toContain('1 area · ≈ 82.0 MB');
    expect(texts).toContain('~10 mi radius · ≈ 82.0 MB · downloaded');
  });

  it('shows the empty state', async () => {
    (OfflineMapService.listPacks as jest.Mock).mockResolvedValue([]);

    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<MapLibraryScreen />);
    });
    await ReactTestRenderer.act(async () => {
      await Promise.resolve();
    });

    const texts = collectText(tree);

    expect(texts).toContain('No offline areas yet');
    expect(texts).toContain('Download your area');
  });

  it('navigates to MapScreen with center and radius when a row is tapped', async () => {
    (OfflineMapService.listPacks as jest.Mock).mockResolvedValue([
      {
        id: 'pack-1',
        metadata: {
          name: 'Area Download 9/20/2026',
          createdAt: '2026-09-12T00:00:00.000Z',
          radiusMiles: 10,
          centerLat: 36.17,
          centerLng: -115.13,
        },
        status: {
          state: 'complete',
          completedResourceCount: 10,
          requiredResourceCount: 10,
          completedResourceSize: 82 * 1024 * 1024,
        },
      },
    ]);

    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<MapLibraryScreen />);
    });

    const row = tree.root.findByProps({ testID: 'map-library-row' });
    await ReactTestRenderer.act(async () => {
      row.props.onPress();
    });

    expect(navigate).toHaveBeenCalledWith('MapScreen', {
      center: { latitude: 36.17, longitude: -115.13 },
      radiusMiles: 10,
    });
  });
});
