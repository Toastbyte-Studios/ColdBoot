# App identity rename: TOAST → ColdBoot

Working guide for the `App identity` blocking item on #384. Paths and line
numbers verified against `feat/coldboot-theme-tokens` at `e01efbd`.

**Revised** from the first draft. The app is not deployed anywhere — no
production, no test track, no external installs — and that changes the correct
answer on several items. Anything below marked *free today* is free precisely
because there are no users, and becomes permanently expensive the day you first
ship. Do those now.

Already done, for context: the GitHub repo is renamed to
`Toastbyte-Studios/ColdBoot`, and #385 (icons, theme mock, dark splash) is
merged into `feat/coldboot-theme-tokens`.

---

## Merge order

Do not start this rename until #384 is merged.

```
#316 (release signing)  ─┐
#326 (enableScreens)    ─┼─→  #384 (theme tokens)  ─→  this rename
```

**#384 before the rename**, because #384 now carries 30 binary PNGs and a
storyboard under `ios/TOAST/`, and Stage 3 moves that whole directory. Git
handles "edit files, then rename the directory" cleanly. Rebasing a branch full
of binary assets across a directory rename is how you end up with PNGs stranded
at the old path that nobody notices until an icon fails to load.

**#316 and #326 before that**, because both are months stale and both collide
with this work. #316 in particular introduces the four `TOAST_RELEASE_*`
property names — merge it first and your rename sweep catches them in one pass;
merge it after and you have just added four freshly-stale names. Both will need
a rebase onto current `main` regardless.

Never do the rename and #384 as one commit. A palette change mixed with a
49-reference `.pbxproj` rename is not reviewable.

---

## Before you start: two decisions

**1. Is `applicationId` changing? Yes — do it now.**

The first draft of this doc said to default to keeping `studio.toastbyte.toast`,
because changing it after a Play listing exists is a one-way door: Google treats
it as a different app, so new listing, no upgrade path, existing installs
stranded. That reasoning does not apply to an app that has never shipped.

So the calculus inverts. Changing it costs nothing today and is irreversible
after your first release. Go to `studio.toastbyte.coldboot` and do Stage 4. Same
for `PRODUCT_BUNDLE_IDENTIFIER` on iOS in Stage 3.

**2. What is the display name exactly?** `ColdBoot` and `Cold Boot` are
different strings and both end up on a home screen. Pick one now. The component
name in Stage 1 cannot contain spaces, so if you want `Cold Boot` visible you
need `ColdBoot` as the component and `Cold Boot` as the display name, diverging
on purpose.

---

## Do not rename these

Short list. A repo-wide replace on `toast` still breaks these, and no amount of
"nothing is live" makes them safe.

| What | Where | Why |
| --- | --- | --- |
| `toast`, `toastText`, `showToast`, `toastOpacity` | `DownloadProgressChip.tsx`, 12 hits | UI toast notifications. Nothing to do with the brand. A blind replace mangles a working component. |
| `KTOAST` | `__tests__/BackupService.test.ts:141` | Ham radio call sign fixture. Becomes `KCOLDBOOT` under a naive replace. |
| `toastbyte.studio`, `support@`/`info@toastbyte.studio` | `MapScreen.tsx:120`, `RepeaterBookStore.ts:18`, `HelpModal.tsx:159` | Company domain. The company did not rebrand. |
| `Toastbyte-Studios/TOAST#235` | `constants.ts:180`, `MapSpikeScreen.tsx:6` | Historical issue references. Still resolve via GitHub's redirect. |

---

## Stage 1 — the coupled four, plus display names

These must land in the same commit. `app.json` `name` feeds
`AppRegistry.registerComponent`, which must match `getMainComponentName()` on
Android and `withModuleName` on iOS. A mismatch is a white screen at launch, not
a build error.

| File | Line | Change |
| --- | --- | --- |
| `app.json` | 2 | `"name": "TOAST"` → `"ColdBoot"` |
| `android/app/src/main/java/studio/toastbyte/toast/MainActivity.kt` | 14 | `getMainComponentName(): String = "TOAST"` → `"ColdBoot"` |
| `ios/TOAST/AppDelegate.swift` | 28 | `withModuleName: "TOAST"` → `"ColdBoot"` |

`index.js` needs no edit — it already reads `name` from `app.json`.

Then the two strings users actually see under the icon. Neither is in the #384
checklist and both are easy to miss:

| File | Change |
| --- | --- |
| `app.json` | `"displayName"` → your Decision 2 answer |
| `android/app/src/main/res/values/strings.xml` | `<string name="app_name">TOAST</string>` |
| `ios/TOAST/Info.plist` | `CFBundleDisplayName` |

