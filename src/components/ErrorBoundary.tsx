import React, { Component, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING } from '../theme';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  info: React.ErrorInfo | null;
}

/**
 * Top-level React error boundary. Catches rendering exceptions that would
 * otherwise crash the app silently on Android release builds.  In DEV mode
 * it still logs to the console so the red-screen overlay can pick it up; in
 * production it shows a minimal crash screen instead of a blank close.
 *
 * @remarks
 * This component deliberately imports the static `COLORS` palette rather than
 * reading the theme, so it renders the light scheme in both modes. That is an
 * exception to docs/NATIVE_REDESIGN.md finding 4, not an oversight:
 *
 * - It is a class component, so it cannot call `useTheme` directly.
 * - More importantly, a crash screen must not depend on context it cannot
 *   guarantee. If the thing that threw was the theme provider or anything
 *   above it, a themed error boundary would throw while rendering the error,
 *   and the user would get the blank close this component exists to prevent.
 *
 * If it ever does need to follow the scheme, read the colour scheme from
 * `Appearance.getColorScheme()` directly rather than from React context.
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error(
      '[ColdBoot] ErrorBoundary caught:',
      error,
      info.componentStack,
    );
    this.setState({ info });
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { error, info } = this.state;
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something went wrong</Text>
        <ScrollView style={styles.scroll}>
          <Text style={styles.errorName}>
            {error?.name ?? 'Error'}: {error?.message ?? 'Unknown error'}
          </Text>
          {__DEV__ && info?.componentStack ? (
            <Text style={styles.stack}>{info.componentStack}</Text>
          ) : null}
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.PRIMARY_DARK,
  },
  title: {
    color: COLORS.ERROR,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  scroll: {
    width: '100%',
  },
  errorName: {
    color: COLORS.PRIMARY_LIGHT,
    fontSize: 14,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  stack: {
    color: COLORS.BACKGROUND,
    fontSize: 11,
    fontFamily: 'monospace',
  },
});
