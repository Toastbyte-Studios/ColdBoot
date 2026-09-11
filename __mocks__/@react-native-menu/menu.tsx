import React from 'react';
import { View } from 'react-native';

/**
 * Renders the trigger inside a plain View and passes every prop through, so
 * tests can find a menu by `actions` and fire `onPressAction` directly.
 */
export const MenuView = ({
  children,
  ...props
}: React.PropsWithChildren<Record<string, unknown>>) =>
  React.createElement(
    View,
    props as React.ComponentProps<typeof View>,
    children,
  );