Optional here, low risk: the `[TOAST]` log tags in `index.js:16` and
`src/components/ErrorBoundary.tsx:35`.

**Check:** build and launch on both platforms. Not Metro — a real launch on
each. `Application ColdBoot has not been registered` means one of the four is
still `TOAST`.

```bash
npx react-native run-android
npx react-native run-ios
```

---

## Stage 2 — package and Gradle project name

Cosmetic, no runtime coupling. Separate commit so Stage 1 stays bisectable.

- `package.json` — `"name": "toast"` → `"coldboot"`
- `package-lock.json` — same string in two places, the top-level `"name"` and
  the `""` key under `"packages"`. Do not hand-edit; change `package.json` then
  run `npm install --package-lock-only`.
- `android/settings.gradle:4` — `rootProject.name = 'TOAST'` → `'ColdBoot'`

**Check:** `npm ci && npx jest` — 942 tests should still pass.

---

## Stage 3 — iOS project, scheme and directory

Do this in Xcode, not the shell. There are 49 `TOAST` references in
`project.pbxproj` and hand-editing desynchronises the internal object graph in
ways that surface much later.

1. Open `ios/TOAST.xcworkspace`.
2. Select the project, click the target name, rename to `ColdBoot`. Accept
   Xcode's offer to rename associated items — that covers the target, scheme,
   `PRODUCT_NAME` and the group.
3. Set `PRODUCT_BUNDLE_IDENTIFIER` to match Decision 1 while you are in build
   settings.
4. Close Xcode, then move the directories:

```bash
cd ios
git mv TOAST ColdBoot
git mv TOAST.xcodeproj ColdBoot.xcodeproj
git mv TOAST.xcworkspace ColdBoot.xcworkspace
```

5. Update `ios/Podfile` — line 10 `project 'TOAST.xcodeproj'`, line 19
   `target 'TOAST' do`.
6. Confirm both scheme files moved and are named `ColdBoot.xcscheme`:
   `ColdBoot.xcodeproj/xcshareddata/xcschemes/` and
   `ColdBoot.xcworkspace/xcshareddata/xcschemes/`.
7. `cd ios && pod install`

**Two things break here.** The `AppIcon.appiconset` path moves from
`ios/TOAST/…` to `ios/ColdBoot/…` — update the `IOS_APPICON` constant in
`scripts/generate-app-icons.py` or the next run writes 15 icons into a directory
nobody reads. And `ios/TOAST/LaunchScreen.storyboard` contains the literal
string `TOAST` as visible launch text; check it after the move.

**Check:** clean build folder (`⇧⌘K`), build and launch on a simulator.

---

## Stage 4 — Android package

Per Decision 1, do this. Use Android Studio's refactor tool: right-click the
`toast` package → Refactor → Rename → Rename package. It updates the five Kotlin
files' `package` declarations, the directory tree, and the manifest together.

Then by hand:

- `android/app/build.gradle:88` — `namespace`
- `android/app/build.gradle:90` — `applicationId`
- `__mocks__/react-native-device-info.ts:9` — `getBundleId` returns
  `'com.toast'`, which is already wrong. Set it to the real ID.

The five files that move: `MainActivity.kt`, `MainApplication.kt`,
`LocationForegroundService.kt`, `LocationForegroundServiceModule.kt`,
`LocationForegroundServicePackage.kt`.

**Check:** `cd android && ./gradlew assembleRelease`, then start a trail
recording and background the app. A broken package rename shows up as a missing
native module at runtime, not at compile time.

---

## Stage 5 — persistence and wire identifiers (free today only)

None of these are safe to change once you have users. All of them are free right
now. The only data that exists is on your own emulators; wipe app data
afterwards and move on.

| What | Where | New value |
| --- | --- | --- |
| SQLite filename | `EmergencyPlanStore.ts:98`, `InventoryStore.ts:166`, `NotesStore.ts:559`, `PantryStore.ts:274` — plus doc comments in `NotesStore.ts:546`, `TrackStore.ts:36,47`, `WaypointStore.ts:18,47` | `toast.db` → `coldboot.db` |
| Share wire format | `shareUtils.ts:9-10` | `toast-rally-points` → `coldboot-rally-points`, `toast-comm-plan` → `coldboot-comm-plan` |
| Backup file prefix | `backupService.ts:30` | `toast-backup-` → `coldboot-backup-` |

