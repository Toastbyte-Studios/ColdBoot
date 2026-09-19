/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

const flushPromises = () =>
  new Promise<void>((resolve) => {
    setImmediate(resolve);
  });

const createDeferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((resolver) => {
    resolve = resolver;
  });

  return { promise, resolve };
};

const setupStoreProviderModule = async (startupPromise: Promise<void>) => {
  const rootStore = {
    startupPromise,
    notesStore: {
      notesDb: { name: 'notes-db' },
      loadNotes: jest.fn(async () => undefined),
    },
    checklistStore: {
      loadChecklists: jest.fn(async () => undefined),
    },
    barometerStore: {
      start: jest.fn(),
      stop: jest.fn(),
    },
    weatherOutlookStore: {
      start: jest.fn(),
      stop: jest.fn(),
    },
    coreStore: {
      startDeviceStatusMonitoring: jest.fn(),
      stopDeviceStatusMonitoring: jest.fn(),
    },
    astronomyEventStore: {
      start: jest.fn(),
      stop: jest.fn(),
    },
    solarCycleNotificationStore: {
      start: jest.fn(),
      stop: jest.fn(),
    },
  };

  jest.resetModules();
  jest.doMock('react', () => React);
  jest.doMock('../src/stores/RootStore', () => ({
    RootStore: jest.fn(() => rootStore),
  }));

  const { StoreProvider } = require('../src/stores/StoreContext');

  return { StoreProvider, rootStore };
};

describe('StoreProvider startup lifecycle', () => {
  test('starts DB-backed stores after the current startup promise resolves', async () => {
    const { StoreProvider, rootStore } = await setupStoreProviderModule(
      Promise.resolve(),
    );

    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <StoreProvider>{null}</StoreProvider>,
      );
      await flushPromises();
    });

    expect(rootStore.barometerStore.start).toHaveBeenCalledWith(
      rootStore.notesStore.notesDb,
    );
    expect(rootStore.weatherOutlookStore.start).toHaveBeenCalledWith(
      rootStore.coreStore,
    );
    expect(rootStore.notesStore.loadNotes).toHaveBeenCalledTimes(1);
    expect(rootStore.checklistStore.loadChecklists).toHaveBeenCalledTimes(1);

    act(() => {
      renderer.unmount();
    });
  });

  test('ignores stale startup continuations after reset replaces the startup promise', async () => {
    const deferred = createDeferred();
    const { StoreProvider, rootStore } = await setupStoreProviderModule(
      deferred.promise,
    );

    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <StoreProvider>{null}</StoreProvider>,
      );
      await flushPromises();
    });

    rootStore.startupPromise = Promise.resolve();

    await act(async () => {
      deferred.resolve();
      await deferred.promise;
      await flushPromises();
    });

    expect(rootStore.barometerStore.start).not.toHaveBeenCalled();
    expect(rootStore.weatherOutlookStore.start).not.toHaveBeenCalled();
    expect(rootStore.notesStore.loadNotes).not.toHaveBeenCalled();
    expect(rootStore.checklistStore.loadChecklists).not.toHaveBeenCalled();

    act(() => {
      renderer.unmount();
    });
  });
});
