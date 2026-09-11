module.exports = {
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
