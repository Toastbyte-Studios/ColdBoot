# ColdBoot

ColdBoot is a React Native app providing essential offline utilities and reference modules for survival, navigation, and more.

Built by [Toastbyte Studios](https://toastbyte.studio/).

## Features

ColdBoot is organized into six modules. The tool lists follow `MODULES` and the `*_TOOLS` arrays in [`constants.ts`](constants.ts):

- **Core** — device status, flashlight, voice log, notepad, unit conversion, checklists
- **Navigation** — offline map with compass, waypoints and track recording; star map and celestial navigation; map library; grid reference converter
- **Reference** — health, survival guide, weather, tools and knots, emergency
- **Comms** — Morse code, NATO phonetic alphabet, radio frequency references (with a US repeater lookup), digital whistle, decibel meter, ground-to-air signals
- **Prepper** — depletion calculator, pantry, inventory, scenario cards, barter estimator, emergency planner
- **Earth** — sun times, lunar cycles, barometric pressure, seasonal outlook, sky events

Throughout:

- **Offline-first design**: nearly every tool works with no connection at all. Map areas, the Seasonal Outlook and repeater listings are downloaded while online and kept for offline use; place-name labels on the map simply don't appear without a connection.
- **Search**: the header search finds any tool, reference entry, note, checklist, or pantry or inventory item, entirely on-device
- **Solar cycle alerts**: sunrise, sunset, dawn and dusk alerts in the Alerts sheet, based on your location
  - Always on, with no setting to turn them off; individual alerts can be dismissed
  - Dynamic time-remaining display (e.g., "Sunrise in 2h 30m")
  - Updates automatically when location changes
- **Sun time display**: calculated sunrise, sunset, dawn, dusk, solar noon, and golden hour times
- **Backup and restore**: export your data to a file you keep, and restore it from Settings

## Getting Started

### Prerequisites

- Node.js >= 20
- Yarn or npm
- Xcode (for iOS)
- Android Studio with NDK (for Android)

### Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/Toastbyte-Studios/ColdBoot.git
   cd ColdBoot
   ```

2. Install dependencies:

   ```sh
   yarn install
   # or
   npm install
   ```

   `postinstall` runs `patch-package` and a React Native codegen patch automatically — see [`docs/PATCH-README.md`](docs/PATCH-README.md).

3. Install iOS pods:

   ```sh
   npx pod-install
   # or
   cd ios && pod install
   ```

### Running the App

- **iOS:**

  ```sh
  npm run ios
  ```

  Optional, to target a specific scheme and build mode:

  ```sh
  npx react-native run-ios --scheme ColdBoot --mode Debug
  ```

- **Android:**

  ```sh
  npm run android
  ```

  Android builds expect a Google Maps API key. To build without one:

  ```sh
  cd android && ./gradlew assembleDebug -PGOOGLE_MAPS_API_KEY=MAPS_API_KEY_NOT_SET
  ```

### Scripts

| Command             | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm start`         | Start the Metro bundler                       |
| `npm run ios`       | Build and run on iOS                          |
| `npm run android`   | Build and run on Android                      |
| `npm run lint`      | Run ESLint                                    |
| `npm run format`    | Format with Prettier                          |
| `npm run typecheck` | Type-check with `tsc --noEmit`                |
| `npm test`          | Run the Jest suite                            |
| `npm run cleanup`   | Format, lint, typecheck, and test in one pass |

CI runs lint, a Prettier check, typecheck, tests, New Architecture flag verification, and an Android smoke build on every pull request. Run `npm run cleanup` before pushing.

## Architecture

State is managed with MobX — see [`docs/MOBX_GUIDE.md`](docs/MOBX_GUIDE.md). Additional notes live in [`docs/`](docs/), covering dark mode and the Android Play Store audit.

## Troubleshooting

### Missing Scheme in Xcode

If you encounter an error about a missing scheme when building for iOS, ensure that the ColdBoot scheme is shared in Xcode:

```sh
mkdir -p ios/ColdBoot.xcodeproj/xcshareddata/xcschemes

# copy the real scheme (ignore the ._ file)
cp -f ios/ColdBoot.xcworkspace/xcshareddata/xcschemes/ColdBoot.xcscheme \
      ios/ColdBoot.xcodeproj/xcshareddata/xcschemes/ColdBoot.xcscheme

# sanity check: project should now list ColdBoot scheme
xcodebuild -list -project ios/ColdBoot.xcodeproj | sed -n '1,80p'
```

### macOS `._*` files (AppleDouble)

On macOS (especially when working from an external drive), Finder can create `._*` "AppleDouble" metadata files alongside real files. If these get picked up by build tooling (Metro/Xcode/Gradle) or accidentally committed, they can cause confusing build/runtime issues.

This repo ignores them via `.gitignore`, and also includes a cleanup script to remove any that already exist:

```sh
npm run clean:appledouble
```

## Contributing

Issues and pull requests are welcome. Open an issue first for anything larger than a typo, keep commits focused, and run `npm run cleanup` before opening a PR.

---

## License

MIT

## Author

[Toastbyte Studios](https://github.com/Toastbyte-Studios) — maintained by [jason-shprintz](https://github.com/jason-shprintz)
