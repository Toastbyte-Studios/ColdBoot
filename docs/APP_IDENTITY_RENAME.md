# App identity rename: TOAST → ColdBoot

Working guide for the `App identity` blocking item from #384.

**Status: Stages 1, 2, 4, 5, 6 and 7 are done on `chore/name-change-v2`.
Stage 3 (iOS) is the only rename stage left**, plus the two follow-ups. Paths
below were re-verified against that branch at `41f2665` (2026-09-09).

The app is not deployed anywhere — no production, no test track, no external
installs. Anything marked _free today_ was free precisely because there are no
users, and becomes permanently expensive the day you first ship. Stage 5 is
already spent; everything still open is either identity-neutral or iOS-only.

---

## Where things stand

| Stage                                | Status   | Commit                              |
| ------------------------------------ | -------- | ----------------------------------- |
| 1 — coupled four + display names     | done     | `511626c`, `a3456eb`                |
| 2 — npm and Gradle project name      | done     | `0dbda52` (gradle), `111c426` (npm) |
| 3 — iOS project, scheme, directory   | **open** | —                                   |
| 4 — Android package and appId        | done     | `4933e21`                           |
| 5 — persistence and wire identifiers | done     | `f8e86a6` (breaking)                |
| 6 — user-facing copy                 | done     | `70cb67b`                           |
| 7 — build tooling and stale URLs     | done     | `41f2665` (+ proguard in `4933e21`) |
| Follow-up 1 — release signing        | **open** | —                                   |
| Follow-up 2 — `enableScreens()`      | **open** | —                                   |

`44f43d9` is not part of the rename: it is a lockfile refresh split out of
Stage 2 so the name change stayed a two-line diff.

Never mix the rename with a palette or behaviour change in one commit. A
49-reference `.pbxproj` rename is only reviewable on its own.

---

## The two decisions (settled)

**1. `applicationId` changed.** The first draft said to keep
`studio.toastbyte.toast`, because changing it after a Play listing exists is a
one-way door: Google treats it as a different app, so new listing, no upgrade
path, existing installs stranded. That did not apply to an app that had never
shipped, so the calculus inverted. Landed as `studio.toastbyte.coldboot` in
Stage 4. **`PRODUCT_BUNDLE_IDENTIFIER` on iOS must match it** — that is still
open, in Stage 3.

**2. Display name is `Cold Boot`, two words.** `ColdBoot` and `Cold Boot` are
different strings and both end up on a home screen. The component name cannot
contain a space, so this is a deliberate divergence:

- `ColdBoot` — component name (`app.json` `name`, `getMainComponentName`,
  `withModuleName`), and non-user-visible identifiers: product tokens in
  User-Agents, code comments, internal metadata.
- `Cold Boot` — every user-visible string (`displayName`, `app_name`,
  `CFBundleDisplayName`, and all in-app copy).

---

## Do not rename these

Short list. A repo-wide replace on `toast` still breaks these, and no amount of
"nothing is live" makes them safe.

| What                                                   | Where                                                               | Why                                                                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `toast`, `toastText`, `showToast`, `toastOpacity`      | `DownloadProgressChip.tsx`, 12 hits                                 | UI toast notifications. Nothing to do with the brand. A blind replace mangles a working component.       |
| `KTOAST`                                               | `__tests__/BackupService.test.ts:141`                               | Ham radio call sign fixture. Becomes `KCOLDBOOT` under a naive replace.                                  |
| `toastbyte.studio`, `support@`/`info@toastbyte.studio` | `MapScreen.tsx:120`, `RepeaterBookStore.ts:18`, `HelpModal.tsx:159` | Company domain. The company did not rebrand. Both User-Agent lines are _half_ keep — see Stage 7 record. |
| `Toastbyte-Studios/TOAST#235`                          | `constants.ts:180`, `MapSpikeScreen.tsx:6`                          | Historical issue references. Still resolve via GitHub's redirect.                                        |

---

## Still open

### Stage 3 — iOS project, scheme and directory

The only rename stage still open, and the one that cannot be scripted.

Do this in Xcode, not the shell. There are 49 `TOAST` references in
`project.pbxproj` and hand-editing desynchronises the internal object graph in
ways that surface much later.

1. Open `ios/TOAST.xcworkspace`.
2. Select the project, click the target name, rename to `ColdBoot`. Accept
   Xcode's offer to rename associated items — that covers the target, scheme,
   `PRODUCT_NAME` and the group.
