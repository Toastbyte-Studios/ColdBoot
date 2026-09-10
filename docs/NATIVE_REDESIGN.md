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

`Touchable` is also the escape hatch when a control needs a child the other
two will not render — the map's record button pulses only its glyph, so the
animation has to wrap the icon rather than the pressable.

### Rules these encode

- **Touch targets are 44pt on iOS, 48dp on Android.** `IconButton` enforces
  this regardless of glyph size; the glyph and the target are separate.
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

### Colour escape hatches

Two props exist for buttons that sit on a surface the palette doesn't
describe. Reach for them rarely; a call site that needs one is often a sign
the palette is missing a token.

- `AppButton` `tint` — overrides the variant's tint while keeping the style.
  A `plain` button with a tint override is still a plain button in a different
  colour. Used for the Dismiss inside the download error banner, which has to
  be `ERROR` rather than `BRAND`.
- `IconButton` `disabledColor` — the disabled glyph defaults to the theme's
  muted colour, which is right on a plain background and invisible on a tinted
  one. Used by the map's download FAB, which dims as a whole circle instead.

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

### 3. Five hand-built modals — OPEN

`SettingsModal` (32KB), `HelpModal`, `ManageOfflineMapsModal`, `TutorialModal`
and `NotificationsModal` are all React Native `Modal`s rendered inline in
`AppShell`, while the navigator only uses `presentation: 'modal'` for three
actual routes. `SettingsModal` in particular is a grouped list pretending to
be a modal; it wants to be a screen.

### 4. Theming is inconsistently applied — OPEN

Some screens call `useTheme()`; others `import { COLORS } from '../../theme'`,
which is the light palette resolved at module load. Those screens render the
light scheme in both modes and do not respond to the dark-mode setting at all.

Confirmed in the Notepad directory: `RecentNotesScreen`, `NoteEntryScreen`,
`ManageCategoriesScreen` and `NewNoteScreen` all do this. Pantry, Inventory
and the Map components do not. Given the repo ships a full dark palette and a
`useTheme` hook, this is likely widespread rather than local.

This constrains the sweep: in an affected file, the new components must be
passed the static colors explicitly rather than falling back to the theme,
because a theme-aware icon on a hardcoded light card turns pale-on-pale and
disappears in dark mode. Fixing it properly means moving those
`StyleSheet.create` calls inside the components. Worth its own pass.

The Map components show the pattern to copy: a module-level
`makeStyles(colors)` factory called through `useMemo(() => makeStyles(COLORS),
[COLORS])`. That keeps the stylesheet out of the render body while still
reacting to the scheme.

Related smaller instances:

- `PantryExpirationTrackerScreen`'s `statusBorderColor` and
  `statusBackgroundColor` return hardcoded Material hexes, so the red/amber/
  green expiry coding is identical in both schemes.
- `DownloadConfirmScreen`'s low-storage banner is a fixed amber
  (`#FFF3CD` / `#664D03`), because the palette has no warning token. It has
  `SUCCESS` and `ERROR` but nothing between them. Adding `WARNING` would let
  this and the expiry coding above resolve properly.
- The map's record button used iOS system red (`#FF3B30`) while recording,
  a third red alongside `ERROR` and the expiry hexes. Now `ERROR`.
- `DownloadProgressChip`'s chip and toast, and `MapPanel`'s recording HUD,
  are fixed white on a dark scrim. Those are defensible and deliberate — they
  float over map imagery, not app chrome — and are commented as such. The
  error banner in `DownloadProgressChip` is not: its `rgba(255,255,255,0.95)`
  background stays white in dark mode.
- The footer notification badge hardcodes `'#fff'`.
- No `StatusBar` bar-style appears to be wired to the color scheme, so dark
  mode is likely rendering dark status text on a dark background.

### 5. Header offsets were fixed pixels — FIXED

The date, settings button and logo sat at hardcoded offsets (30 / 50 / 80)
tuned against a 44pt top inset. They now shift by the difference between the
device's actual inset and that baseline, so a 44pt device is unchanged and
everything else gets correct clearance. `SafeAreaProvider` was already mounted
in `App.tsx`.

### 6. `onColor` thresholded luminance — FIXED

The first version of `onColor` picked a label color by thresholding relative
luminance at 0.45. That gets mid-luminance tints wrong: dark mode's `SUCCESS`
(`#4CA891`) sits just under the cutoff and would have received a white label
at 2.9:1, when ink gives it 6.1:1. It now compares actual contrast ratios.
`__tests__/colorUtils.test.ts` asserts every filled tint clears 4.5:1 in both
schemes.

The original `AppButton` also put `PRIMARY_DARK` on `ACCENT` for the `primary`
variant — roughly 3:1, under the body-text floor.

