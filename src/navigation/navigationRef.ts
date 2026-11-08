import {
  createNavigationContainerRef,
  type ParamListBase,
} from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<ParamListBase>();

/**
 * Determines whether the app can navigate back from the current screen.
 *
 * @returns `true` if the navigation container is ready and there is a previous screen
 * on the navigation stack; otherwise, `false`.
 */
export default function canGoBack(): boolean {
  return navigationRef.isReady() && navigationRef.canGoBack();
}

/**
 * Navigates back to the previous screen if the navigator can go back.
 *
 * This is a safe wrapper around {@link navigationRef.goBack} that first checks
 * {@link canGoBack} to prevent errors when there is no back stack.
 *
 * @returns Nothing.
 */
export function goBack(): void {
  if (canGoBack()) {
    navigationRef.goBack();
  }
}
