# Native redesign

Working notes for the effort to make ColdBoot feel like a native app rather
than a React Native app. Started because the buttons "don't feel native at
all"; the button work surfaced a lot more.

This file is a living log. Add findings as they turn up, even the ones nobody
is going to fix this quarter — the point is that they stop being rediscovered.

**State of play:** the primitives exist and are stable, 45 of 63 files are
converted, and the remaining work is listed at the bottom with a
recommendation to do it locally rather than through whole-file rewrites.

## The three primitives

Every tappable thing should be one of these. Nothing new should reach for
`TouchableOpacity` or a bare `Pressable`.

| Component    | Use for                                                             | Feedback                                       |
| ------------ | ------------------------------------------------------------------- | ---------------------------------------------- |
| `AppButton`  | An action with a text label. Save, Add item, Delete.                | Ripple (Android) / dim (iOS), platform metrics |
| `IconButton` | A bare glyph with no label. Header and toolbar chrome, row actions. | Borderless circular ripple / deeper dim        |
| `Touchable`  | Tappable regions that are not buttons. List rows, cards, chips.     | Bounded ripple / dim                           |

`Touchable` is also the escape hatch in three cases:

- The control needs a child the other two will not render. The map's record
  button pulses only its glyph, so the animation has to wrap the icon rather
  than the pressable.
- The control needs an accessibility role other than `button`. `IconButton`
  hardcodes `accessibilityRole="button"`, so the checklist checkbox and the
  RepeaterBook attribution link use `Touchable`.
- The control is a large custom circle. See finding 10.

### Rules these encode

- **Touch targets are 44pt on iOS, 48dp on Android.** `IconButton` enforces
  this regardless of glyph size; the glyph and the target are separate. When
  using `Touchable`, set the target by hand — see finding 8 for how.
- **Feedback is per-platform.** Android gets a ripple, iOS gets a dim. An
  opacity fade on both is the single clearest tell that a screen was not built
  natively.
- **Metrics are per-platform.** `AppButton` reads radius, height, padding,
  type size, weight and tracking from a `Platform.select` block. iOS gets
  44pt / 10 radius / 16-17pt semibold with negative tracking; Android gets
  48dp / pill radius / medium weight with positive tracking.
- **Label colour on a filled surface is measured, not assumed.** `onColor()`
  in `theme/colorUtils` compares contrast ratios and returns ink or white.
- **`accessibilityLabel` is required on `IconButton`.** An icon carries no
  text for a screen reader, so there is no sensible default.

### Variants

`AppButton` maps to each platform's own button vocabulary rather than to brand
roles: `filled` (iOS `.filled` / Android filled), `tinted` (`.tinted` /
tonal), `plain` (`.plain` / text button), `destructive`.

`primary`, `secondary` and `success` are kept as aliases so the sweep didn't
have to touch every call site at once. New code should use the real names.

The screen-level "Add X" buttons were a mix of `PRIMARY_DARK` and `ACCENT`
fills depending on who wrote them. The sweep standardises them all on the
accent fill — Notepad, Pantry, Inventory, EmergencyPlan.

### Colour escape hatches

Two props exist for buttons that sit on a surface the palette doesn't
describe. Reach for them rarely; a call site that needs one is often a sign
the palette is missing a token.

- `AppButton` `tint` — overrides the variant's tint while keeping the style.
- `IconButton` `disabledColor` — the disabled glyph defaults to the theme's
  muted colour, which is invisible on a tinted surface that dims as a whole.

Separately, `src/theme/fixedSurfaces.ts` exports `PAPER` and `INK` for
surfaces that must **not** follow the colour scheme. Those are not a styling
convenience — see finding 4.

## Findings

### 1. The navigator is the biggest problem — OPEN

`AppNavigator` sets `headerShown: false` on all ~95 screens, and `AppShell`
wraps the entire `Stack.Navigator` rather than sitting inside it. The header
is therefore not part of any screen; it is a fixed frame that content slides
underneath.

Consequences:

- No native nav bar, so no back button, no large titles, no automatic title.
  No screen has a title anywhere in the navigator config.
- The back gesture is hand-rolled with a `PanResponder` in `AppShell`. It uses
  `onMoveShouldSetPanResponderCapture`, so it actively steals horizontal drags
  from native-stack's own interactive pop gesture on the screens where
  `gestureEnabled` is set.
- Screen transitions animate content under a static frame rather than moving
  the whole screen.

Fixing this means restructuring how every screen is composed. It should be its
own PR and probably its own planning conversation.

