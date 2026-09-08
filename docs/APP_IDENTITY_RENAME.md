# App identity rename: TOAST → ColdBoot

Working guide for the `App identity` blocking item from #384. Paths and line
numbers verified against `main` at `7f7e96a` (2026-09-08).

**Revised** from the first draft. The app is not deployed anywhere — no
production, no test track, no external installs — and that changes the correct
answer on several items. Anything below marked _free today_ is free precisely
because there are no users, and becomes permanently expensive the day you first
ship. Do those now.

Already done, for context: the GitHub repo is renamed to
`Toastbyte-Studios/ColdBoot`, and both #385 (icons, theme mock, dark splash) and
#384 (theme tokens) are merged to `main`.

---

## Starting point

Everything this rename was waiting on has landed. Branch off current `main` and
go.

```
#385 (branding)  ─→  #384 (theme tokens)  ─→  this rename  ─→  signing / enableScreens, rewritten
```

**#384 first** mattered because it carries 30 binary PNGs and a storyboard under
`ios/TOAST/`, and Stage 3 moves that whole directory. Git handles "edit files,
then rename the directory" cleanly; rebasing a branch full of binary assets
across a directory rename is how you end up with PNGs stranded at the old path
that nobody notices until an icon fails to load. It merged on 2026-09-08, so
that ordering constraint is satisfied.

**#316 (release signing) and #326 (enableScreens) are closed unmerged** as of
2026-09-08 — deliberately. Both were months stale, and rebasing them across this
rename buys nothing over rewriting them. An earlier draft of this doc had them
merging first so the rename sweep would catch their identifiers in one pass;
that is no longer the plan. Nothing in those branches will be swept, so whatever
replaces them must use ColdBoot names from its first commit. Both are picked up
in the two follow-up sections at the end of this doc.

Never mix the rename with a palette or behaviour change in one commit. A
49-reference `.pbxproj` rename is only reviewable on its own.

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

**2. What is the display name exactly? Decided: `Cold Boot`, two words.**

`ColdBoot` and `Cold Boot` are different strings and both end up on a home
screen. The component name in Stage 1 cannot contain spaces, so this is a
deliberate divergence: `ColdBoot` is the component name (`app.json` `name`,
`getMainComponentName`, `withModuleName`), `Cold Boot` is every user-visible
string (`displayName`, `app_name`, `CFBundleDisplayName`). Keep them straight —
they are not interchangeable, and the coupled four below must all read
`ColdBoot`.

---

## Do not rename these

Short list. A repo-wide replace on `toast` still breaks these, and no amount of
"nothing is live" makes them safe.

| What                                                   | Where                                                               | Why                                                                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `toast`, `toastText`, `showToast`, `toastOpacity`      | `DownloadProgressChip.tsx`, 12 hits                                 | UI toast notifications. Nothing to do with the brand. A blind replace mangles a working component.        |
| `KTOAST`                                               | `__tests__/BackupService.test.ts:141`                               | Ham radio call sign fixture. Becomes `KCOLDBOOT` under a naive replace.                                   |
| `toastbyte.studio`, `support@`/`info@toastbyte.studio` | `MapScreen.tsx:120`, `RepeaterBookStore.ts:18`, `HelpModal.tsx:159` | Company domain. The company did not rebrand. Note `RepeaterBookStore.ts:18` is _half_ keep — see Stage 7. |
| `Toastbyte-Studios/TOAST#235`                          | `constants.ts:180`, `MapSpikeScreen.tsx:6`                          | Historical issue references. Still resolve via GitHub's redirect.                                         |

---

## Stage 1 — the coupled four, plus display names

These must land in the same commit. `app.json` `name` feeds
`AppRegistry.registerComponent`, which must match `getMainComponentName()` on
Android and `withModuleName` on iOS. A mismatch is a white screen at launch, not
a build error.

