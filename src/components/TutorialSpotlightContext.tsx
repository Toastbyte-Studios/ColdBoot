import React from 'react';
import { View } from 'react-native';

/** The app-wide controls the first-run tour points at. */
export type ShellSpotlightTarget =
  | 'logo'
  | 'navSearch'
  | 'settings'
  | 'sectionHeader'
  | 'footerButtons';

/** The Map screen's controls, spotlit by the map tour. */
export type MapSpotlightTarget =
  | 'mapView'
  | 'mapLibrary'
  | 'mapWaypoint'
  | 'mapRecord'
  | 'mapFollow'
  | 'mapTrails'
  | 'mapTour'
  | 'mapCompass';

export type TutorialSpotlightTarget = ShellSpotlightTarget | MapSpotlightTarget;

export type SpotlightLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** A short line under a step's description, with its own icon. */
export interface TutorialTip {
  icon: string;
  text: string;
}

export interface TutorialStep {
  id: string;
  icon: string;
  title: string;
  description: string;
  spotlightTarget?: TutorialSpotlightTarget;
  tips?: TutorialTip[];
  /** Shows a chip for each module, read from MODULES so it can't drift. */
  showModules?: boolean;
}

/** How a tour ended: the last step's button, or Skip. */
export type TutorialFinishReason = 'complete' | 'skip';

/**
 * A guided tour the shell can run over whatever screen is showing. The first
 * run tour and the Map's own tour are both one of these.
 */
export interface TutorialTour {
  /** Also resets the card to step one when a different tour starts. */
  id: string;
  steps: TutorialStep[];
  /** Short tours can use a shorter card, so it covers less of the screen. */
  minCardHeight?: number;
  onFinish?: (reason: TutorialFinishReason) => void;
}

export type TutorialSpotlightContextValue = {
  target: TutorialSpotlightTarget | undefined;
  setSpotlightLayout: (layout: SpotlightLayout | null) => void;
  containerRef: { current: View | null };
  navSearchRef: React.RefObject<View | null>;
  sectionHeaderRef: React.RefObject<View | null>;
  /**
   * Lets a screen offer a view to spotlight under a target name. Returns the
   * matching unregister. Absent outside AppShell.
   */
  registerSpotlightTarget?: (
    target: TutorialSpotlightTarget,
    ref: React.RefObject<View | null>,
  ) => () => void;
  /** Starts a tour, replacing any that is running. Absent outside AppShell. */
  startTour?: (tour: TutorialTour) => void;
  /** Ends the tour with this id, if it is the one running, without finishing it. */
  endTour?: (id: string) => void;
  /** The id of the tour on screen, if any. */
  activeTourId?: string;
};

export const TutorialSpotlightContext =
  React.createContext<TutorialSpotlightContextValue>({
    target: undefined,
    setSpotlightLayout: () => {},
    containerRef: { current: null },
    navSearchRef: { current: null },
    sectionHeaderRef: { current: null },
  });
