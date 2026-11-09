import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { InteractionManager, View } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import {
  TutorialSpotlightContext,
  TutorialSpotlightContextValue,
  TutorialTour,
} from '../src/components/TutorialSpotlightContext';
import {
  MAP_TOUR_ID,
  MAP_TUTORIAL_STEPS,
  MAP_TUTORIAL_STORAGE_KEY,
} from '../src/screens/Map/mapTour';
import { MapTour, useMapTour } from '../src/screens/Map/useMapTour';

const mockedStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
let mockIsFocused = true;

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockIsFocused,
}));

// Run deferred work at once, so a test doesn't wait on the push animation.
jest
  .spyOn(InteractionManager, 'runAfterInteractions')
  .mockImplementation((task) => {
    if (typeof task === 'function') task();
    return { cancel: jest.fn() } as unknown as ReturnType<
      typeof InteractionManager.runAfterInteractions
    >;
  });

function makeHost() {
  const unregister = jest.fn();
  const host: TutorialSpotlightContextValue = {
    target: undefined,
    setSpotlightLayout: jest.fn(),
    containerRef: { current: null },
    navSearchRef: { current: null },
    sectionHeaderRef: { current: null },
    startTour: jest.fn(),
    endTour: jest.fn(),
    registerSpotlightTarget: jest.fn(() => unregister),
  };
  return { host, unregister };
}

async function renderHook({
  host,
  replayRequested = false,
  onReplayHandled = jest.fn(),
}: {
  host?: TutorialSpotlightContextValue;
  replayRequested?: boolean;
  onReplayHandled?: jest.Mock;
}) {
  const result: { current?: MapTour } = {};
  function Harness() {
    result.current = useMapTour({ replayRequested, onReplayHandled });
    return <View />;
  }
  let tree!: ReactTestRenderer.ReactTestRenderer;
  const content = () =>
    host ? (
      <TutorialSpotlightContext.Provider value={host}>
        <Harness />
      </TutorialSpotlightContext.Provider>
    ) : (
      <Harness />
    );
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(content());
  });
  const focus = async (focused: boolean) => {
    mockIsFocused = focused;
    await ReactTestRenderer.act(async () => {
      tree.update(content());
    });
  };
  const requestReplay = async (requested: boolean) => {
    replayRequested = requested;
    await ReactTestRenderer.act(async () => {
      tree.update(content());
    });
  };
  return { result, tree, onReplayHandled, focus, requestReplay };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIsFocused = true;
  mockedStorage.setItem.mockResolvedValue(undefined);
});