3. Set `PRODUCT_BUNDLE_IDENTIFIER` to `studio.toastbyte.coldboot`, matching what
   Stage 4 landed on Android.
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

**Check:** clean build folder (`⇧⌘K`), build and launch on a simulator.

#### Stage 3 also owns these, deferred from other stages

Four items were deliberately left behind because they name iOS paths that are
**correct until Stage 3 runs** — changing them earlier would have documented
paths that do not exist:

| File                                   | What                                                                                                                               |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `ios/TOAST/LaunchScreen.storyboard:19` | `text="TOAST"` — visible launch text. User-facing copy, so it takes `Cold Boot`. Deferred from Stage 6.                            |
| `scripts/generate-app-icons.py:50`     | `IOS_APPICON` points at `ios/TOAST/Images.xcassets/...`. Miss this and the next run writes 15 icons into a directory nobody reads. |
| `README.md:75`, `README.md:113-123`    | `--scheme TOAST`, `ios/TOAST.xcodeproj`, and the `TOAST.xcscheme` recovery snippet. Deferred from Stages 6/7.                      |
| `docs/PATCH-README.md:174`             | references `ios/TOAST/Info.plist`.                                                                                                 |

`ios/TOAST/Info.plist` itself is already done — `CFBundleDisplayName` is
`Cold Boot` and the permission prompt strings were fixed in `a3456eb`. Only the
file's _path_ changes in Stage 3.

---

### Follow-up 1 — release signing (was #316, now unwritten)

**This is the one item on the critical path to shipping.** Verified still
present at `41f2665`.

PR #316 was closed unmerged rather than rebased, so the `TOAST_RELEASE_*`
properties it defined exist nowhere. The blocker it addressed is real and
untouched by the rename: `android/app/build.gradle:117` has

```groovy
release {
    signingConfig signingConfigs.debug
```

and Play rejects debug-signed uploads.

The rewrite adds a `signingConfigs.release` block reading
`COLDBOOT_RELEASE_STORE_FILE`, `COLDBOOT_RELEASE_STORE_PASSWORD`,
`COLDBOOT_RELEASE_KEY_ALIAS` and `COLDBOOT_RELEASE_KEY_PASSWORD` from
`~/.gradle/gradle.properties`, and points `buildTypes.release` at it instead of
the debug keystore. **ColdBoot names from the first commit** — no sweep is
coming to rename them. The keystore itself and the local
`~/.gradle/gradle.properties` entries are manual setup outside the repo.

#### Related: proguard is now correct but unexercised

`android/app/proguard-rules.pro:53` used to read `-keep class com.toast.**`, a
package that never existed, so the rule protecting the native location modules
had never applied to them. Fixed to `studio.toastbyte.coldboot.**` in `4933e21`.

It is still latent: `enableProguardInReleaseBuilds = false`
(`android/app/build.gradle:68`), so nothing is being stripped. **The first time
that flips to `true`, test background trail recording specifically** — that is
the failure mode the rule guards against, and it appears in release builds only.

---

### Follow-up 2 — enableScreens (was #326, now unwritten)

Closed unmerged alongside #316. Verified still outstanding at `41f2665`:
`react-native-screens` is a dependency (`package.json:46`, `^4.18.0`) but
`enableScreens()` is called nowhere, so Android screen transitions still run
without it.

Identity-neutral — it touches no `TOAST` string and collides with nothing — so
redo it whenever.

---

### Housekeeping (outside the playbook)

Neither blocks anything; both keep showing up in greps.

- `~/Library/Caches/TOAST/` is orphaned, ~3.3 GB, since Stage 7 moved the build
  cache to `~/Library/Caches/ColdBoot/`. Safe to delete.
- `assets/coldboot-assets/theme/colors.ts` still defines `TOAST_BROWN` and
  `TOAST_BROWN_GRADIENT`. It is dead: only the `png/` subdirectory of that
  bundle is imported (`LogoHeader.tsx:15-16`), and the live `src/theme/` is
  already clean. Delete the file or rename the tokens.

---

## Completed

Condensed record. Each stage's full reasoning is in its commit message.

### Stage 1 — the coupled four, plus display names — `511626c`, `a3456eb`

`app.json` `name`, `MainActivity.kt` `getMainComponentName()` and
`AppDelegate.swift` `withModuleName` all → `ColdBoot`; these must match or
launch is a white screen, not a build error. Display names → `Cold Boot` in
`app.json` `displayName`, `strings.xml` `app_name`, `Info.plist`
`CFBundleDisplayName` and the device-info mock's `getApplicationName`. Plus the
`[TOAST]` log tags in `index.js` and `ErrorBoundary.tsx`. `a3456eb` followed up
with the iOS permission prompt strings in `Info.plist`.

