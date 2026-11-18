import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LookupCancelledError,
  LookupQueue,
  LookupResult,
  ProductInfo,
  lookupProduct,
  sharedLookupQueue,
} from '../../../services/productLookup';

/** Where the lookup for one barcode stands. */
export type LookupState =
  /** Waiting its turn in the queue, or asking now. */
  | { status: 'pending' }
  | { status: 'found'; product: ProductInfo }
  /** Open Food Facts doesn't list it. Not asked again this visit. */
  | { status: 'not-found' }
  /**
   * Offline or the service failed. Asked again when the connection comes
   * back, or when the barcode is scanned again while online.
   */
  | { status: 'unavailable' };

type Options = {
  /** The user's Settings > Pantry choice. */
  enabled: boolean;
  /** Best guess at a connection; unknown counts as online. */
  online: boolean;
  /** Replaceable in tests. */
  lookup?: (barcode: string) => Promise<LookupResult>;
  /** Defaults to the app-wide queue, so spacing holds across visits. */
  queue?: LookupQueue;
};

/**
 * Looks up barcodes the pantry doesn't know, for the scan screen.
 *
 * - Each code is asked about once per visit, through the shared
 *   {@link LookupQueue} that keeps to Open Food Facts' rate limit.
 * - A code seen offline, or whose lookup failed, is `unavailable` and asked
 *   again when the connection comes back or the code is scanned again.
 * - A lookup that fails just after a reconnect gets one immediate retry,
 *   since the reconnect it would have waited for has already happened.
 * - Queued lookups are withdrawn when the screen closes or lookups are
 *   turned off (Settings opens over this screen), and forgotten so they
 *   can be asked for again later.
 */
export function useProductLookups({
  enabled,
  online,
  lookup = lookupProduct,
  queue = sharedLookupQueue,
}: Options) {
  const [states, setStates] = useState<Record<string, LookupState>>({});

  // Read inside callbacks and queued tasks, which outlive a render.
  const statesRef = useRef(states);
  const onlineRef = useRef(online);
  onlineRef.current = online;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const mounted = useRef(true);
  /** Counts transitions to online, so a failed lookup can tell it missed one. */
  const reconnects = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const update = useCallback(
    (change: (current: Record<string, LookupState>) => void) => {
      if (!mounted.current) return;
      const next = { ...statesRef.current };
      change(next);
      statesRef.current = next;
      setStates(next);
    },
    [],
  );

  const setState = useCallback(
    (barcode: string, state: LookupState) =>
      update((next) => {
        next[barcode] = state;
      }),
    [update],
  );

  const start = useCallback(
    (barcode: string) => {
      if (!onlineRef.current) {
        setState(barcode, { status: 'unavailable' });
        return;
      }
      setState(barcode, { status: 'pending' });
      const reconnectsAtStart = reconnects.current;
      queue
        .run(
          () => lookup(barcode),
          () => mounted.current && enabledRef.current,
        )
        .then((result) =>
          setState(
            barcode,
            result.status === 'found'
              ? { status: 'found', product: result.product }
              : { status: 'not-found' },
          ),
        )
        .catch((error: unknown) => {
          if (error instanceof LookupCancelledError) {
            // Withdrawn: forget it, so it can be asked for again.
            update((next) => {
              delete next[barcode];
            });
            return;
          }
          const reconnectedSince = reconnects.current !== reconnectsAtStart;
          if (
            reconnectedSince &&
            onlineRef.current &&
            mounted.current &&
            enabledRef.current
          ) {
            start(barcode);
          } else {
            setState(barcode, { status: 'unavailable' });
          }
        });
    },
    [lookup, queue, setState, update],
  );

  /**
   * Asks about `barcode`, unless it has been asked about already. One that
   * couldn't be looked up is asked again.
   */
  const request = useCallback(
    (barcode: string) => {
      if (!enabled) return;
      const state = statesRef.current[barcode];
      if (state && state.status !== 'unavailable') return;
      if (state && !onlineRef.current) return;
      start(barcode);
    },
    [enabled, start],
  );

  useEffect(() => {
    if (online) reconnects.current += 1;
  }, [online]);

  // Back online (or turned back on): ask again about everything that
  // couldn't be looked up.
  useEffect(() => {
    if (!enabled || !online) return;
    for (const [barcode, state] of Object.entries(statesRef.current)) {
      if (state.status === 'unavailable') start(barcode);
    }
  }, [enabled, online, start]);

  return { states: enabled ? states : {}, request };
}
