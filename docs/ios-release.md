# iOS Release Cheatsheet (TestFlight)

How to get a build of Cold Boot onto testers' phones.

- **Bundle ID:** `studio.toastbyte.coldboot`
- **Team:** Toastbyte Studios, LLC (`MG84G82W6D`)
- **Xcode workspace:** `ios/ColdBoot.xcworkspace` (open the `.xcworkspace`, never the `.xcodeproj` — CocoaPods)

---

## The release loop

1. **Commit your changes.** Tag the commit so a tester's crash report on "build 7" maps to real code.
2. **Bump the build number.** Xcode → project **ColdBoot** → **TARGETS → ColdBoot** → **General → Identity → Build**.
   Every upload needs a unique version+build pair: 1.0 (1) → 1.0 (2) → 1.0 (3). Only change **Version** when testers should see a new version number.
3. **Set the destination** to **Any iOS Device (arm64)** — the right half of the pill at the top of the Xcode window. Archive is greyed out while a simulator or a real device is selected.
4. **Product → Archive.** Builds locally. The Organizer opens when it finishes. This does _not_ upload anything.
5. **Organizer → Archives → newest entry → Distribute App → App Store Connect → Upload.**
6. **Wait for processing** (5–30 min). App Store Connect → **TestFlight → Builds → iOS**.
7. **Attach the build to tester groups** if it isn't already.

### Before uploading: test the Release build locally

```bash
npx react-native run-ios --mode Release --device
```

Debug loads JS from Metro; Release embeds the bundle. Bugs that only show up in Release are common. Quit Metro, unplug, and launch cold — exercise location (including background trail), camera, photos, contacts, mic, and the MapLibre screens.

---

## Testers

|                 | Internal                       | External                               |
| --------------- | ------------------------------ | -------------------------------------- |
| Who             | App Store Connect team members | Anyone                                 |
| Limit           | 100                            | 10,000                                 |
| Beta App Review | Never                          | First build of each version            |
| Speed           | Minutes                        | ~1 day for first build, then immediate |

**Friends & family → external**, via a **Public Link** (no need to collect emails). Internal testers must be added under **Users and Access** and can see app data in App Store Connect — that's for collaborators, not casual testers.

Keep yourself in an internal group (`TBS`) to verify builds within minutes, before they reach anyone else.

**Builds expire 90 days after upload.** Upload a new one and the clock resets. This never forces an App Store release. The only hard annual deadline is the $99 Developer Program renewal.

---

## Test Information (required before external review)

Left sidebar → **Test Information**: feedback email, and "What to Test" notes.

Spell out the background location use, e.g. _"Cold Boot records GPS trails for outdoor safety and continues recording while backgrounded, which is why Always location is requested."_ Vague background-location justifications get rejected more often than the feature itself.

---

## Gotchas hit so far

**"Team 'Jason Shprintz (Personal Team)' is not enrolled in the Apple Developer Program"**
The archive was signed with the free Personal Team. Signing is baked in at archive time, so re-archive after fixing. Target → **Signing & Capabilities** → **Team** → _Toastbyte Studios, LLC_.

**"Communication with Apple failed" / "No profiles for 'studio.toastbyte.coldboot' were found"**
The team has no registered devices, so Xcode can't generate a development profile. Plug in an unlocked iPhone and hit **Try Again**. Device lists don't carry over between teams.

**"Upload Symbols Failed — no dSYM for MapLibre/React/hermesvm"**
Harmless and normal for React Native. Those frameworks ship precompiled without debug symbols. Crash traces inside them show raw addresses; your own code still symbolicates.

**Tester shows "No Builds Available" while the group shows a build**
Usually **Missing Compliance**. Click the warning on the build and answer **No** to the export-encryption question. `ITSAppUsesNonExemptEncryption = false` in `ios/ColdBoot/Info.plist` should pre-answer this — remains accurate as long as the app only uses standard HTTPS and iOS's built-in crypto. Revisit if you ever add your own encryption (e.g. encrypting the SQLite DB).

**Xcode's distribution options were renamed**
**App Store Connect** is the one to pick. _TestFlight Internal Only_ uploads a build that can never be promoted to external testers or the App Store.

**The App Store "version page" is not TestFlight**
`.../distribution/ios/version/inflight` is for a public release and will nag about builds and Xcode Cloud branches. Ignore it; use the **TestFlight** tab.

---

## Known cleanup

- `CODE_SIGN_IDENTITY = "Apple Development"` is hardcoded in both Debug and Release in `project.pbxproj`. Release should be _Apple Distribution_. Xcode has been working around it; fix in Build Settings if an upload ever fails on signing.

## Later

**Fastlane** collapses the bump → archive → upload loop into one command, including auto-incrementing the build number. Worth setting up once uploads become frequent. **Xcode Cloud** does the same on Apple's servers.
