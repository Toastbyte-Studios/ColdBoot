import React from 'react';
import { View, ViewProps } from 'react-native';

/** Spy for `ref.show()`, which the Android back button calls on long press. */
export const mockMenuShow = jest.fn();

/**
 * Renders the trigger inside a plain View and passes every prop through, so
 * tests can find a menu by `actions` and fire `onPressAction` directly. A ref
 * gets `{ show }`, the library's Android-only imperative open.
 */
type MockMenuProps = { children?: React.ReactNode; [prop: string]: unknown };

export const MenuView = React.forwardRef<{ show: () => void }, MockMenuProps>(
  ({ children, ...props }, ref) => {
    React.useImperativeHandle(ref, () => ({ show: mockMenuShow }));
    return <View {...(props as ViewProps)}>{children as React.ReactNode}</View>;
  },
);
MenuView.displayName = 'MenuView';
