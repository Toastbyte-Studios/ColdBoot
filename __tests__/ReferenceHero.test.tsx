import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import ReferenceHero from '../src/modules/Reference/ReferenceHero';

const mockNavigate = jest.fn();
const mockAddListener = jest.fn(() => () => {});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    addListener: mockAddListener,
  }),
}));
jest.mock('../src/stores/StoreContext', () => ({
  useCoreStore: () => ({ lastFix: null, batteryTemperatureC: null }),
  useBarometerStore: () => ({ history: [], paused: false }),
  useSettingsStore: () => ({ coldMode: true, measurementSystem: 'imperial' }),
}));
jest.mock('../src/stores/BookmarksStore', () => ({
  getBookmarks: jest.fn(async () => [
    { id: 'illness_hypothermia', title: 'Hypothermia' },
    { id: 'gone_from_the_data', title: 'Old' },
  ]),
}));
jest.mock('../src/utils/lastReadEntry', () => ({
  getLastRead: jest.fn(async () => ({
    id: 'weather_storm_indicators',
    openedAt: 0,
  })),
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

describe('ReferenceHero', () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;

  beforeEach(async () => {
    mockNavigate.mockClear();
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<ReferenceHero />);
    });
  });

  afterEach(() => ReactTestRenderer.act(() => tree.unmount()));

  const texts = () =>
    tree.root
      .findAll((node) => typeof node.props.children === 'string')
      .map((node) => node.props.children as string);

  const pressable = (label: string) =>
    tree.root.find(
      (node) =>
        node.props.accessibilityLabel === label &&
        typeof node.props.onPress === 'function',
    );

  it('suggests an entry for the conditions and says why', () => {
    expect(texts()).toEqual(
      expect.arrayContaining(['Hypothermia Prevention', 'Cold mode is on']),
    );
  });

  it('counts only bookmarks that still exist, and offers the last entry', () => {
    expect(texts()).toEqual(
      expect.arrayContaining(['1 saved', 'Storm Indicators']),
    );
    pressable('Continue reading Storm Indicators').props.onPress();
    expect(mockNavigate).toHaveBeenCalledWith('Entry', {
      entry: expect.objectContaining({ id: 'weather_storm_indicators' }),
    });
  });

  it('opens CPR in one tap', () => {
    pressable('Open Cardiac Arrest and CPR').props.onPress();
    expect(mockNavigate).toHaveBeenCalledWith('Entry', {
      entry: expect.objectContaining({ id: 'emergency_cardiac_arrest_cpr' }),
    });
  });

  it('re-reads bookmarks when the module regains focus', () => {
    expect(mockAddListener).toHaveBeenCalledWith('focus', expect.any(Function));
  });
});