| File                                                               | Line | Change                                                    |
| ------------------------------------------------------------------ | ---- | --------------------------------------------------------- |
| `app.json`                                                         | 2    | `"name": "TOAST"` → `"ColdBoot"`                          |
| `android/app/src/main/java/studio/toastbyte/toast/MainActivity.kt` | 14   | `getMainComponentName(): String = "TOAST"` → `"ColdBoot"` |
| `ios/TOAST/AppDelegate.swift`                                      | 28   | `withModuleName: "TOAST"` → `"ColdBoot"`                  |

`index.js` needs no edit — it already reads `name` from `app.json`.

Then the two strings users actually see under the icon. Neither is in the #384
checklist and both are easy to miss:

| File                                          | Change                                   |
| --------------------------------------------- | ---------------------------------------- |
| `app.json`                                    | `"displayName"` → your Decision 2 answer |
| `android/app/src/main/res/values/strings.xml` | `<string name="app_name">TOAST</string>` |
| `ios/TOAST/Info.plist`                        | `CFBundleDisplayName`                    |

Also `__mocks__/react-native-device-info.ts:8` — `getApplicationName` returns
`'TOAST'`. Nothing asserts on it today, which is exactly why it rots quietly.
It mocks the display name, so it takes the spaced form.

Optional here, low risk: the `[TOAST]` log tags in `index.js:15` and
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

| What               | Where                                                                                                                                                                                      | New value                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| SQLite filename    | `EmergencyPlanStore.ts:98`, `InventoryStore.ts:166`, `NotesStore.ts:559`, `PantryStore.ts:274` — plus doc comments in `NotesStore.ts:546`, `TrackStore.ts:36,47`, `WaypointStore.ts:18,47` | `toast.db` → `coldboot.db`                                                               |
| Share wire format  | `shareUtils.ts:9-10`                                                                                                                                                                       | `toast-rally-points` → `coldboot-rally-points`, `toast-comm-plan` → `coldboot-comm-plan` |
| Backup file prefix | `backupService.ts:30`                                                                                                                                                                      | `toast-backup-` → `coldboot-backup-`                                                     |

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
- `src/stores/RepeaterBookStore.ts:18` — the RepeaterBook `User-Agent`, currently
  `TOAST/1.0 (+https://toastbyte.studio; support@toastbyte.studio)`. Rename the
  `TOAST/1.0` product token only; the two `toastbyte.studio` contacts on the same
  line stay, per the do-not-rename table. This line appears in that table, so it
  is easy to skip the whole thing — don't. `__tests__/RepeaterBookStore.test.ts:342`
  asserts the header contains `TOAST` and fails until you update it too.

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

## Follow-up 1 — release signing (was #316, now unwritten)

An earlier draft of this doc said the `TOAST_RELEASE_*` Gradle properties did not
exist. They do not exist in the codebase, and as of 2026-09-08 they do not exist
anywhere: they lived only in **PR #316, "Configure Android release signing for
Play Store"**, which was closed unmerged rather than rebased.

The blocker it addressed is real and still present. `buildTypes.release` uses
`signingConfig signingConfigs.debug` (`android/app/build.gradle:117`), and Play
rejects debug-signed uploads. Nothing in this rename touches that line.

So it is follow-up work, not rename work — and there is a small upside to the
ordering flip: write it once, correctly. The rewrite adds a
`signingConfigs.release` block reading `COLDBOOT_RELEASE_STORE_FILE`,
`COLDBOOT_RELEASE_STORE_PASSWORD`, `COLDBOOT_RELEASE_KEY_ALIAS` and
`COLDBOOT_RELEASE_KEY_PASSWORD` from `~/.gradle/gradle.properties`, and points
`buildTypes.release` at it instead of the debug keystore. ColdBoot names from the
first commit; no sweep is coming to rename them. The keystore itself and the
local `~/.gradle/gradle.properties` entries are manual setup outside the repo.

## Follow-up 2 — enableScreens (was #326, now unwritten)

Closed unmerged alongside #316. `react-native-screens` is already a dependency
(`package.json:46`), but `enableScreens()` is called nowhere, so Android screen
transitions still run without it.

Identity-neutral — it touches no `TOAST` string and collides with nothing in
Stages 1-7 — so redo it whenever, before or after the rename. It is listed here
only so closing #326 does not lose the thread.

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
