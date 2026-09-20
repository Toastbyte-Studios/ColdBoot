// Resolve the real light-mode tokens rather than restating them here, so the
// mock cannot drift out of the palette again the way the warm hexes did.
jest.mock('../src/hooks/useTheme', () => ({
  useTheme: jest.fn(() => require('../src/theme/colors').LIGHT_COLORS),
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

// HelpModal and TutorialModal render AppButton, whose label goes through
// ScaledText. ScaledText is a mobx-react-lite observer reading the settings
// store, which this suite does not provide; the plain Text is enough here.
jest.mock('../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
}));

type PlatformName = 'android' | 'ios';
type ReactTestRenderer = import('react-test-renderer').ReactTestRenderer;
type RendererModule = typeof import('react-test-renderer');

const ORIGINAL_PLATFORM = require('react-native').Platform.OS;

const setPlatform = (platform: PlatformName) => {
  Object.defineProperty(require('react-native').Platform, 'OS', {
    configurable: true,
    value: platform,
  });
};

const renderTutorialModal = ({
  platform,
  onComplete = jest.fn(),
  onSkip = jest.fn(),
  onSpotlightTargetChange,
}: {
  platform: PlatformName;
  onComplete?: jest.Mock;
  onSkip?: jest.Mock;
  onSpotlightTargetChange?: jest.Mock;
}) => {
  jest.resetModules();
  setPlatform(platform);
  const React = require('react');
  const ReactTestRenderer: RendererModule = require('react-test-renderer');
  const TutorialModal = require('../src/components/TutorialModal').default;
  let tree!: ReactTestRenderer;

  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(TutorialModal, {
        visible: true,
        onComplete,
        onSkip,
        onSpotlightTargetChange,
      }),
    );
  });

  return {
    act: ReactTestRenderer.act,
    onComplete,
    onSkip,
    tree,
  };
};

const renderHelpModal = (platform: PlatformName) => {
  jest.resetModules();
  setPlatform(platform);
  const React = require('react');
  const ReactTestRenderer: RendererModule = require('react-test-renderer');
  const { HelpModal } = require('../src/components/HelpModal');
  const onClose = jest.fn();
  const onLaunchTutorial = jest.fn();
  let tree!: ReactTestRenderer;

  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(HelpModal, {
        visible: true,
        onClose,
        onLaunchTutorial,
      }),
    );
  });

  return {
    act: ReactTestRenderer.act,
    onClose,
    onLaunchTutorial,
    tree,
  };
};

afterEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  setPlatform(ORIGINAL_PLATFORM);
});

describe('Tutorial flow components', () => {
  test('TutorialModal advances through steps and completes', () => {
    const onComplete = jest.fn();
    const onSkip = jest.fn();
    const { act, tree } = renderTutorialModal({
      platform: 'ios',
      onComplete,
      onSkip,
    });

    for (let step = 0; step < 6; step += 1) {
      act(() => {
        tree.root
          .findByProps({ accessibilityLabel: 'Next tutorial step' })
          .props.onPress();
      });
    }

    act(() => {
      tree.root
        .findByProps({ accessibilityLabel: 'Finish tutorial' })
        .props.onPress();
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onSkip).not.toHaveBeenCalled();
  });

  test('TutorialModal spotlights guided UI targets and hides skip on done', () => {
    const onSpotlightTargetChange = jest.fn();
    const { act, tree } = renderTutorialModal({
      platform: 'ios',
      onComplete: jest.fn(),
      onSkip: jest.fn(),
      onSpotlightTargetChange,
    });

    const pressNext = () => {
      act(() => {
        tree.root
          .findByProps({ accessibilityLabel: 'Next tutorial step' })
          .props.onPress();
      });
    };

    pressNext();
    pressNext();
    pressNext();
    pressNext();

    const renderedStep = JSON.stringify(tree.toJSON());

    expect(renderedStep).toContain('Shortcuts');
    expect(renderedStep).not.toContain('Tab Bar');
    expect(
      tree.root.findByProps({
        accessibilityLabel:
          'Your most-used tools and Alerts, one tap away. Change them in Settings.',
      }),
    ).toBeTruthy();
    expect(() =>
      tree.root.findByProps({
        accessibilityLabel:
          'Your most-used tools and Alerts, one tap away. Change them in Settings. Hold the red SOS button for one second in an emergency.',
      }),
    ).toThrow();

    pressNext();
    pressNext();

    expect(() =>
      tree.root.findByProps({ accessibilityLabel: 'Skip tutorial' }),
    ).toThrow();

    expect(onSpotlightTargetChange).toHaveBeenCalledWith('logo');
    expect(onSpotlightTargetChange).toHaveBeenCalledWith('navSearch');
    expect(onSpotlightTargetChange).toHaveBeenCalledWith('footerButtons');
  });

  test.each([
    {
      platform: 'android' as const,
      expectedTitle: 'Go Back',
      unexpectedTitle: 'Swipe to Navigate',
      expectedDescription:
        "Use your phone's back gesture or button to return to the previous screen.",
      unexpectedDescription:
        'Swipe left or right to move between sections and tools.',
    },
    {
      platform: 'ios' as const,
      expectedTitle: 'Swipe to Navigate',
      unexpectedTitle: 'Go Back',
      expectedDescription:
        'Swipe left or right to move between sections and tools.',
      unexpectedDescription:
        "Use your phone's back gesture or button to return to the previous screen.",
    },
  ])(
    'TutorialModal renders $platform navigation copy',
    ({
      platform,
      expectedTitle,
      unexpectedTitle,
      expectedDescription,
      unexpectedDescription,
    }) => {
      const { act, tree } = renderTutorialModal({ platform });

      act(() => {
        tree.root
          .findByProps({ accessibilityLabel: 'Next tutorial step' })
          .props.onPress();
      });

      const rendered = JSON.stringify(tree.toJSON());

      expect(rendered).toContain(expectedTitle);
      expect(rendered).toContain(expectedDescription);
      expect(rendered).not.toContain(unexpectedTitle);
      expect(rendered).not.toContain(unexpectedDescription);
    },
  );

  test('HelpModal launches tutorial from How to use section', () => {
    const { act, onLaunchTutorial, tree } = renderHelpModal('ios');

    act(() => {
      tree.root
        .findByProps({ accessibilityLabel: 'How to use collapsed' })
        .props.onPress();
    });

    act(() => {
      tree.root
        .findByProps({ accessibilityLabel: 'Replay tutorial now' })
        .props.onPress();
    });

    expect(() =>
      tree.root.findByProps({ accessibilityLabel: 'Reset tutorial progress' }),
    ).toThrow();

    expect(onLaunchTutorial).toHaveBeenCalledTimes(1);
  });

  test.each([
    {
      platform: 'android' as const,
      expectedDescription:
        "Use your phone's back gesture or button to return to the previous screen.",
      unexpectedDescription: 'Swipe left or right to navigate between screens.',
    },
    {
      platform: 'ios' as const,
      expectedDescription: 'Swipe left or right to navigate between screens.',
      unexpectedDescription:
        "Use your phone's back gesture or button to return to the previous screen.",
    },
  ])(
    'HelpModal renders $platform navigation copy in How to use',
    ({ platform, expectedDescription, unexpectedDescription }) => {
      const { act, tree } = renderHelpModal(platform);

      act(() => {
        tree.root
          .findByProps({ accessibilityLabel: 'How to use collapsed' })
          .props.onPress();
      });

      const rendered = JSON.stringify(tree.toJSON());

      expect(rendered).toContain(expectedDescription);
      expect(rendered).not.toContain(unexpectedDescription);
    },
  );
});