### Stage 2 — npm and Gradle project name — `0dbda52`, `111c426`

`android/settings.gradle:4` `rootProject.name` → `'ColdBoot'`. `package.json`
`name` → `"coldboot"`, with the lock regenerated via
`npm install --package-lock-only` rather than hand-edited. The unrelated
dependency bumps sitting in the working tree were split into `44f43d9` first, so
the rename diff is exactly the two documented name fields.

### Stage 4 — Android package and applicationId — `4933e21`

`studio.toastbyte.toast` → `studio.toastbyte.coldboot`: five Kotlin sources
moved to `studio/toastbyte/coldboot/` with their `package` declarations,
`build.gradle` `namespace` and `applicationId`, and the device-info mock's
`getBundleId` (which had returned `'com.toast'`, a package that never existed).

`AndroidManifest.xml` needed no edit — it names `.MainApplication`,
`.MainActivity` and `.LocationForegroundService` relative to the namespace.

> **Gotcha for anyone pulling this branch.** The first build after the rename
> fails with `package studio.toastbyte.toast does not exist`, from generated
> autolinking code. The cause is a stale cached
> `android/build/generated/autolinking/autolinking.json` pinning the old
> package. Delete that directory and rebuild. It is not a bad rename.

### Stage 5 — persistence and wire identifiers — `f8e86a6` (breaking)

`toast.db` → `coldboot.db` (four `openDatabase` sites plus doc comments),
share wire format → `coldboot-rally-points` / `coldboot-comm-plan`, backup
prefix → `coldboot-backup-`. No migration, by design: old databases are
orphaned, so wipe app data.

The comment above the share identifiers claimed they must not change without a
VERSION bump and a migration. That was correct in general but assumed older
payloads exist, which they did not. It has been rewritten to say so, and to
reinstate the constraint now that shipping makes it real. **Do not repeat this
stage once there are users.**

### Stage 6 — user-facing copy — `70cb67b`

Permission rationale, invalid-backup and invalid-share alerts, import-modal
hints → `Cold Boot`. Doc comments, knots `CREDITS.md`, and the `metadata.name`
of `health.json` / `scenarioCards.json` → `ColdBoot`. Those two names are not
rendered anywhere today (only `metadata.disclaimer` is read), so the one-word
form there is a judgement call, not a requirement.

### Stage 7 — build tooling and stale URLs — `41f2665`

Build cache `~/Library/Caches/TOAST/` → `Caches/ColdBoot/` in
`android/app/build.gradle:6` and `scripts/android-apfs-symlinks.js`, which must
agree or the symlink script silently targets a directory Gradle never reads.
User-Agent product tokens renamed with their contacts preserved. Stale repo URLs
in `fetchWithTimeout.ts:10` and `README.md:42-43`.

Note `preandroid` in `package.json` runs the symlink script, so **`npm run
android` is the correct command**; `npx react-native run-android` skips that
hook.

---

## Corrections to this document

Found while executing. The stage lists above were accurate but undercounted in
four places, each of which would have left a live `TOAST` behind:

1. **`scripts/android-apfs-symlinks.js` has three occurrences** of the cache
   path — lines 9, 31 and 102 — not just the `apfsBase` on 31. The other two are
   a doc comment and a log string that quote it.
2. **`MapScreen.tsx:204`** is the iOS `Settings → Privacy → Location Services`
   counterpart to the Android string on 223. Same dialog, listed nowhere.
3. **`__tests__/requestForegroundNotificationPermission.test.ts:107`** asserts
   on the _second_ permission string as well as the one on 99. Both fixtures
   move with the source.
4. **`MapScreen.tsx:120`**, the Nominatim User-Agent
   (`'TOAST Survival App (toastbyte.studio, ...)'`), appeared in **no stage**.
   The do-not-rename table lists that line for its domain, which reads as "skip
   the line entirely" — the same trap the table already flags for
   `RepeaterBookStore.ts:18`. It is the same shape and was treated the same way:
   product token renamed, contacts kept.

Also worth recording: **`README.md` and `docs/PATCH-README.md` are listed under
Stage 6, but contribute nothing to it.** Every `TOAST` occurrence in them is an
iOS path owned by Stage 3 or a clone URL owned by Stage 7.
