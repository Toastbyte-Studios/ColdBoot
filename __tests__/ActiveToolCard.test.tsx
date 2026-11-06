import React from 'react';
import { Text as RNText } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { FlashlightModes } from '../constants';
import ActiveToolCard from '../src/components/ActiveToolCard';

const mockNavigate = jest.fn();
const mockSignaling = {
  decibelMeterActive: false,
  flashlightMode: FlashlightModes.OFF as string | undefined,
  getActiveSince: jest.fn(() => null),
  setFlashlightMode: jest.fn(),
  setDecibelMeterActive: jest.fn(),
};
const mockSettings = { coldMode: false, setColdMode: jest.fn() };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('../src/stores/StoreContext', () => ({
  useSignalingStore: () => mockSignaling,
  useSettingsStore: () => mockSettings,
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

let mounted: ReactTestRenderer.ReactTestRenderer | null = null;

async function render() {
  await ReactTestRenderer.act(async () => {
    mounted = ReactTestRenderer.create(<ActiveToolCard />);
  });
  if (!mounted) throw new Error('render failed');
  return mounted;
}

const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(RNText)
    .map((node) => React.Children.toArray(node.props.children).join(''));

const byLabel = (tree: ReactTestRenderer.ReactTestRenderer, label: string) =>
  tree.root.find(
    (node) =>
      node.props.accessibilityLabel === label &&
      (typeof node.props.onValueChange === 'function' ||
        typeof node.props.onPress === 'function'),
  );

describe('ActiveToolCard', () => {
  afterEach(async () => {
    await ReactTestRenderer.act(async () => mounted?.unmount());
    mounted = null;
    mockSettings.coldMode = false;
    mockSignaling.flashlightMode = FlashlightModes.OFF;
    jest.clearAllMocks();
  });

  it('renders nothing when no tool runs and Cold mode is off', async () => {
    const tree = await render();
    expect(tree.toJSON()).toBeNull();
  });

  it('shows Cold mode, which opens Cold Weather and switches off', async () => {
    mockSettings.coldMode = true;
    const tree = await render();

    expect(texts(tree)).toEqual(
      expect.arrayContaining([
        'Cold mode',
        'Saving battery · GPS every 10 min',
      ]),
    );

    byLabel(
      tree,
      'Cold mode. Saving battery · GPS every 10 min. Opens the tool.',
    ).props.onPress();
    expect(mockNavigate).toHaveBeenCalledWith('ColdWeather');

    byLabel(tree, 'Turn off Cold mode').props.onValueChange(false);
    expect(mockSettings.setColdMode).toHaveBeenCalledWith(false);
  });

  it('shows a running tool and Cold mode together', async () => {
    mockSettings.coldMode = true;
    mockSignaling.flashlightMode = FlashlightModes.ON;
    const tree = await render();

    expect(texts(tree)).toEqual(
      expect.arrayContaining(['Flashlight', 'Cold mode']),
    );

    byLabel(tree, 'Stop Flashlight').props.onValueChange(false);
    expect(mockSignaling.setFlashlightMode).toHaveBeenCalledWith(
      FlashlightModes.OFF,
    );
    expect(mockSettings.setColdMode).not.toHaveBeenCalled();
  });
});
