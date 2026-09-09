# Patch Notes

This project uses `patch-package` to persist native fixes for third-party libraries. The patches are automatically applied during `npm install` via the `postinstall` script.

---

## Patch: react-native-sensors Android — Gradle 9 `jcenter()` removal

This patch fixes `react-native-sensors@7.3.6` for Android builds using Gradle 9.

### What is patched

- File: `node_modules/react-native-sensors/android/build.gradle`
- Changes:
  - Top-level `repositories` block: removes the redundant `jcenter()` (since `mavenCentral()` is already present)
  - `buildscript.repositories` block: replaces `jcenter()` with `mavenCentral()`

### Why this is needed

- Gradle 9 removed `jcenter()`. The upstream `react-native-sensors` package still references it, causing the Android build to fail immediately with:

  ```text
  Could not find method jcenter() for arguments [] on repository container
  of type org.gradle.api.internal.artifacts.dsl.DefaultRepositoryHandler.
  ```

- The upstream package appears unmaintained, so a long-term alternative may be worth evaluating.

### How it is applied

- Patch file: `patches/react-native-sensors+7.3.6.patch`
- Script: `postinstall` runs `patch-package` automatically after `npm install` to reapply the patch.

### Developer instructions

- Installing dependencies applies the patch:
  - `npm install` (postinstall runs `patch-package`)
- If you wipe `node_modules`, simply run install again; the patch reapplies.
- To regenerate the patch after upgrading the library:
  1. In `node_modules/react-native-sensors/android/build.gradle`:
     - Top-level `repositories` block: remove `jcenter()` (leave the existing `mavenCentral()` and `google()`)
     - `buildscript.repositories` block: replace `jcenter()` with `mavenCentral()`
  2. Run:

  ```zsh
  npx patch-package react-native-sensors
  ```

  3. Commit the updated file under `patches/react-native-sensors+<new-version>.patch`.

---

## Patch: react-native-sqlite-storage Android — Gradle 9 `jcenter()` removal

This patch fixes `react-native-sqlite-storage@6.0.1` for Android builds using Gradle 9.

### What is patched

- File: `node_modules/react-native-sqlite-storage/platforms/android/build.gradle`
- Change: `buildscript.repositories` block: replaces `jcenter()` with `mavenCentral()`

### Why this is needed

- Gradle 9 removed `jcenter()`. The upstream `react-native-sqlite-storage` package still references it in the `buildscript` block, causing the Android build to fail immediately with:

  ```text
  Could not find method jcenter() for arguments [] on repository container
  of type org.gradle.api.internal.artifacts.dsl.DefaultRepositoryHandler.
  ```

- The upstream package appears unmaintained, so a long-term alternative may be worth evaluating.

### How it is applied

- Patch file: `patches/react-native-sqlite-storage+6.0.1.patch`
- Script: `postinstall` runs `patch-package` automatically after `npm install` to reapply the patch.

### Developer instructions

- Installing dependencies applies the patch:
  - `npm install` (postinstall runs `patch-package`)
- If you wipe `node_modules`, simply run install again; the patch reapplies.
- To regenerate the patch after upgrading the library:
  1. In `node_modules/react-native-sqlite-storage/platforms/android/build.gradle`, replace `jcenter()` with `mavenCentral()` in the `buildscript.repositories` block.
  2. Run:

  ```zsh
  npx patch-package react-native-sqlite-storage
  ```

  3. Commit the updated file under `patches/react-native-sqlite-storage+<new-version>.patch`.

---

## Patch: @react-native-community/slider Android — `ContextContainer::Shared` deprecated in RN 0.84

This patch fixes `@react-native-community/slider@4.5.7` for Android builds with React Native 0.84.

### What is patched

- File: `node_modules/@react-native-community/slider/common/cpp/react/renderer/components/RNCSlider/RNCSliderMeasurementsManager.h`
- Changes:
  - Constructor parameter: `const ContextContainer::Shared &contextContainer` → `const std::shared_ptr<const ContextContainer> &contextContainer`
  - Member field: `const ContextContainer::Shared contextContainer_` → `const std::shared_ptr<const ContextContainer> contextContainer_`

### Why this is needed

- React Native 0.84 marked `ContextContainer::Shared` as `[[deprecated]]`. The app's CMake target for `appmodules` compiles with `-Wall -Werror`, which turns the deprecation warning into a build error:

  ```text
  error: 'Shared' is deprecated: Use std::shared_ptr<const ContextContainer> instead.
  ```

- `ContextContainer::Shared` is a type alias for `std::shared_ptr<const ContextContainer>`, so the replacement is a drop-in fix with no behavioural change.

### How it is applied

- Patch file: `patches/@react-native-community+slider+4.5.7.patch`
- Script: `postinstall` runs `patch-package` automatically after `npm install` to reapply the patch.

### Developer instructions

- Installing dependencies applies the patch:
  - `npm install` (postinstall runs `patch-package`)
- If you wipe `node_modules`, simply run install again; the patch reapplies.
- To regenerate the patch after upgrading the library:
  1. Make the same two edits in the header file above.
  2. Due to the APFS-symlink in `android/build`, you cannot use `npx patch-package` directly. Instead, write the patch by hand (see existing file for format) and update this entry.
  3. Commit the updated file under `patches/@react-native-community+slider+<new-version>.patch`.

---

## Patch: react-native-torch iOS fix

This patch fixes `react-native-torch@1.2.0` on iOS.

## What is patched

- File: `node_modules/react-native-torch/ios/RCTTorch.m`
- Change: Update Objective-C method signature from `RCT_EXPORT_METHOD(switchState:(BOOL *)newState)` to `RCT_EXPORT_METHOD(switchState:(BOOL)newState)` so the React Native bridge can pass JS booleans correctly.

## Why this is needed

- The original signature takes a pointer to `BOOL`, which causes a runtime error on device: "Error while converting JavaScript argument 0 to Objective C type BOOL. Objective C type BOOL is unsupported." Changing it to `BOOL` fixes the bridge conversion.

## How it is applied

- Patch file: `patches/react-native-torch+1.2.0.patch`
- Script: `postinstall` runs `patch-package` automatically after `npm install` to reapply the patch.

## Developer instructions

- Installing dependencies applies the patch:
  - `npm install` (postinstall runs `patch-package`)
- If you wipe `node_modules`, simply run install again; the patch reapplies.
- To regenerate the patch after upgrading the library:
  1. Make the same edit in `node_modules/react-native-torch/ios/RCTTorch.m`.
  2. Run:

  ```zsh
  npx patch-package react-native-torch
  ```

  3. Commit the updated file under `patches/react-native-torch+<new-version>.patch`.

## Related configuration

- `package.json` includes:
  - `devDependencies`: `patch-package`
  - `scripts.postinstall`: `patch-package`

## iOS permission reminder

- Torch uses the camera flash; ensure `NSCameraUsageDescription` exists in `ios/ColdBoot/Info.plist`.