#384 lists the `shareUtils` identifiers as must-not-rename because renaming
"rejects payloads from older builds." There are no older builds. The constraint
was correct in general and does not apply yet.

Do this as its own commit with a blunt message, because it is the one change
here that would be dangerous if repeated later.

**Check:** `npx jest`, then a manual round trip — create a backup and restore
it, export a rally-points share code and re-import it.

---

## Stage 6 — user-facing copy

Safe to batch. All strings a user can read.

- `src/screens/Map/MapScreen.tsx:223,234` — permission rationale, includes
  `Settings → Apps → TOAST → Permissions`
- `src/screens/Map/requestForegroundNotificationPermission.ts:20` — and the
  matching assertion in
  `__tests__/requestForegroundNotificationPermission.test.ts:99`
- `src/components/SettingsModal.tsx:227` — "not a valid TOAST backup"
- `src/screens/EmergencyPlan/RallyPointsScreen.tsx:56,185`
- `src/screens/EmergencyPlan/CommunicationPlanScreen.tsx:35,99,202`
- `src/data/health.json:3` — `"TOAST First Aid Reference"`
- `src/data/scenarioCards.json:3` — `"TOAST Scenario Cards"`
- `src/utils/backupService.ts:2`, `src/utils/unitConversions.ts:2` — doc comments
- `src/assets/images/reference/knots/CREDITS.md:4`
- `README.md`, `docs/PATCH-README.md`

**Check:** `npx jest` — the permission test asserts on copy and fails if you
change the source string without the fixture.

---

## Stage 7 — build tooling and stale URLs

None of these block a build.

- `android/app/build.gradle:6` — `buildDir` points at
  `~/Library/Caches/TOAST/android-build/`
- `scripts/android-apfs-symlinks.js:31` — same cache path; must match the above
  or the symlink script silently targets the wrong directory
- `README.md:42` — `git clone …/TOAST.git`, now redirecting
- `src/utils/fetchWithTimeout.ts:10` — comment link to issue 343
- `scripts/download-knot-images.js:78` — the `USER_AGENT`, which #384 gates on
  "only if the repo is renamed." It is. Note it currently reads
  `github.com/jason-shprintz/TOAST`, a personal or pre-transfer path, so fix the
  owner as well as the name.

### The proguard rule is already broken

`android/app/proguard-rules.pro:53` reads `-keep class com.toast.** { *; }`.
That package does not exist — the real namespace is `studio.toastbyte.toast` —
so the rule protecting your native location modules has never applied to them.

Latent rather than live: `enableProguardInReleaseBuilds = false`
(`android/app/build.gradle:68`), so nothing is being stripped today. Flip that to
`true` for a release build and the location modules get obfuscated, breaking
background trail recording in production only. Fix it to whatever Stage 4 lands
on. This is also the likely source of the phantom `com.toast` in the #384
checklist.

---

## Release signing is PR #316, not this work

An earlier draft of this doc said the `TOAST_RELEASE_*` Gradle properties did not
exist. They do not exist *in the codebase*, but they exist in **PR #316,
"Configure Android release signing for Play Store"** — open since April 2026,
unreviewed. It adds a `signingConfigs.release` block reading
`TOAST_RELEASE_STORE_FILE`, `TOAST_RELEASE_STORE_PASSWORD`,
`TOAST_RELEASE_KEY_ALIAS` and `TOAST_RELEASE_KEY_PASSWORD` from
`~/.gradle/gradle.properties`, and points `buildTypes.release` at it instead of
the debug keystore.

That is the real fix for a genuine blocker — `buildTypes.release` currently uses
`signingConfig signingConfigs.debug` (`android/app/build.gradle:117`) and Play
rejects debug-signed uploads.

Merge it before this rename so the sweep renames the four properties to
`COLDBOOT_RELEASE_*` in one pass. The keystore itself and the local
`~/.gradle/gradle.properties` entries are manual setup outside the repo; see
#316's description.

---

## Suggested commits

1. `feat(coldboot): rename app component and display name` — Stage 1
2. `chore(coldboot): rename npm and gradle project` — Stage 2
3. `chore(coldboot): rename iOS target, scheme and project` — Stage 3
4. `chore(coldboot): rename android package and application id` — Stage 4
5. `chore(coldboot)!: rename database, share format and backup prefix` — Stage 5
6. `chore(coldboot): update user-facing copy` — Stage 6
7. `fix(android): correct proguard keep rule and build cache paths` — Stage 7

Stage 3 is mostly file moves; review it with `git log --follow` or
`--find-renames` or the diff is unreadable.