### 2. `AppButton` was not actually canonical — IN PROGRESS

Its docblock called it "the canonical action button used throughout the app."
At the start of this work it was imported in 9 files. `TouchableOpacity`
appeared in 63. Most of the app's buttons were not buttons — they were
touchable views with ad-hoc padding, which is why nothing felt consistent.

See the sweep progress below.

### 3. Hand-built modals — OPEN. Nine files.

`rg -l '<Modal\b' src/` gives the real list:

- `components/` (4): `SettingsModal`, `HelpModal`, `ManageOfflineMapsModal`,
  `Footer/components/NotificationsModal`.
- Modal components in feature directories (2): `EmergencyPlan/ImportModal`,
  `EmergencyPlan/ContactPickerModal`.
- **Screens with a modal inlined into them (3)**: `RepeaterBookScreen`,
  `AddCustomRepeaterScreen`, `RadioFrequencyDetailScreen`. This category was
  not on anyone's radar — the assumption was that a modal meant a file named
  `*Modal.tsx`.

Two corrections to earlier versions of this note. The original count of five
came from grepping `components/` only. And `TutorialModal` is **not** a
`Modal` despite the name — it is an absolutely-positioned overlay, which it
has to be in order to coexist with the SVG spotlight backdrop in `AppShell`.

Meanwhile the navigator uses `presentation: 'modal'` for only three actual
routes. `SettingsModal` in particular is a grouped list pretending to be a
modal; it wants to be a screen.

### 4. Theming is inconsistently applied — OPEN. Twenty-seven candidate files.

Some files call `useTheme()`; others `import { COLORS } from '../../theme'`,
which is the light palette resolved at module load.

**Read that list as candidates, not defects.** Of the five shared components
worked through so far, only two were bugs. Three were correct to be static,
for reasons that had nothing to do with styling:

- `ErrorBoundary` — a crash screen must not depend on context it cannot
  guarantee. If the thing that threw was the theme provider or anything above
  it, a themed error boundary would throw while rendering the error and
  produce the blank close it exists to prevent. Use
  `Appearance.getColorScheme()` if it ever needs the scheme.
- `SketchCanvas` — pen and pad colours are baked into a base64 PNG on every
  save. A theme-aware canvas would produce two incompatible kinds of sketch,
  and every existing one would replay onto the wrong background. The artefact
  would outlive the scheme change, because it is in the saved data.
- `KnotStepCarousel` — the Wikimedia knot diagrams are dark line art on
  transparency. On a dark card they disappear.

The last two now pull `PAPER` and `INK` from `src/theme/fixedSurfaces.ts`
rather than importing the light palette, so the intent is legible and nobody
converts them to theme lookups by mistake. Chrome around fixed content —
borders, the carousel's indicator dots — does follow the scheme.

So the job on the remaining candidates is triage: decide whether each one is
light-locked by accident or on purpose, and either theme it or move it onto a
named fixed surface with the reason recorded.

The clusters: MorseCode (6), VoiceLog (6), Notepad (5), plus
`Reference/Shared/EntryScreen`, `ScenarioDetailScreen`, `ComingSoonScreen`,
`FlashlightScreen`. `noteListStyles.ts` is a genuine exception — a
module-scope stylesheet cannot be reactive regardless.

To find files that are actually light-locked rather than merely importing
both:

```sh
comm -23 \
  <(rg -l "^import \{[^}]*\bCOLORS\b[^}]*\} from '.*theme'" src/ | sort) \
  <(rg -l 'useTheme' src/ | sort)
```

Where a file is genuinely light-locked, the primitives must be passed static
colours explicitly rather than left to fall back to the theme, or a
theme-aware icon lands on a hardcoded light card and turns pale-on-pale.

It also leaks the other way: `AppButton` resolves its **disabled** colours
through `useTheme` internally, so a disabled button in a light-locked file
(`AlphaToMorseScreen`, the Notepad forms) paints with the dark-mode `BORDER`
colour in dark mode. That artefact was created by the sweep and disappears
when those screens move to `useTheme`.

The Map components show the pattern to copy for a real fix: a module-level
`makeStyles(colors)` factory called through `useMemo(() => makeStyles(COLORS),
[COLORS])`.

Related hardcoded-colour instances:

- `PantryExpirationTrackerScreen`'s `statusBorderColor` and
  `statusBackgroundColor` return hardcoded Material hexes, so the red/amber/
  green expiry coding is identical in both schemes.