describe('useMapTour', () => {
  test('ignores a storage read completed after blur and retries on focus', async () => {
    let resolveRead!: (value: string | null) => void;
    mockedStorage.getItem
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRead = resolve;
          }),
      )
      .mockResolvedValue(null);
    const { host } = makeHost();
    const { focus } = await renderHook({ host });

    await focus(false);
    await ReactTestRenderer.act(async () => {
      resolveRead(null);
    });
    expect(host.startTour).not.toHaveBeenCalled();

    await focus(true);
    expect(host.startTour).toHaveBeenCalledTimes(1);
  });

  test.each([false, true])(
    'cancels a deferred start on blur and retries on focus (replay: %s)',
    async (replayRequested) => {
      mockedStorage.getItem.mockResolvedValue(null);
      const callbacks: (() => void)[] = [];
      const cancel = jest.fn();
      const interactions = jest
        .spyOn(InteractionManager, 'runAfterInteractions')
        .mockImplementation((task) => {
          if (typeof task === 'function') callbacks.push(task);
          return { cancel } as unknown as ReturnType<
            typeof InteractionManager.runAfterInteractions
          >;
        });
      const { host } = makeHost();
      const { focus, onReplayHandled } = await renderHook({
        host,
        replayRequested,
      });

      await focus(false);
      expect(cancel).toHaveBeenCalledTimes(1);
      await ReactTestRenderer.act(async () => {
        callbacks[0]();
      });
      expect(host.startTour).not.toHaveBeenCalled();
      expect(onReplayHandled).not.toHaveBeenCalled();

      await focus(true);
      await ReactTestRenderer.act(async () => {
        callbacks[1]();
      });
      expect(host.startTour).toHaveBeenCalledTimes(1);
      expect(onReplayHandled).toHaveBeenCalledTimes(replayRequested ? 1 : 0);
      interactions.mockImplementation((task) => {
        if (typeof task === 'function') task();
        return { cancel: jest.fn() } as unknown as ReturnType<
          typeof InteractionManager.runAfterInteractions
        >;
      });
    },
  );

  test('restores a covered Map’s targets when the replay Map is popped', async () => {
    mockedStorage.getItem.mockResolvedValue('true');
    const { host } = makeHost();
    const registered = new Map<string, React.RefObject<View | null>>();
    (host.registerSpotlightTarget as jest.Mock).mockImplementation(
      (name: string, ref: React.RefObject<View | null>) => {
        registered.set(name, ref);
        return () => {
          if (registered.get(name) === ref) registered.delete(name);
        };
      },
    );
    const first = await renderHook({ host });
    const originalTargets = new Map(registered);
    await first.focus(false);
    expect(registered.size).toBe(0);
    expect(host.endTour).toHaveBeenCalledWith(MAP_TOUR_ID);

    mockIsFocused = true;
    const second = await renderHook({ host, replayRequested: true });
    expect(registered.get('mapView')).not.toBe(originalTargets.get('mapView'));
    await ReactTestRenderer.act(async () => {
      second.tree.unmount();
    });
    await first.focus(true);
    expect(registered).toEqual(originalTargets);
    await ReactTestRenderer.act(async () => {
      first.result.current?.replay?.();
    });
    expect(host.startTour).toHaveBeenCalledTimes(2);
  });

  test('without the app shell, location is not held back', async () => {
    const { result } = await renderHook({});

    expect(result.current?.readyForLocation).toBe(true);
    expect(result.current?.replay).toBeUndefined();
    expect(mockedStorage.getItem).not.toHaveBeenCalled();
  });

  test('first visit starts the tour and holds location until it ends', async () => {
    mockedStorage.getItem.mockResolvedValue(null);
    const { host } = makeHost();
    const { result } = await renderHook({ host });

    expect(mockedStorage.getItem).toHaveBeenCalledWith(
      MAP_TUTORIAL_STORAGE_KEY,
    );
    expect(host.startTour).toHaveBeenCalledTimes(1);
    expect(result.current?.readyForLocation).toBe(false);

    const tour = (host.startTour as jest.Mock).mock.calls[0][0] as TutorialTour;
    expect(tour.id).toBe(MAP_TOUR_ID);
    expect(tour.steps).toBe(MAP_TUTORIAL_STEPS);

    await ReactTestRenderer.act(async () => {
      tour.onFinish?.('skip');
    });

    expect(mockedStorage.setItem).toHaveBeenCalledWith(
      MAP_TUTORIAL_STORAGE_KEY,
      'true',
    );
    expect(result.current?.readyForLocation).toBe(true);
  });

  test('a returning visit skips the tour and asks for location', async () => {
    mockedStorage.getItem.mockResolvedValue('true');
    const { host } = makeHost();
    const { result } = await renderHook({ host });

    expect(host.startTour).not.toHaveBeenCalled();
    expect(result.current?.readyForLocation).toBe(true);
  });

  test('a storage failure never leaves location blocked', async () => {
    mockedStorage.getItem.mockRejectedValue(new Error('disk'));
    const { host } = makeHost();
    const { result } = await renderHook({ host });

    expect(host.startTour).not.toHaveBeenCalled();
    expect(result.current?.readyForLocation).toBe(true);
  });

  test('a replay request from Help starts the tour and is cleared', async () => {
    mockedStorage.getItem.mockResolvedValue('true');
    const { host } = makeHost();
    const { onReplayHandled } = await renderHook({
      host,
      replayRequested: true,
    });

    expect(onReplayHandled).toHaveBeenCalledTimes(1);
    expect(host.startTour).toHaveBeenCalledTimes(1);
  });

  test('clearing a first-visit replay request does not start a second tour', async () => {
    mockedStorage.getItem.mockResolvedValue(null);
    const { host } = makeHost();
    const { requestReplay } = await renderHook({
      host,
      replayRequested: true,
    });

    await requestReplay(false);
    expect(host.startTour).toHaveBeenCalledTimes(1);
    expect(mockedStorage.getItem).not.toHaveBeenCalled();
  });

  test('Help can replay again after the first-visit tour finishes', async () => {
    mockedStorage.getItem.mockResolvedValue(null);
    const { host } = makeHost();
    const { requestReplay } = await renderHook({ host });
    const tour = (host.startTour as jest.Mock).mock.calls[0][0] as TutorialTour;
    await ReactTestRenderer.act(async () => {
      tour.onFinish?.('complete');
    });

    await requestReplay(true);
    expect(host.startTour).toHaveBeenCalledTimes(2);
  });

  test('registers every spotlight target the steps use, and cleans up', async () => {
    mockedStorage.getItem.mockResolvedValue('true');
    const { host, unregister } = makeHost();
    const { tree } = await renderHook({ host });

    const registered = (
      host.registerSpotlightTarget as jest.Mock
    ).mock.calls.map(([name]) => name);
    for (const step of MAP_TUTORIAL_STEPS) {
      if (step.spotlightTarget) {
        expect(registered).toContain(step.spotlightTarget);
      }
    }

    await ReactTestRenderer.act(async () => {
      tree.unmount();
    });

    expect(unregister).toHaveBeenCalledTimes(registered.length);
    expect(host.endTour).toHaveBeenCalledWith(MAP_TOUR_ID);
  });
});