### 7. Emoji and Unicode characters used as icons — PARTLY FIXED

Widespread in the Map feature, and not confined to one folder:

- `offline/` — `⬓` on the download FAB and progress chip, `✅` in the success
  toast, `⚠️` in the error and low-storage banners.
- `WaypointBottomSheet` — `✕` on the close button.
- `MapPanel` — `⚑` on the waypoints FAB, `⌖` on locate-me, `⏺` / `⏹` on the
  record button, `⏱` and `📍` in the recording HUD.

This is worse than it looks. The glyphs resolve from whatever font happens to
cover them, so they differ between iOS and Android and between OS versions;
they do not match the Ionicons used everywhere else in the app; they scale
with the text rather than staying a fixed icon size; and a screen reader
announces the emoji by name, so the success toast read as "check mark button
Offline map ready". All twelve are now Ionicons.

Still worth grepping the rest of the codebase for the same pattern.

### 8. Undersized touch targets on custom chrome — IN PROGRESS

The sweep keeps turning up controls built at whatever size looked right:
`WaypointBottomSheet`'s close button was a 32pt bordered circle, the Notepad
and Pantry header icons were roughly 30-42pt, the row action buttons in
`WaypointRow` and `TrackRow` were about 26pt tall.

Moving these onto the primitives fixes the target but changes the look,
because the primitives will not render below 44/48. The bottom sheet's close
button lost its bordered circle rather than growing into a 44pt one. Expect a
small amount of this in every batch; it is the point rather than a side
effect, but it does mean the diffs are not purely mechanical.

The map FABs are the happy case: already 48pt circles, so they took
`IconButton` without any change in size.

## Open decisions

### Native menus — needs a dependency call

`NoteSortSelector` cycles through four sort orders on tap: you cannot see the
options, and reaching Z-A takes three taps. `NewNoteScreen` and
`EditNoteScreen` each contain a hand-rolled dropdown (a touchable header plus
an absolutely-positioned menu).

Both want a real menu. React Native ships `ActionSheetIOS` and nothing
equivalent for Android, so the options are:

1. Add `@react-native-menu/menu` — wraps `UIMenu` and Android's `PopupMenu`.
   Real native menus, but it's a native module, so it needs a pod install and
   a Gradle sync.
2. `ActionSheetIOS` on iOS plus a hand-built Android popup — no new
   dependency, but it means writing exactly the kind of custom component this
   effort is trying to delete.

Until this is settled, those three files are held back from the sweep.
Converting only their icon buttons would leave a confusing half-migrated diff.

### Segmented controls — a second, smaller dependency call

Separate from menus, several places are segmented controls in all but name:
the Current Location / Manual Entry toggle in `AddWaypointForm`, the
Waypoints / Tracks tabs in `WaypointBottomSheet`, the category filter chips in
`PantryExpirationTrackerScreen`.

They are converted to `Touchable` with `accessibilityState.selected` for now,
which fixes the press feedback and the screen-reader announcement but leaves
them looking hand-built. `@react-native-segmented-control/segmented-control`
wraps the real `UISegmentedControl` on iOS and draws a Material equivalent on
Android. Same trade-off as the menu decision, lower stakes.

## Sweep progress

22 of 63 files converted.

- [x] `components/AppShell.tsx`
- [x] `screens/Notepad` — 4 of 6 (`NewNoteScreen`, `EditNoteScreen` held, see
      open decisions)
- [x] `screens/Pantry` — 5 of 5
- [x] `screens/Inventory` — 4 of 4
- [ ] `screens/Map` — 8 of 9 (`MapScreen` remains)
- [ ] `screens/EmergencyPlan` — 6 files
- [ ] `screens/MorseCode` — 4 files
- [ ] `screens/VoiceLog` — 3 files
- [ ] `screens/RepeaterBook` — 3 files
- [ ] `screens/Checklist`, `ScenarioCards` — 2 files each
- [ ] `screens/` singles — `BarometricPressure`, `Common/SearchScreen`,
      `DepletionCalculator`, `GridReference`, `RadioFrequencies`,
      `Reference/Shared/EntryScreen`, `SeasonalOutlook`,
      `Shared/Prepper/FormPickerButton`, `UnitConversion/ConversionCategory`
- [ ] `components/` — `Footer`, `NotificationsModal`, `HelpModal`,
      `ManageOfflineMapsModal`, `NoteSortSelector`, `SectionHeader`,
      `SettingsModal`, `TutorialModal`
- [ ] `modules/Reference/ReferenceModule.tsx`

Run `npm run cleanup` before pushing. The sweep removes local button styles as
it goes, and `react-native/no-unused-styles` will catch any that are left
behind.
