import React from 'react';
import { View } from 'react-native';

export type TutorialSpotlightTarget =
  | 'logo'
  | 'navSearch'
  | 'sectionHeader'
  | 'footerButtons';

export type SpotlightLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TutorialSpotlightContextValue = {
  target: TutorialSpotlightTarget | undefined;
  setSpotlightLayout: (layout: SpotlightLayout | null) => void;
  containerRef: { current: View | null };
  navSearchRef: React.RefObject<View | null>;
  sectionHeaderRef: React.RefObject<View | null>;
};

export const TutorialSpotlightContext =
  React.createContext<TutorialSpotlightContextValue>({
    target: undefined,
    setSpotlightLayout: () => {},
    containerRef: { current: null },
    navSearchRef: { current: null },
    sectionHeaderRef: { current: null },
  });
