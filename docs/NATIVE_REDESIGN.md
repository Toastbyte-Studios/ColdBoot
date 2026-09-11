# Native redesign

Working notes for the effort to make ColdBoot feel like a native app rather
than a React Native app. Started because the buttons "don't feel native at
all"; the button work surfaced a lot more.

This file is a living log. Add findings as they turn up, even the ones nobody
is going to fix this quarter — the point is that they stop being rediscovered.

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
  using `Touchable` for a small control, set the target by hand.
- **Feedback is per-platform.** Android gets a ripple, iOS gets a dim. An
  opacity fade on both is the single clearest tell that a screen was not built
  natively.
- **Metrics are per-platform.** `AppButton` reads radius, height, padding,
  type size, weight and tracking from a `Platform.select` block. iOS gets
  44pt / 10 radius / 16-17pt semibold with negative tracking; Android gets
  48dp / pill radius / medium weight with positive tracking.
- **Label color on a filled surface is measured, not assumed.** `onColor()`
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

### 4. Theming is inconsistently applied — OPEN. Twenty-seven files.

Some screens call `useTheme()`; others `import { COLORS } from '../../theme'`,
which is the light palette resolved at module load. Those files render the
light scheme in both modes and do not respond to the dark-mode setting at all.

The clusters: MorseCode (6), VoiceLog (6), Notepad (5), plus
`Reference/Shared/EntryScreen`, `ScenarioDetailScreen`, `ComingSoonScreen`,
`FlashlightScreen`.

**The five in `components/` matter most**: `HorizontalRule`,
`SectionSubHeader`, `ErrorBoundary`, `KnotStepCarousel`, `SketchCanvas`. These
are shared, so they are light-locked on every screen that renders them —
including screens this sweep has already converted and signed off as clean.
`HorizontalRule` is in `AppShell`, so it is on essentially every screen.

`noteListStyles.ts` is a genuine exception: a module-scope stylesheet cannot
be reactive regardless.

To find the files that are actually broken rather than the ones that merely
import both:

```sh
comm -23 \
  <(rg -l "^import \{[^}]*\bCOLORS\b[^}]*\} from '.*theme'" src/ | sort) \
  <(rg -l 'useTheme' src/ | sort)
```

This constrains the sweep: in an affected file, the new components must be
passed static colours explicitly rather than falling back to the theme,
because a theme-aware icon on a hardcoded light card turns pale-on-pale and
disappears in dark mode.

It also leaks the other way. `AppButton` resolves its **disabled** colours
through `useTheme` internally, so a disabled button in a light-locked file
(`AlphaToMorseScreen`, the Notepad forms) paints with the dark-mode `BORDER`
colour in dark mode. That artifact is created by the sweep and disappears when
those screens move to `useTheme`.

The Map components show the pattern to copy: a module-level
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
  fixed white on a dark scrim. Those are deliberate — they float over map
  imagery, not app chrome — and are commented as such. The error banner in
  `DownloadProgressChip` is not: its `rgba(255,255,255,0.95)` background stays
  white in dark mode.
- The footer notification badge hardcodes `'#fff'`.
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

Sixteen instances converted so far, all within files the sweep touched: the
Map feature (twelve), `RallyPointsScreen`, `MapScreen`, `MorseCodeCheatSheet`
(two arrows per row across 36 rows), and `AddCustomRepeaterScreen`.

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

Controls built at whatever size looked right, found so far:
`WaypointBottomSheet`'s close button (32pt bordered circle), the Notepad and
Pantry header icons (~30-42pt), `WaypointRow` and `TrackRow` action buttons
(~26pt), the checklist checkbox (bare 28pt glyph), the share/import boxes in
`RallyPointsScreen` and `CommunicationPlanScreen` (36pt), the picker fields
and option rows in `AddCustomRepeaterScreen` (~40pt and ~38pt), the
RepeaterBook attribution link (a 12pt line of text), and the
`ScenarioDetailScreen` bookmark toggle (~36pt).

Moving these onto the primitives fixes the target but changes the look,
because the primitives will not render below 44/48. The bottom sheet's close
button lost its bordered circle rather than growing into a 44pt one; the
share/import boxes grew instead. Expect a small amount of this in every batch;
it is the point rather than a side effect, but it does mean the diffs are not
purely mechanical.

The map FABs are the happy case: already 48pt circles, so they took
`IconButton` with no change in size.