- The same fixed amber triple (`#FFF3CD` / `#FFCA2C` / `#664D03`) is
  duplicated in `DownloadConfirmScreen`'s low-storage banner and `MapScreen`'s
  simulated-offline banner, because the palette has no warning token. It has
  `SUCCESS` and `ERROR` but nothing between them. Adding `WARNING` would
  resolve both banners and the expiry coding above.
- The map's record button used iOS system red (`#FF3B30`) while recording, a
  third red alongside `ERROR` and the expiry hexes. Now `ERROR`.
- `DownloadProgressChip`'s chip and toast, and `MapPanel`'s recording HUD, are
  fixed white on a dark scrim. Deliberate — they float over map imagery, not
  app chrome — and commented as such. The error banner in
  `DownloadProgressChip` is not: its `rgba(255,255,255,0.95)` background stays
  white in dark mode.
- `SeasonalOutlookScreen`'s risk-flag chips hardcode `'#fff'`, as does the
  footer notification badge.
- No `StatusBar` bar-style appears to be wired to the colour scheme, so dark
  mode is likely rendering dark status text on a dark background.

### 5. Status-bar clearance as fixed pixels — PARTLY FIXED

`AppShell` positioned the date, settings button and logo at hardcoded offsets
(30 / 50 / 80) tuned against a 44pt top inset. They now shift by the
difference between the device's actual inset and that baseline, so a 44pt
device is unchanged and everything else gets correct clearance.
`SafeAreaProvider` was already mounted in `App.tsx`.

`ContactPickerModal`'s header has the same problem — `paddingTop: 52` — and is
deliberately left alone. It is a React Native `Modal`, which renders in its
own window, and `useSafeAreaInsets` is unreliable inside one on Android
without a second `SafeAreaProvider` mounted inside the modal. That needs
testing on a device before changing. The other eight modals in finding 3 are
worth checking for the same pattern.

### 6. `onColor` thresholded luminance — FIXED

The first version of `onColor` picked a label colour by thresholding relative
luminance at 0.45. That gets mid-luminance tints wrong: dark mode's `SUCCESS`
(`#4CA891`) sits just under the cutoff and would have received a white label
at 2.9:1, when ink gives it 6.1:1. It now compares actual contrast ratios.
`__tests__/colorUtils.test.ts` asserts every filled tint clears 4.5:1 in both
schemes.

The original `AppButton` also put `PRIMARY_DARK` on `ACCENT` for the `primary`
variant — roughly 3:1, under the body-text floor.

### 7. Emoji and Unicode characters used as icons — PARTLY FIXED

Sixteen instances converted, all in files the sweep touched: the Map feature
(twelve), `RallyPointsScreen`, `MapScreen`, `MorseCodeCheatSheet` (two arrows
per row across 36 rows), and `AddCustomRepeaterScreen`.

The glyphs resolve from whatever font happens to cover them, so they differ
between iOS and Android and between OS versions; they do not match the
Ionicons used everywhere else; they scale with the text rather than staying a
fixed icon size; and a screen reader announces them by name — the download
toast read as "check mark button Offline map ready", and every rally point
read "round pushpin" before its coordinates.

**This finding is not a subset of the sweep.** A codepoint grep turns up
instances in files that never used `TouchableOpacity` and so were never on the
sweep list:

- `LunarCyclesScreen` — nine moon-phase emoji driving a card helper.
- `StarMapScreen` — `★`, in a style literally named `starEmoji`.
- `SkyEventsScreen` — `📍`.
- `RepeaterBookScreen` — `🚨` twice, plus `📦 Cached data` / `✅ Live data`.
- `MorseTrainerLevelScreen` — `⚠ ▶ ✓ ✗` as its whole feedback vocabulary.
- `GridReferenceScreen` — `✓` on copy.
- `BarometricPressureScreen` — `↑ → ↓` for trend states.

Finishing the sweep will not finish this. It needs its own pass.

```sh
rg -n '[\x{2190}-\x{24FF}\x{2580}-\x{2BFF}\x{FE0F}\x{1F000}-\x{1FAFF}]' -g '*.tsx' src/
```

(Box-drawing `\x{2500}-\x{257F}` is excluded on purpose — the codebase uses `─`
in comment dividers, which would bury the real hits. Arrows in JSDoc prose
will still show up, so the output needs an eyeball rather than a count.)

#### Deliberate exceptions

Two places keep their glyphs, both for the same reason: the character belongs
to a typographic **set**, and converting part of the set would break it.

- `MorseToAlphaScreen` — the `␣` and `⌫` keycaps sit in a keypad whose other
  keys show literal `.`, `-`, `/` and `CLEAR`.
