import React from 'react';
import * as ReactNative from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import {
  STAYING_WARM_ENTRY_IDS,
  stayingWarmEntries,
} from '../src/screens/ColdWeather/coldWeatherContent';

const mockNavigate = jest.fn();
const mockSendIntent = jest.fn();
const mockOpenSettings = jest.fn();
const mockSettings = {
  coldMode: false,
  measurementSystem: 'metric',
  setColdMode: jest.fn(async (on: boolean) => {
    mockSettings.coldMode = on;
  }),
};
const mockCore = {
  batteryLevel: 0.42 as number | null,
  isCharging: false as boolean | null,
  batteryEstimateMinutes: 190 as number | null,
  batteryTemperatureC: null as number | null,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('../src/stores/StoreContext', () => ({
  useCoreStore: () => mockCore,
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
jest.mock('../src/components/StackScreen', () => {
  const { View: MockView } = require('react-native');
  return ({ children }: { children: React.ReactNode }) => (
    <MockView>{children}</MockView>
  );
});

function loadScreen(os: 'android' | 'ios') {
  jest.resetModules();
  jest.doMock('react', () => React);
  jest.doMock(
    'react-native',
    () =>
      new Proxy(ReactNative, {
        get(target, property) {
          if (property === 'Linking') {
            return {
              ...Reflect.get(target, property, target),
              openSettings: mockOpenSettings,
              sendIntent: mockSendIntent,
            };
          }
          if (property === 'Platform') {
            return { ...Reflect.get(target, property, target), OS: os };
          }
          return Reflect.get(target, property, target);
        },
      }),
  );
  return require('../src/screens/ColdWeather/ColdWeatherScreen');
}

describe('stayingWarmEntries', () => {
  it('finds every linked Reference entry', () => {
    const entries = stayingWarmEntries();
    expect(entries.map((entry) => entry.id)).toEqual([
      ...STAYING_WARM_ENTRY_IDS,
    ]);
    expect(entries.map((entry) => entry.title)).toContain('Hypothermia');
  });
});

describe('batterySummary', () => {
  const { batterySummary } = loadScreen('android');

  it('reads level and time left', () => {
    expect(batterySummary(0.42, false, 190)).toBe(
      '42% · about 3 hr 10 min left',
    );
    expect(batterySummary(0.42, false, 45)).toBe('42% · about 45 min left');
    expect(batterySummary(0.42, false, 120)).toBe('42% · about 2 hr left');
  });

  it('says charging instead of a time when plugged in', () => {
    expect(batterySummary(0.8, true, 50)).toBe('80% · charging');
  });

  it('handles nothing known yet', () => {
    expect(batterySummary(null, null, null)).toBe('Checking battery…');
    expect(batterySummary(0.5, false, null)).toBe('50%');
  });
});

describe('ColdWeatherScreen', () => {
  async function render(os: 'android' | 'ios' = 'android') {
    const { default: ColdWeatherScreen } = loadScreen(os);
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<ColdWeatherScreen />);
    });
    return tree;
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows the battery, both advice lists and the staying-warm links', async () => {
    const tree = await render();
    const all = tree.root
      .findAllByType(ReactNative.Text)
      .map((node) => React.Children.toArray(node.props.children).join(''));

    expect(all).toContain('42% · about 3 hr 10 min left');
    expect(all.join('\n')).toMatch(/inside pocket, against your body/);
    expect(all.join('\n')).toMatch(/Airplane Mode/);
    expect(all.join('\n')).toMatch(/Charging a frozen battery damages it/);
  });

  it('opens a Reference entry from the staying-warm list', async () => {
    const tree = await render();
    const row = tree.root.find(
      (node) =>
        node.props.accessibilityRole === 'button' &&
        typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.startsWith('Frostbite') &&
        typeof node.props.onPress === 'function',
    );
    await ReactTestRenderer.act(async () => row.props.onPress());

    expect(mockNavigate).toHaveBeenCalledWith(
      'Entry',
      expect.objectContaining({
        entry: expect.objectContaining({ id: 'cold_weather_frostbite' }),
      }),
    );
  });

  it('opens Android Battery Saver settings', async () => {
    mockSendIntent.mockResolvedValueOnce(undefined);
    const tree = await render('android');
    const row = tree.root.find(
      (node) =>
        node.props.accessibilityRole === 'button' &&
        node.props.accessibilityLabel === 'Open Battery Saver settings' &&
        typeof node.props.onPress === 'function',
    );

    await ReactTestRenderer.act(async () => row.props.onPress());

    expect(mockSendIntent).toHaveBeenCalledWith(
      'android.settings.BATTERY_SAVER_SETTINGS',
    );
    expect(mockOpenSettings).not.toHaveBeenCalled();
  });

  it('falls back to Settings when the Android Battery Saver intent fails', async () => {
    mockSendIntent.mockRejectedValueOnce(new Error('Unavailable'));
    const tree = await render('android');
    const row = tree.root.find(
      (node) =>
        node.props.accessibilityRole === 'button' &&
        node.props.accessibilityLabel === 'Open Battery Saver settings' &&
        typeof node.props.onPress === 'function',
    );

    await ReactTestRenderer.act(async () => {
      row.props.onPress();
      await Promise.resolve();
    });

    expect(mockSendIntent).toHaveBeenCalledWith(
      'android.settings.BATTERY_SAVER_SETTINGS',
    );
    expect(mockOpenSettings).toHaveBeenCalled();
  });

  it('does not show the Battery Saver row on iOS', async () => {
    const tree = await render('ios');

    expect(
      tree.root.findAll(
        (node) =>
          node.props.accessibilityLabel === 'Open Battery Saver settings',
      ),
    ).toHaveLength(0);
  });

  it('turns Cold mode on from its switch', async () => {
    const tree = await render();
    const toggle = tree.root.find(
      (node) =>
        node.props.accessibilityLabel === 'Cold mode' &&
        typeof node.props.onValueChange === 'function',
    );
    expect(toggle.props.value).toBe(false);

    await ReactTestRenderer.act(async () => toggle.props.onValueChange(true));
    expect(mockSettings.setColdMode).toHaveBeenCalledWith(true);
  });

  it('shows the battery temperature and a freezing warning on Android', async () => {
    mockCore.batteryTemperatureC = -4;
    const tree = await render();
    const all = tree.root
      .findAllByType(ReactNative.Text)
      .map((node) => React.Children.toArray(node.props.children).join(''));

    expect(all).toContain('−4 °C · Too cold to charge');
    expect(all.join('\n')).toMatch(/Don't plug it in until it warms up/);
    mockCore.batteryTemperatureC = null;
  });

  it('leaves the temperature out where there is no reading (iOS)', async () => {
    const tree = await render();
    const all = tree.root
      .findAllByType(ReactNative.Text)
      .map((node) => React.Children.toArray(node.props.children).join(''));

    expect(all.join('\n')).not.toMatch(/°[CF] · /);
  });
});