### 9. Accessibility roles and state — IN PROGRESS

A recurring pattern: a control declares part of its accessibility contract and
omits the part that makes it meaningful.

- The checklist item checkbox had `accessibilityRole="checkbox"` with no
  `accessibilityState.checked`, so a screen reader announced every item
  identically whether ticked or not. The role made it worse than no role.
- `PantryExpirationTrackerScreen`'s filter chips and `WaypointBottomSheet`'s
  tabs had no `selected`.
- `AddCustomRepeaterScreen`'s picker option rows had neither role nor state —
  eight unlabelled rows in the Mode list with no indication of the active one.
- `ScenarioDetailScreen`'s bookmark toggle had no `accessibilityLabel` at all,
  on a control whose entire meaning is its state.

All fixed. The primitives cannot catch this — `Touchable` passes accessibility
props straight through — so it needs checking by hand on every stateful
control the sweep touches.

### 10. `IconButton` cannot do large circles — OPEN

`IconButton` pins its borderless ripple radius to `TARGET / 2`, i.e. 22 or
24pt. On a large circular button that draws a small ripple adrift in the
middle. Two call sites have had to fall back to `Touchable` for this reason:
`MapPanel`'s record FAB and `RecordingControls`' 120pt record button. Both are
commented.

Two instances is enough to call it a gap rather than a coincidence. The fix is
either an optional `rippleRadius` prop or deriving the radius from a width in
the resolved style. Not done yet — `IconButton` has already gained two props
during this work and it is worth deciding whether it is accumulating too many
knobs before adding a third.

## Open decisions

### Native menus — needs a dependency call

Instances found so far:

- `NoteSortSelector` cycles through four sort orders on tap. You cannot see
  the options, and reaching Z-A takes three taps.
- `NewNoteScreen` and `EditNoteScreen` each contain a hand-rolled dropdown — a
  touchable header plus an absolutely-positioned menu.
- `AddCustomRepeaterScreen` has two: a touchable field plus a transparent
  `Modal` holding a list of options.

React Native ships `ActionSheetIOS` and nothing equivalent for Android, so:

1. Add `@react-native-menu/menu` — wraps `UIMenu` and Android's `PopupMenu`.
   Real native menus, but a native module, so pod install and Gradle sync.
2. `ActionSheetIOS` plus a hand-built Android popup — no new dependency, but
   it means writing exactly the kind of custom component this effort is trying
   to delete.

`NoteSortSelector`, `NewNoteScreen` and `EditNoteScreen` are held back from
the sweep until this is settled, because converting only their icon buttons
would leave a half-migrated diff. `AddCustomRepeaterScreen` was converted,
because its pickers were the file's only `TouchableOpacity` usage — so
converting them is the whole file rather than half of it, and the modal is
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

42 of 63 files converted.

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
- [ ] `screens/RepeaterBook` — 2 of 3 (`RepeaterBookScreen` remains)
- [ ] `components/` — `Footer`, `NotificationsModal`, `HelpModal`,
      `ManageOfflineMapsModal`, `NoteSortSelector`, `SectionHeader`,
      `SettingsModal`, `TutorialModal`
- [ ] `screens/` singles — `BarometricPressure`, `Common/SearchScreen`,
      `DepletionCalculator`, `GridReference`, `RadioFrequencies`,
      `Reference/Shared/EntryScreen`, `SeasonalOutlook`,
      `Shared/Prepper/FormPickerButton`, `UnitConversion/ConversionCategory`
- [ ] `modules/Reference/ReferenceModule.tsx`

Run `npm run cleanup` before pushing. The sweep removes local button styles as
it goes, and `react-native/no-unused-styles` will catch any left behind.

### A note on the two large files

`RepeaterBookScreen` (23KB) and `SettingsModal` (32KB) are better done in a
local editor than through whole-file rewrites. The rest of this sweep was
driven through the GitHub contents API, which has no patch operation — every
change means reproducing the entire file, and at that size the odds of
silently dropping a line stop being negligible. Everything under ~10KB was
safe; those two are not.

### Suggested order for the rest

1. The five shared `components/` files in finding 4. Small diff, app-wide
   reach, and it unblocks the dark-mode claim for screens already converted.
2. The nine single screens — same shape as everything done so far.
3. The emoji pass from finding 7, which is independent of the sweep.
4. The two large files, locally.
5. Findings 1 and 3, each as its own piece of work.