- `ScenarioDetailScreen` — the `⚠` and `ℹ` bullet markers share a column with
  `•` and numbered steps, all rendered through `styles.bullet`.

Both are commented in place so they don't read as oversights.

### 8. Undersized touch targets on custom chrome — IN PROGRESS

Controls built at whatever size looked right: `WaypointBottomSheet`'s close
button (32pt bordered circle), the Notepad and Pantry header icons (~30-42pt),
`WaypointRow` and `TrackRow` action buttons (~26pt), the checklist checkbox
(bare 28pt glyph), the share/import boxes in `RallyPointsScreen` and
`CommunicationPlanScreen` (36pt), the picker fields and option rows in
`AddCustomRepeaterScreen` (~40pt and ~38pt), the RepeaterBook attribution link
(a 12pt line of text), the `ScenarioDetailScreen` and `EntryScreen` bookmark
toggles (~36pt), and `SearchScreen`'s jump pill and send button (~28pt and
30pt).

**There are three ways to resolve one, and picking the right one matters.**

1. **Grow the control.** Right when it has room — list rows, standalone
   buttons. `IconButton` does this automatically; with `Touchable` set
   `minHeight: 44`.
2. **Drop the chrome and let the primitive size it.** Right when the existing
   decoration only made sense at the smaller size. `WaypointBottomSheet`'s
   close button lost its 32pt bordered circle rather than inflating it into a
   44pt one.
3. **Leave the visual size and extend the touch area with `hitSlop`.** Right
   when the control's size is set by its container rather than by itself.
   `SearchScreen`'s send button is sized to fit inside the input row's height,
   and its jump pill sits inside a result card — growing either would push the
   surrounding layout around. Both use `hitSlop` and stay visually unchanged.

Option 1 is the default. Reach for 3 in dense layouts, and comment it, since
it is the one that looks like nothing was done.

The map FABs are the happy case: already 48pt circles, so they took
`IconButton` with no change in size.

### 9. Accessibility roles and state — IN PROGRESS

A control declares part of its accessibility contract and omits the part that
makes it meaningful.

- The checklist item checkbox had `accessibilityRole="checkbox"` with no
  `accessibilityState.checked`, so a screen reader announced every item
  identically whether ticked or not. The role made it worse than no role.
- `PantryExpirationTrackerScreen`'s filter chips and `WaypointBottomSheet`'s
  tabs had no `selected`.
- `AddCustomRepeaterScreen`'s picker option rows had neither role nor state —
  eight unlabelled rows in the Mode list with no indication of the active one.
- `SeasonalOutlookScreen`'s month cards had no `expanded`. The label said
  "collapse" or "expand", so the information was there in prose but not in a
  form a screen reader could act on.
- `ScenarioDetailScreen` and `EntryScreen`'s bookmark toggles had no
  `accessibilityLabel` at all, on controls whose entire meaning is their
  state. Of the three bookmark toggles in the app, two were unlabelled —
  icon-only toggles are where this defect concentrates, presumably because
  whoever wrote them could see what the icon meant.
- `FormPickerButton` had no label, so the inventory month and year pickers
  announced their current value with no indication they were tappable.

All fixed. The primitives cannot catch this — `Touchable` passes accessibility
props straight through — so it needs checking by hand on every stateful
control.

### 10. `IconButton` cannot do large circles — OPEN

`IconButton` pins its borderless ripple radius to `TARGET / 2`, i.e. 22 or
24pt. On a large circular button that draws a small ripple adrift in the
middle. Two call sites fall back to `Touchable` for this reason: `MapPanel`'s
record FAB and `RecordingControls`' 120pt record button. Both are commented.

The fix is either an optional `rippleRadius` prop or deriving the radius from
a width in the resolved style. Not done — `IconButton` has already gained two
props during this work and it is worth deciding whether it is accumulating too
many knobs before adding a third.

## Open decisions

### Native menus — needs a dependency call

Instances found so far:

- `NoteSortSelector` cycles through four sort orders on tap. You cannot see
  the options, and reaching Z-A takes three taps.
- `NewNoteScreen` and `EditNoteScreen` each contain a hand-rolled dropdown — a
  touchable header plus an absolutely-positioned menu.
- `AddCustomRepeaterScreen` has two: a touchable field plus a transparent
  `Modal` holding a list of options.
- `FormPickerButton` backs the inventory month and year pickers — two more.

React Native ships `ActionSheetIOS` and nothing equivalent for Android, so:

