import React from 'react';
import { Modal, StyleSheet } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import AlertsSheet from '../src/components/AlertsSheet';
import ShortcutBar from '../src/components/ShortcutBar';
import { FOOTER_HEIGHT, SCREEN_INSET } from '../src/theme';

const mockNavigate = jest.fn();
const mockOnAlertsPress = jest.fn();
const mockOnAlertsClose = jest.fn();
const mockSetFlashlightMode = jest.fn();

let mockNotificationCount = 3;
let mockCurrentRouteName = 'Home';
let mockCanGoBack = false;
let mockBottomInset = 0;
const mockGoBack = jest.fn();

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
  useSafeAreaInsets: () => ({
    bottom: mockBottomInset,
    top: 0,
    left: 0,
    right: 0,
  }),
}));

jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => require('../src/theme/colors').LIGHT_COLORS,
}));

jest.mock('../src/hooks/useAllNotifications', () => ({
  useAllNotifications: () => [],
  useVisibleNotificationCount: () => mockNotificationCount,
}));

jest.mock('../src/stores/StoreContext', () => ({
  useNotificationsStore: () => ({
    isHidden: () => false,
    hideNotifications: jest.fn(),
  }),
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
    canGoBack: () => mockCanGoBack,
    goBack: () => mockGoBack(),
    addListener: () => jest.fn(),
  },
}));

describe('ShortcutBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotificationCount = 3;
    mockCurrentRouteName = 'Home';
    mockCanGoBack = false;
    mockBottomInset = 0;
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

  it('long-presses Flashlight from non-off mode to turn it off', () => {
    mockSignalingStore.flashlightMode = 'sos';
    const tree = render();
    const flashlightButton = tree.root.findByProps({
      accessibilityLabel: 'Flashlight',
    });

    ReactTestRenderer.act(() => {
      flashlightButton.props.onLongPress();
      flashlightButton.props.onPress();
    });

    expect(mockSetFlashlightMode).toHaveBeenCalledWith('off');
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

  describe('Back', () => {
    const back = (tree: ReactTestRenderer.ReactTestRenderer) =>
      tree.root.find(
        (node) =>
          node.props.accessibilityLabel === 'Go back' &&
          typeof node.props.onPress === 'function',
      );

    it('is there but disabled on Home, so the tabs never shift', () => {
      const tree = render();
      expect(back(tree).props.disabled).toBe(true);
      expect(back(tree).props.accessibilityState).toEqual({ disabled: true });
    });

    it('goes back one screen elsewhere', () => {
      mockCurrentRouteName = 'MapScreen';
      mockCanGoBack = true;
      const tree = render();
      expect(back(tree).props.disabled).toBe(false);

      ReactTestRenderer.act(() => back(tree).props.onPress());
      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(mockOnAlertsClose).not.toHaveBeenCalled();
    });

    it('closes the Alerts sheet first when it is open', () => {
      const tree = renderWithProps(true);
      expect(back(tree).props.disabled).toBe(false);

      ReactTestRenderer.act(() => back(tree).props.onPress());
      expect(mockOnAlertsClose).toHaveBeenCalledTimes(1);
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('Alerts modal', () => {
    it('places an enabled Back inside the modal and reserves the safe area', () => {
      mockBottomInset = 34;
      let tree!: ReactTestRenderer.ReactTestRenderer;
      ReactTestRenderer.act(() => {
        tree = ReactTestRenderer.create(
          <AlertsSheet visible onClose={mockOnAlertsClose} />,
        );
      });

      const modal = tree.root.findByType(Modal);
      const back = modal.find(
        (node) =>
          node.props.accessibilityLabel === 'Go back' &&
          typeof node.props.onPress === 'function',
      );
      expect(back.props.disabled).toBe(false);
      const overlay = modal.findByProps({
        accessibilityLabel: 'Close alerts',
      }).parent;
      expect(StyleSheet.flatten(overlay?.props.style).paddingBottom).toBe(
        FOOTER_HEIGHT + mockBottomInset,
      );
      expect(
        modal.findAll((node) => {
          const style = StyleSheet.flatten(node.props.style);
          return (
            style?.position === 'absolute' &&
            style.left === SCREEN_INSET &&
            style.right === SCREEN_INSET &&
            style.bottom === 0
          );
        }).length,
      ).toBeGreaterThan(0);

      ReactTestRenderer.act(() => back.props.onPress());
      expect(mockOnAlertsClose).toHaveBeenCalledTimes(1);
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('closes the sheet and navigates when a modal shortcut is tapped', () => {
      let tree!: ReactTestRenderer.ReactTestRenderer;
      ReactTestRenderer.act(() => {
        tree = ReactTestRenderer.create(
          <AlertsSheet visible onClose={mockOnAlertsClose} />,
        );
      });

      ReactTestRenderer.act(() => {
        tree.root
          .findByType(Modal)
          .findByProps({ accessibilityLabel: 'Map' })
          .props.onPress();
      });
      expect(mockOnAlertsClose).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('MapScreen');
    });

    it('still dismisses from the backdrop and modal close request', () => {
      let tree!: ReactTestRenderer.ReactTestRenderer;
      ReactTestRenderer.act(() => {
        tree = ReactTestRenderer.create(
          <AlertsSheet visible onClose={mockOnAlertsClose} />,
        );
      });

      const modal = tree.root.findByType(Modal);
      ReactTestRenderer.act(() => {
        modal
          .findByProps({ accessibilityLabel: 'Close alerts' })
          .props.onPress();
        modal.props.onRequestClose();
      });
      expect(mockOnAlertsClose).toHaveBeenCalledTimes(2);
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });
});
