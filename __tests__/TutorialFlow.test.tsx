// Resolve the real light-mode tokens rather than restating them here, so the
// mock cannot drift out of the palette again the way the warm hexes did.
jest.mock('../src/hooks/useTheme', () => ({
  useTheme: jest.fn(() => require('../src/theme/colors').LIGHT_COLORS),
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

// HelpModal is a sheet that reads safe-area insets, and this suite renders it
// without a SafeAreaProvider.
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

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

    const { TUTORIAL_STEPS } = require('../src/components/TutorialModal');

    for (let step = 0; step < TUTORIAL_STEPS.length - 1; step += 1) {
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
    const { TUTORIAL_STEPS } = require('../src/components/TutorialModal');
    const stepIndex = (id: string) =>
      TUTORIAL_STEPS.findIndex((step: { id: string }) => step.id === id);

    const pressNext = (times = 1) => {
      for (let i = 0; i < times; i += 1) {
        act(() => {
          tree.root
            .findByProps({ accessibilityLabel: 'Next tutorial step' })
            .props.onPress();
        });
      }
    };

    pressNext(stepIndex('shortcuts'));

    const renderedStep = JSON.stringify(tree.toJSON());

    expect(renderedStep).toContain('Shortcuts');
    expect(renderedStep).toContain(
      `Step ${stepIndex('shortcuts') + 1} of ${TUTORIAL_STEPS.length}`,
    );
    expect(
      tree.root.findByProps({
        accessibilityLabel:
          'Your most-used tools and Alerts, one tap away. Change them in Settings.',
      }),
    ).toBeTruthy();

    pressNext(TUTORIAL_STEPS.length - 1 - stepIndex('shortcuts'));

    expect(() =>
      tree.root.findByProps({ accessibilityLabel: 'Skip tutorial' }),
    ).toThrow();

    expect(onSpotlightTargetChange).toHaveBeenCalledWith('logo');
    expect(onSpotlightTargetChange).toHaveBeenCalledWith('navSearch');
    expect(onSpotlightTargetChange).toHaveBeenCalledWith('settings');
    expect(onSpotlightTargetChange).toHaveBeenCalledWith('footerButtons');
  });

  test('TutorialModal goes back a step and hides Back on the first step', () => {
    const onSpotlightTargetChange = jest.fn();
    const { act, tree } = renderTutorialModal({
      platform: 'ios',
      onSpotlightTargetChange,
    });

    expect(() =>
      tree.root.findByProps({ accessibilityLabel: 'Previous tutorial step' }),
    ).toThrow();

    act(() => {
      tree.root
        .findByProps({ accessibilityLabel: 'Next tutorial step' })
        .props.onPress();
    });
    act(() => {
      tree.root
        .findByProps({ accessibilityLabel: 'Next tutorial step' })
        .props.onPress();
    });
    expect(onSpotlightTargetChange).toHaveBeenLastCalledWith('logo');

    act(() => {
      tree.root
        .findByProps({ accessibilityLabel: 'Previous tutorial step' })
        .props.onPress();
    });

    expect(JSON.stringify(tree.toJSON())).toContain('Swipe to Navigate');
    expect(onSpotlightTargetChange).toHaveBeenLastCalledWith(undefined);
  });

  test('TutorialModal lists every module', () => {
    const { act, tree } = renderTutorialModal({ platform: 'ios' });
    const { TUTORIAL_STEPS } = require('../src/components/TutorialModal');
    const { MODULES } = require('../constants');
    const modulesIndex = TUTORIAL_STEPS.findIndex(
      (step: { id: string }) => step.id === 'modules',
    );

    for (let i = 0; i < modulesIndex; i += 1) {
      act(() => {
        tree.root
          .findByProps({ accessibilityLabel: 'Next tutorial step' })
          .props.onPress();
      });
    }

    const rendered = JSON.stringify(tree.toJSON());
    for (const module of MODULES) {
      expect(rendered).toContain(module.name);
    }
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

  test('HelpModal replays the map tour from How to use', () => {
    jest.resetModules();
    setPlatform('ios');
    const React = require('react');
    const ReactTestRenderer: RendererModule = require('react-test-renderer');
    const { HelpModal } = require('../src/components/HelpModal');
    const onLaunchMapTutorial = jest.fn();
    let tree!: ReactTestRenderer;

    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        React.createElement(HelpModal, {
          visible: true,
          onClose: jest.fn(),
          onLaunchTutorial: jest.fn(),
          onLaunchMapTutorial,
        }),
      );
    });

    ReactTestRenderer.act(() => {
      tree.root
        .findByProps({ accessibilityLabel: 'How to use collapsed' })
        .props.onPress();
    });
    ReactTestRenderer.act(() => {
      tree.root
        .findByProps({
          accessibilityLabel: 'Open the map and replay its tour',
        })
        .props.onPress();
    });

    expect(onLaunchMapTutorial).toHaveBeenCalledTimes(1);
  });

  test('TutorialModal renders the steps it is given', () => {
    jest.resetModules();
    setPlatform('ios');
    const React = require('react');
    const ReactTestRenderer: RendererModule = require('react-test-renderer');
    const TutorialModal = require('../src/components/TutorialModal').default;
    const { MAP_TUTORIAL_STEPS } = require('../src/screens/Map/mapTour');
    let tree!: ReactTestRenderer;

    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        React.createElement(TutorialModal, {
          visible: true,
          onComplete: jest.fn(),
          onSkip: jest.fn(),
          steps: MAP_TUTORIAL_STEPS,
          placement: 'top',
        }),
      );
    });

    const rendered = JSON.stringify(tree.toJSON());
    expect(rendered).toContain('Map Basics');
    expect(rendered).toContain(`Step 1 of ${MAP_TUTORIAL_STEPS.length}`);
  });

  test('HelpModal links URLs without their trailing full stop', () => {
    const { act, tree } = renderHelpModal('ios');

    act(() => {
      tree.root
        .findByProps({ accessibilityLabel: 'Terms of Use collapsed' })
        .props.onPress();
    });

    const links = tree.root.findAll(
      (node) =>
        node.props.accessibilityRole === 'link' &&
        typeof node.props.onPress === 'function',
      { deep: false },
    );

    expect(links.map((link) => link.props.children)).toEqual([
      'https://toastbyte.studio/coldboot/terms',
    ]);
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