1. Add `@react-native-menu/menu` — wraps `UIMenu` and Android's `PopupMenu`.
   Real native menus, but a native module, so pod install and Gradle sync.
2. `ActionSheetIOS` plus a hand-built Android popup — no new dependency, but
   it means writing exactly the kind of custom component this effort is trying
   to delete.

`NoteSortSelector`, `NewNoteScreen` and `EditNoteScreen` are held back from
the sweep until this is settled, because converting only their icon buttons
would leave a half-migrated diff. `AddCustomRepeaterScreen` and
`FormPickerButton` were converted, because their pickers were the whole of
those files' `TouchableOpacity` usage rather than half of it, and the modal is
untouched either way.

### Segmented controls — a second, smaller dependency call

Segmented controls in all but name: the Current Location / Manual Entry toggle
in `AddWaypointForm`, the Waypoints / Tracks tabs in `WaypointBottomSheet`,
the category filter chips in `PantryExpirationTrackerScreen`.

They are `Touchable` with `accessibilityState.selected` for now, which fixes
the press feedback and the screen-reader announcement but leaves them looking
hand-built. `@react-native-segmented-control/segmented-control` wraps the real
`UISegmentedControl`. Same trade-off as menus, lower stakes.

## Sweep progress

45 of 63 files converted.

- [x] `components/AppShell.tsx`
- [x] `screens/Notepad` — 4 of 6 (`NewNoteScreen`, `EditNoteScreen` held)
- [x] `screens/Pantry` — 5 of 5
- [x] `screens/Inventory` — 4 of 4
- [x] `screens/Map` — 9 of 9
- [x] `screens/Checklist` — 2 of 2
- [x] `screens/EmergencyPlan` — 6 of 6
- [x] `screens/MorseCode` — 4 of 4
- [x] `screens/VoiceLog` — 3 of 3
- [x] `screens/ScenarioCards` — 2 of 2
- [x] `screens/Shared/Prepper/FormPickerButton.tsx`
- [x] `screens/Reference/Shared/EntryScreen.tsx`
- [x] `screens/Common/SearchScreen.tsx`
- [x] `screens/SeasonalOutlook/SeasonalOutlookScreen.tsx`
- [ ] `screens/RepeaterBook/RepeaterBookScreen.tsx`
- [ ] `screens/` singles — `BarometricPressure`, `DepletionCalculator`,
      `GridReference`, `RadioFrequencies`, `UnitConversion/ConversionCategory`
- [ ] `components/` — `Footer`, `NotificationsModal`, `HelpModal`,
      `ManageOfflineMapsModal`, `NoteSortSelector`, `SectionHeader`,
      `SettingsModal`, `TutorialModal`
- [ ] `modules/Reference/ReferenceModule.tsx`

Separately, the five shared `components/` files from finding 4 are done: two
themed (`HorizontalRule`, `SectionSubHeader`), one documented exception
(`ErrorBoundary`), two rehoused onto `fixedSurfaces` (`SketchCanvas`,
`KnotStepCarousel`). Those are theming fixes, so they are not in the count
above.

Run `npm run cleanup` before pushing. The sweep removes local button styles as
it goes, and `react-native/no-unused-styles` will catch any left behind.

## Finishing this locally

The remaining eighteen files are better done in an editor than through the
GitHub contents API, which has no patch operation — every change means
reproducing the whole file, and the odds of silently dropping a line stop
being negligible somewhere around 15KB. `SettingsModal` is 32KB,
`RepeaterBookScreen` 23KB, and the remaining singles run 15-20KB each.

The transformation itself is mechanical at this point:

1. `TouchableOpacity` → `Touchable`, or `IconButton` for a bare glyph, or
   `AppButton` for anything with a text label.
2. Give it a 44pt target by one of the three routes in finding 8.
3. Check `accessibilityRole`, `accessibilityLabel` and `accessibilityState`
   on anything with a toggled or selected state — finding 9.
4. Delete the local button styles the primitive now owns, and run
   `npm run cleanup`.

Suggested order for what is left:

1. The five remaining singles and `ReferenceModule` — same shape as
   everything done so far.
2. The emoji pass from finding 7, which is independent of the sweep and
   reaches files the sweep never touches.
3. Triage the finding 4 candidate list — theme it, or move it onto a named
   fixed surface with the reason recorded.
4. The `components/` group. Four of the eight are modals, so this overlaps
   finding 3 and may be worth doing as part of it rather than before it.
5. Findings 1 and 3, each as its own piece of work.
