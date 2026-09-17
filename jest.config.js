/**
 * Two projects, one per platform.
 *
 * The React Native preset resolves platform extensions with `haste
 * .defaultPlatform`, which it pins to `ios`. That is the right default — most
 * of the suite is platform-agnostic, and the shared files are the iOS ones —
 * but it means a `.android.tsx` file is never loaded and `Platform.OS` is
 * never `'android'`, so the Material pass would go entirely untested.
 *
 * Tests under `__tests__/android/` run in the second project instead, where
 * both of those are true.
 */
const shared = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@maplibre|uuid|react-native-sensors|astronomia)/)',
  ],
  moduleNameMapper: {
    '@react-native-async-storage/async-storage':
      '<rootDir>/__mocks__/@react-native-async-storage/async-storage.ts',
    '@react-native-clipboard/clipboard':
      '<rootDir>/__mocks__/@react-native-clipboard/clipboard.ts',
    'react-native-fs': '<rootDir>/__mocks__/react-native-fs.ts',
    '@maplibre/maplibre-react-native':
      '<rootDir>/__mocks__/@maplibre/maplibre-react-native.tsx',
    '@react-native-menu/menu':
      '<rootDir>/__mocks__/@react-native-menu/menu.tsx',
    '@react-native-segmented-control/segmented-control':
      '<rootDir>/__mocks__/@react-native-segmented-control/segmented-control.tsx',
  },
};

module.exports = {
  projects: [
    {
      ...shared,
      displayName: 'ios',
      testPathIgnorePatterns: [
        '/node_modules/',
        '<rootDir>/__tests__/android/',
      ],
    },
    {
      ...shared,
      displayName: 'android',
      haste: {
        defaultPlatform: 'android',
        platforms: ['android', 'native'],
      },
      testMatch: ['<rootDir>/__tests__/android/**/*.test.{ts,tsx}'],
    },
  ],
};
