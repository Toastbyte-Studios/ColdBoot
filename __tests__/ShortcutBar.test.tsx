import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import ShortcutBar from '../src/components/ShortcutBar';

const mockNavigate = jest.fn();
const mockOnAlertsPress = jest.fn();
const mockOnAlertsClose = jest.fn();
const mockSetFlashlightMode = jest.fn();

let mockNotificationCount = 3;
let mockCurrentRouteName = 'Home';

const mockSettingsStore = {
  shortcuts: ['core_flashlight', 'nav_map', 'core_voice_log'],
};

const mockSignalingStore = {
  flashlightMode: 'off',
  setFlashlightMode: mockSetFlashlightMode,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, top: 0, left: 0, right: 0 }),
}));

jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => require('../src/theme/colors').LIGHT_COLORS,
}));

jest.mock('../src/hooks/useAllNotifications', () => ({
  useVisibleNotificationCount: () => mockNotificationCount,
}));

jest.mock('../src/stores', () => ({
  useSettingsStore: () => mockSettingsStore,
  useSignalingStore: () => mockSignalingStore,
}));

jest.mock('../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
}));

jest.mock('../src/navigation/navigationRef', () => ({
  navigationRef: {
    isReady: () => true,
    getCurrentRoute: () => ({ name: mockCurrentRouteName }),
    addListener: () => jest.fn(),
  },
}));

describe('ShortcutBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotificationCount = 3;
    mockCurrentRouteName = 'Home';
    mockSettingsStore.shortcuts = [
      'core_flashlight',
      'nav_map',
      'core_voice_log',
    ];
    mockSignalingStore.flashlightMode = 'off';
  });

  function render() {
    return renderWithProps(false);
  }

  function renderWithProps(alertsActive: boolean) {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <ShortcutBar
          onAlertsPress={mockOnAlertsPress}
          onAlertsClose={mockOnAlertsClose}
          alertsActive={alertsActive}
        />,
      );
    });
    return tree;
  }

  it('renders the configured shortcuts plus Alerts', () => {
    const tree = render();
    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered).toContain('Flashlight');
    expect(rendered).toContain('Map');
    expect(rendered).toContain('Voice Log');
    expect(rendered).toContain('Alerts');
  });

  it('navigates to a shortcut screen when tapped', () => {
    const tree = render();

    ReactTestRenderer.act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Map' }).props.onPress();
    });

    expect(mockOnAlertsClose).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('MapScreen');
  });

  it('opens alerts from the Alerts button', () => {
    const tree = render();

    ReactTestRenderer.act(() => {
      tree.root
        .findByProps({ accessibilityLabel: 'Alerts, 3 notifications' })
        .props.onPress();
    });

    expect(mockOnAlertsPress).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows the badge count on Alerts', () => {
    const tree = render();
    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered).toContain('3');
  });

  it('long-presses Flashlight to toggle the light without navigating', () => {
    const tree = render();
    const flashlightButton = tree.root.findByProps({
      accessibilityLabel: 'Flashlight',
    });

    ReactTestRenderer.act(() => {
      flashlightButton.props.onLongPress();
      flashlightButton.props.onPress();
    });

    expect(mockSetFlashlightMode).toHaveBeenCalledWith('on');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('marks Alerts as active while the alerts sheet is open', () => {
    mockCurrentRouteName = 'MapScreen';
    const tree = renderWithProps(true);

    expect(
      tree.root.findByProps({ accessibilityLabel: 'Alerts, 3 notifications' })
        .props.accessibilityState,
    ).toEqual({ selected: true });
    expect(
      tree.root.findByProps({ accessibilityLabel: 'Map' }).props
        .accessibilityState,
    ).toEqual({ selected: false });
  });
});
