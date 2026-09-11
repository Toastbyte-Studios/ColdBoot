import React from 'react';
import { View } from 'react-native';

/**
 * Renders a plain View with every prop passed through, so tests can find the
 * control by `values` and fire `onChange` with a synthetic native event.
 */
const SegmentedControl = (props: Record<string, unknown>) =>
  React.createElement(View, props);

export default SegmentedControl;
