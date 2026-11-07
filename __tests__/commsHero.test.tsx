import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { FlashlightModes } from '../constants';
import radioFrequencies from '../src/data/radioFrequencies.json';
import CommsHero from '../src/modules/Communications/CommsHero';
import {
  channelText,
  emergencyChannel,
  nearestRepeater,
  repeaterText,
} from '../src/modules/Communications/commsHero';

describe('emergencyChannel', () => {
  it('picks the licence-free emergency channel from the data (CB 9)', () => {
    const result = emergencyChannel(
      Object.values(radioFrequencies.frequencies),
    );
    expect(result?.service.id).toBe('CB');
    expect(result && channelText(result.service, result.channel)).toBe(
      'CB ch 9 · 27.065 MHz',
    );
  });

  it('is null when no channel is marked for emergencies', () => {
    expect(
      emergencyChannel([
        {
          id: 'X',
          title: 'X',
          requiresLicense: false,
          channels: [{ name: 'A', frequency: '1 MHz', notes: 'General' }],
        },
      ]),
    ).toBeNull();
  });
});

describe('nearestRepeater', () => {
  const repeater = (callSign: string, lat: number, status = 'On-air') => ({
    callSign,
    frequency: '146.940 MHz',
    lat,
    lng: -118.24,
    distance: 99,
    operationalStatus: status,
  });

  it('measures from the fix and prefers on-air repeaters', () => {
    const result = nearestRepeater(
      [
        repeater('OFF1', 34.06, 'Off-air'),
        repeater('FAR', 34.5),
        repeater('NEAR', 34.1),
      ],
      { latitude: 34.05, longitude: -118.24 },
    );
    expect(result?.repeater.callSign).toBe('NEAR');
    expect(result && repeaterText(result, 'imperial')).toBe(
      'NEAR · 146.940 · 3.5 mi',
    );
  });

  it('uses the cached distance without a fix, and is null when empty', () => {
    expect(nearestRepeater([repeater('A', 34.1)], null)?.miles).toBe(99);
    expect(nearestRepeater([], null)).toBeNull();
  });
});

const mockSignaling = {
  flashlightMode: FlashlightModes.OFF as string,
  setFlashlightMode: jest.fn((mode: string) => {
    mockSignaling.flashlightMode = mode;
  }),
};
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('../src/stores/StoreContext', () => ({
  useSignalingStore: () => mockSignaling,
  useRepeaterBookStore: () => ({
    repeaters: [],
    customRepeaters: [],
    loadFromCache: jest.fn(async () => {}),
    loadCustomRepeaters: jest.fn(async () => {}),
  }),
  useCoreStore: () => ({ lastFix: null }),
  useSettingsStore: () => ({ measurementSystem: 'imperial' }),
}));
jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => require('../src/theme/colors').LIGHT_COLORS,
}));
jest.mock('../src/hooks/useRippleColor', () => ({
  useRippleColor: () => 'rgba(0,0,0,0.1)',
}));
jest.mock('../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
}));
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

describe('CommsHero', () => {
  const button = (tree: ReactTestRenderer.ReactTestRenderer, label: string) =>
    tree.root.find(
      (node) =>
        node.props.accessibilityLabel === label &&
        typeof node.props.onPress === 'function',
    );

  it('starts the SOS light, and the whistle opens its tool', async () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<CommsHero />);
    });

    await ReactTestRenderer.act(async () =>
      button(tree, 'Start flashing SOS with the light').props.onPress(),
    );
    expect(mockSignaling.setFlashlightMode).toHaveBeenCalledWith(
      FlashlightModes.SOS,
    );

    button(tree, 'Open the digital whistle').props.onPress();
    expect(mockNavigate).toHaveBeenCalledWith('DigitalWhistle');
  });

  it('offers Stop while SOS is flashing', async () => {
    mockSignaling.flashlightMode = FlashlightModes.SOS;
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<CommsHero />);
    });

    await ReactTestRenderer.act(async () =>
      button(tree, 'Stop the SOS light').props.onPress(),
    );
    expect(mockSignaling.setFlashlightMode).toHaveBeenLastCalledWith(
      FlashlightModes.OFF,
    );
  });
});
