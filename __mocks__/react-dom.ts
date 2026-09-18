/**
 * Jest resolves `mobx-react-lite` through its CommonJS `main` entry, which
 * pulls `unstable_batchedUpdates` from `react-dom`. Metro instead follows the
 * package's `react-native` entry, where the same import comes from
 * `react-native`. This stub keeps the test environment on the React Native
 * path so observer components render without `react-dom` being installed.
 */
export { unstable_batchedUpdates } from 'react-native';
