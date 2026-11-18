import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LookupQueue,
  LookupResult,
  ProductInfo,
  lookupProduct,
} from '../../../services/productLookup';

/** Where the lookup for one barcode stands. */
export type LookupState =
  /** Waiting its turn in the queue, or asking now. */
  | { status: 'pending' }
  | { status: 'found'; product: ProductInfo }
  /** Open Food Facts doesn't list it. Not asked again this visit. */
  | { status: 'not-found' }
  /** Offline or the service failed. Asked again when back online. */
  | { status: 'unavailable' };

type Options = {
  /** The user's Settings > Pantry choice. */
  enabled: boolean;
  /** Best guess at a connection; unknown counts as online. */
  online: boolean;
  /** Replaceable in tests. */
  lookup?: (barcode: string) => Promise<LookupResult>;
  queue?: LookupQueue;
};

class Cancelled extends Error {}

/**
 * Looks up barcodes the pantry doesn't know, for the scan screen.
 *
 * Each code is asked about once per visit. Requests go through a
 * {@link LookupQueue} to respect Open Food Facts' rate limit. A code seen
 * offline, or whose lookup failed, is marked `unavailable` and asked again
 * as soon as the connection is back. Requests still queued when the screen
 * closes are dropped.
 */
export function useProductLookups({
  enabled,
  online,
  lookup = lookupProduct,
  queue: givenQueue,
}: Options) {
  const [states, setStates] = useState<Record<string, LookupState>>({});
  const [queue] = useState(() => givenQueue ?? new LookupQueue());

  // Read inside callbacks without making them change every render.
  const statesRef = useRef(states);
  statesRef.current = states;
  const onlineRef = useRef(online);
  onlineRef.current = online;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const setState = useCallback((barcode: string, state: LookupState) => {
    if (!mounted.current) return;
    statesRef.current = { ...statesRef.current, [barcode]: state };
    setStates(statesRef.current);
  }, []);

  const start = useCallback(
    (barcode: string) => {
      if (!onlineRef.current) {
        setState(barcode, { status: 'unavailable' });
        return;
      }
      setState(barcode, { status: 'pending' });
      queue
        .run(() =>
          mounted.current ? lookup(barcode) : Promise.reject(new Cancelled()),
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
          if (!(error instanceof Cancelled)) {
            setState(barcode, { status: 'unavailable' });
          }
        });
    },
    [lookup, queue, setState],
  );

  /** Asks about `barcode` unless it has been asked about already. */
  const request = useCallback(
    (barcode: string) => {
      if (!enabled || statesRef.current[barcode]) return;
      start(barcode);
    },
    [enabled, start],
  );

  // Back online: ask again about everything that couldn't be looked up.
  useEffect(() => {
    if (!enabled || !online) return;
    for (const [barcode, state] of Object.entries(statesRef.current)) {
      if (state.status === 'unavailable') start(barcode);
    }
  }, [enabled, online, start]);

  return { states: enabled ? states : {}, request };
}
