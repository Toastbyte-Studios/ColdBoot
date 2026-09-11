# Native redesign

Working notes for the effort to make ColdBoot feel like a native app rather
than a React Native app. Started because the buttons "don't feel native at
all"; the button work surfaced a lot more.

This file is a living log. Add findings as they turn up, even the ones nobody
is going to fix this quarter — the point is that they stop being rediscovered.

**State of play:** the sweep is complete (63 of 63), and so are the emoji pass
(finding 7) and the theming triage (finding 4). Pickers are native menus via
`@react-native-menu/menu`, and short exclusive choices are
`@react-native-segmented-control/segmented-control`, both behind wrappers in
`components/`. What remains is findings 1 and 3, a device pass, and a short
list of smaller items — see "What is left" at the bottom.

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

### Two native wrappers

Choosing from a set is not a tap on a button, so it has its own components:

| Component          | Use for                                        | Renders                                    |
| ------------------ | ---------------------------------------------- | ------------------------------------------ |
| `SelectMenu`       | Picking one value from a list. Category, mode. | `UIMenu` (iOS) / `PopupMenu` (Android)     |
| `SegmentedControl` | Two to five short, mutually exclusive options. | `UISegmentedControl` (iOS) / JS look-alike |

- **`SelectMenu`'s trigger must not be pressable.** Pass a plain `View` —
  usually a field with the value and a chevron. The native view owns the tap;
  a `Touchable` child swallows it and the menu never opens. The wrapper puts
  the accessibility role and label on an inner `View`, because `MenuView`
  does not accept accessibility props.
- **`SegmentedControl` keeps its native 32pt height** rather than the 44pt
  target of finding 8. Matching the platform control is the point.
- Both follow the in-app theme setting (`themeVariant` / `appearance`), not
  the OS, since a user can pin the app to light or dark.
- Both are mocked in `__mocks__/` and mapped in `jest.config.js`. The mocks
  pass every prop through, so a test can find a control by `actions` or
  `values` and fire `onPressAction` / `onChange` directly.

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

### 2. `AppButton` was not actually canonical — DONE

Its docblock called it "the canonical action button used throughout the app."
At the start of this work it was imported in 9 files. `TouchableOpacity`
appeared in 63. Most of the app's buttons were not buttons — they were
touchable views with ad-hoc padding, which is why nothing felt consistent.

The sweep also found three controls that were never on the `TouchableOpacity`
list because they used a bare `Pressable` with an opacity fade on both
platforms: `SOSTrigger`, `ActiveItemButton` and the logo in `AppShell`. The
first two are now `Touchable`; the logo was already done.

See the sweep progress below.

### 3. Hand-built modals — OPEN, eight files (was nine)

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

The sweep converted the controls inside all nine, but left the modal
machinery alone: the tap-outside-to-dismiss backdrops are still
`TouchableWithoutFeedback` (`HelpModal`, `NotificationsModal`) or a bare
absolute-fill `Pressable` (`SettingsModal`, `ManageOfflineMapsModal`). Those
go when the modals become screens or sheets, so converting them now would be
wasted work.

Three modal instances are gone: `AddCustomRepeaterScreen`'s mode and status
pickers and `RepeaterBookScreen`'s mode filter were transparent modal lists,
and are `SelectMenu`s now. That removes one file from the list —
`AddCustomRepeaterScreen` has no modal left — while `RepeaterBookScreen`
keeps its licence-disclaimer modal. Eight files remain.

### 4. Theming is inconsistently applied — DONE

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

So the job on the remaining candidates was triage: decide whether each one is
light-locked by accident or on purpose, and either theme it or move it onto a
named fixed surface with the reason recorded.

**Outcome of the triage.** All twenty-two remaining candidates were
light-locked by accident — ordinary screens with no fixed raster content — and
are now themed through `makeStyles(COLORS)` + `useMemo`:

- MorseCode (6): `AlphaToMorseScreen`, `MorseCodeCheatSheet`,
  `MorseToAlphaScreen`, `MorseTrainerScreen`, `MorseTrainerLevelScreen`,
  `NatoPhoneticScreen`.
- VoiceLog (6): `VoiceLogScreen`, `EmptyState`, `InfoBox`,
  `RecordingControls`, `VoiceLogCard`, `VoiceLogModeButton`.
- Notepad (6): `NewNoteScreen`, `EditNoteScreen`, `ManageCategoriesScreen`,
  `RecentNotesScreen`, `NoteEntryScreen`, and `noteListStyles.ts`.
- `Reference/Shared/EntryScreen`, `ScenarioDetailScreen`, `ComingSoonScreen`,
  `FlashlightScreen`.

`noteListStyles.ts` turned out not to be an exception after all. A
module-scope stylesheet cannot be reactive, but it did not need to be
module-scope: it is now `makeNoteListSharedStyles(COLORS)`, memoised by its
two callers.

One new fixed surface came out of it: `NoteEntryScreen`'s sketch backdrop now
uses `PAPER`, because sketches are PNGs drawn dark-on-light by `SketchCanvas`
(the same reason that file is already listed in `fixedSurfaces.ts`).

`ScenarioDetailScreen` was worse than light-locked: its body text, headings
and bookmark icon used `PRIMARY_LIGHT`, which is near-white, on the pale
light-scheme background. Nothing in its history explains it and the sibling
ScenarioCards screens use the foreground token. It now uses `PRIMARY_DARK`.
**Check this one on a device** — it is a visible change on every scenario.

`NewNoteScreen` and `EditNoteScreen` were held for the native-menu decision
and themed in the same pass as their menus, so the `AppButton`
disabled-colour leak described below is gone. Their placeholders also moved
from `PRIMARY_DARK` to `MUTED`: they had been the same colour as typed text,
so an empty field looked filled in.

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
- `SeasonalOutlookScreen`'s risk-flag chips hardcode `'#fff'`. The footer
  notification badge did too; it now uses `onColor(ACCENT)`.
- `SkyEventsScreen`'s `EVENT_TYPE_DETAILS` hardcodes six category hexes
  (`#FF6B35`, `#9B59B6`, …) and puts `#FFFFFF` badge text on all of them.
- The pantry-expiry notification in the footer (`SolarCycleNotification`,
  `useAllNotifications`) uses `#d32f2f` / `#f9a825` and matching `rgba`
  highlights — the same missing `WARNING` token as the banners above.
- Fixed in the sweep: three dismiss/CTA buttons that hardcoded white on a
  filled tint (`RadioFrequencyDetailScreen` and `RepeaterBookScreen`
  "Understood" on `ACCENT`, `ManageOfflineMapsModal` "Download your area" on
  `BRAND`). White on dark mode's amber or pale steel is unreadable; they are
  `AppButton` now, which measures the label with `onColor`.
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

### 7. Emoji and Unicode characters used as icons — DONE

Sixteen instances were converted during the sweep: the Map feature (twelve),
`RallyPointsScreen`, `MapScreen`, `MorseCodeCheatSheet` (two arrows per row
across 36 rows), and `AddCustomRepeaterScreen`. The dedicated pass below took
care of the rest.

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

All of those are now Ionicons, plus `StarMapScreen`'s `🌍` context banner,
which the list above missed. Three need a note:

- **Moon phases.** No icon set can show an arbitrary phase, so
  `components/MoonPhaseGlyph.tsx` draws one in SVG from suncalc's phase
  value. The lit and shadowed parts are `PAPER` and `INK` — it is a picture
  of the physical moon, and following the scheme would invert a waxing
  crescent — so it is listed in `fixedSurfaces.ts`.
- **Astronomy events.** The list above missed the biggest source:
  `AstronomyEventStore` put emoji (`🌸 ☀️ 🍂 ❄️ 🌑 🌕`) and planet symbols
  (`♀ ♂ ♃ ♄`) in each event's `icon` field, which fed three surfaces —
  `SkyEventsScreen`, the footer ticker, and the notifications list via an
  `iconEmoji` field on `AppNotification`. The store now holds Ionicons names,
  `iconEmoji` is gone, and the store tests assert the new names.
- **Morse trainer.** `⚠ ▶` in the play button became `AppButton`'s `icon`;
  `✓ ✗ ⚠` in the feedback banner became a leading icon.

What the codepoint grep still finds is deliberate: the keycap and bullet
exceptions below, and arrows in running prose (`MapScreen`'s
"Settings → Privacy → …" instructions).

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
- `ConversionCategoryScreen` — the `+/−` key sits in the digit keypad beside
  `.` and `0`–`9`. It now has an `accessibilityLabel` of "Toggle sign".

All three are commented in place so they don't read as oversights.

One related content bug is left open: `utils/ragSearch.ts` has help text
telling users to "Tap the ⚑ Waypoints button" and "Tap ✕ on the active
strip". The map sweep replaced both glyphs with Ionicons, so the search
answers now describe buttons that no longer look like that.

### 8. Undersized touch targets on custom chrome — DONE for swept files

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

The final batch was all option 1. It covered the `DepletionCalculator`
stepper (40pt circles, now `IconButton` with the circle kept as a background),
the segment chips in `GridReferenceScreen`, `BarometricPressureScreen`,
`ConversionCategoryScreen` and `SettingsModal`, `RepeaterBookScreen`'s mode
field, option rows, header icons and attribution link, and `SettingsModal`'s
backup file rows. `RepeaterBookScreen`'s header icons grew its filter row by
about 20pt. That is the visible cost of this finding, and the right trade.

### 9. Accessibility roles and state — DONE for swept files

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

The final batch found more of the same:

- **`CardTopic` had no role and no label.** It is the tool card on every
  module grid — probably the most-tapped control in the app — and a screen
  reader announced it as plain text.
- `ConversionCategoryScreen`'s fourteen keypad keys had no role; the unit
  chips had neither role nor `selected`; the swap button had no label.
- `SettingsModal`'s font, theme and measurement options and its backup file
  rows had no `selected`.
- `HelpModal`'s accordion headers had no `expanded`, the same prose-only
  pattern as the SeasonalOutlook cards. `RecentNotesScreen`'s expandable rows
  likewise.
- `RepeaterBookScreen`'s repeater rows had no role, and its mode options had
  neither role nor state.
- `NoteEntryScreen`'s bookmark toggle said "Bookmark note" whether or not the
  note was bookmarked.

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

### 11. The unit-conversion chips may not be tappable — OPEN, check on device

`ConversionCategoryScreen` wraps its horizontal unit picker in
`<View pointerEvents="box-only">`. `box-only` means the view can receive
touches and its children cannot, which should stop both the chips and the
horizontal scroll from responding at all. It came in with the original
unit-conversion commit and nothing explains it. It may be a leftover from
fighting the hand-rolled back gesture in `AppShell` (finding 1), since this
screen also disables that gesture.

The chips were converted to `Touchable` with the attribute left in place,
because removing it changes behaviour that has not been observed on a device.
Try the picker; if it is dead, delete the attribute.

### 12. `CardTopic` delays every tap by 180ms — KEPT, by decision

The module-grid card runs a scale-and-fade bounce and only calls `onPress`
when the animation finishes. That makes every tool open 180ms late, and the
bounce is the same feedback on both platforms — the finding-2 tell in a
different form. It is still `TouchableWithoutFeedback` (with a role and label
now, per finding 9).

Converting it to `Touchable` and firing `onPress` immediately is mechanical.
The decision was to keep the bounce: it is deliberate character on the
most-seen component in the app. Revisit it only if the delay starts to read
as lag.

### 13. Ink-on-teal headers — DEFERRED to the light/dark polish pass

Finding 6's rule, that label colour on a filled surface is measured and not
assumed, was applied everywhere the sweep touched a button: `ActiveItemButton`,
`SOSTrigger`, the footer badge, `TutorialModal`'s Next, the Morse trainer
levels and keypad, `VoiceLogCard`'s playing state, `RecordingControls`, and
`SettingsModal`'s selected options. Several of those were dark mode's pale ink
on amber, at around 1.4:1.

The same mistake is still in surfaces that are not buttons, so the sweep left
them alone. Measured against the 4.5:1 body-text floor:

| Surface                                                        | Light  | Dark   |
| -------------------------------------------------------------- | ------ | ------ |
| `SectionHeader` (pinned `LIGHT_COLORS.PRIMARY_DARK` on teal)   | 2.90:1 | 5.30:1 |
| Modal headers — Help, Notifications, Settings, Offline Maps    | 2.90:1 | 2.58:1 |
| `CardTopic` (pinned light ink on `BRAND_GRADIENT`, worst stop) | 2.19:1 | 1.93:1 |

White on the light teal is 5.45:1, so `onColor(SECONDARY_ACCENT)` fixes the
headers by picking white in light mode. That is a visible change to every
screen header, which is why it is listed here rather than slipped into the
sweep. `CardTopic` is harder: a gradient has no single colour to measure
against, so it needs a decision on the gradient or a scrim behind the label.

## Resolved decisions

### Native menus — DONE with `@react-native-menu/menu`

Instances found:

- `NoteSortSelector` cycles through four sort orders on tap. You cannot see
  the options, and reaching Z-A takes three taps.
- `NewNoteScreen` and `EditNoteScreen` each contain a hand-rolled dropdown — a
  touchable header plus an absolutely-positioned menu.
- `AddCustomRepeaterScreen` has two: a touchable field plus a transparent
  `Modal` holding a list of options.
- `FormPickerButton` backs the inventory month and year pickers — two more.
- `RepeaterBookScreen`'s mode filter is the same pattern as
  `AddCustomRepeaterScreen`'s: a field plus a transparent `Modal` list. Its
  option rows are `Touchable` now; the modal is untouched.

React Native ships `ActionSheetIOS` and nothing equivalent for Android. The
alternative to a dependency was a hand-built Android popup — exactly the kind
of custom component this effort exists to delete — so the decision was to add
`@react-native-menu/menu` (2.0.0, a New Architecture component).

All of the instances above are `SelectMenu` now. Notes:

- `NoteSortSelector` shows the four orders instead of cycling through them.
- `FormPickerButton` was worse than hand-built: it built its menus from
  `Alert.alert` buttons, and **Android shows at most three alert buttons**, so
  the 77-option year picker never worked there. It is a `SelectMenu` trigger
  now, and takes `options` / `value` / `onSelect` instead of `onPress`.
- The selected option is checked on iOS (`state: 'on'`). Android's
  `PopupMenu` shows no check through this library; the trigger already shows
  the current value.
- `pod install` has been run. Android autolinks on the next Gradle build.

### Segmented controls — DONE with `@react-native-segmented-control/segmented-control`

Segmented controls in all but name: the Current Location / Manual Entry toggle
in `AddWaypointForm`, the Waypoints / Tracks tabs in `WaypointBottomSheet`,
the category filter chips in `PantryExpirationTrackerScreen`. The final batch
found five more: the DD / DMS / MGRS selector in `GridReferenceScreen`, the
1–24h window chips in `BarometricPressureScreen`, and the font size, theme
and measurement rows in `SettingsModal`. `ConversionCategoryScreen`'s unit
chips are borderline — there can be up to eight, in a horizontal scroll,
which is more than a segmented control holds comfortably.

Converted to `SegmentedControl`: `AddWaypointForm`, the `WaypointBottomSheet`
tabs, `GridReferenceScreen`, `BarometricPressureScreen`, and the font size,
theme and measurement rows in `SettingsModal`. Settings' labels were
shortened to fit a segment ("Light", "Imperial"), with the units moved to a
caption under the measurement control.

Deliberately left as `Touchable` chips:

- `PantryExpirationTrackerScreen`'s category filter — the number of options
  is user data, and tapping the active chip clears the filter, which a
  segmented control cannot express.
- `ConversionCategoryScreen`'s unit chips — up to eight, in a horizontal
  scroll.

Two caveats for the device pass. On iOS the library is a legacy view manager
with no codegen spec, so it runs through React Native's interop layer for old
components — it should work on 0.84, but it is the one piece of this that has
not been proven. On Android the library is a JS reimplementation of the iOS
look, not a Material component; it is still better than the hand-built chips
it replaced, which matched neither platform.

## Sweep progress

63 of 63 files converted.

- [x] `components/AppShell.tsx`
- [x] `screens/Notepad` — 6 of 6
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
- [x] `screens/RepeaterBook/RepeaterBookScreen.tsx`
- [x] `screens/` singles — `BarometricPressure`, `DepletionCalculator`,
      `GridReference`, `RadioFrequencies`, `UnitConversion/ConversionCategory`
- [x] `components/` — `Footer` (plus `SOSTrigger` and `ActiveItemButton`),
      `NotificationsModal`, `HelpModal`, `ManageOfflineMapsModal`,
      `SectionHeader`, `SettingsModal`, `TutorialModal`
- [x] `components/NoteSortSelector.tsx`
- [x] `modules/Reference/ReferenceModule.tsx`

`Touchable` gained a `ref` prop along the way: `SectionHeader` is a tutorial
spotlight target and passes a ref to its pressable. React 19 hands `ref` to
function components as a normal prop, so it is typed and flows through
`...rest` without `forwardRef`.

`TutorialFlow.test.tsx` now mocks `ScaledText`. `HelpModal` and
`TutorialModal` render `AppButton`, whose label is a `mobx-react-lite`
observer, and that suite has no store provider.

Separately, the five shared `components/` files from finding 4 are done: two
themed (`HorizontalRule`, `SectionSubHeader`), one documented exception
(`ErrorBoundary`), two rehoused onto `fixedSurfaces` (`SketchCanvas`,
`KnotStepCarousel`). Those are theming fixes, so they are not in the count
above.

Run `npm run cleanup` before pushing. The sweep removes local button styles as
it goes, and `react-native/no-unused-styles` will catch any left behind.

## What is left

The mechanical work is finished. Everything below needs a decision first, a
device to check on, or its own planning.

**Decision:** `IconButton` ripple radius — finding 10.

**Check on a device:**

- Both new native modules, on both platforms, after a clean build. In
  particular: the segmented control on iOS (it runs through the legacy
  interop layer), and that every `SelectMenu` opens from a VoiceOver or
  TalkBack double-tap — the accessible element is a `View` inside the native
  menu view, which should forward activation but has not been observed doing
  so.
- The unit-conversion picker — finding 11.
- `ScenarioDetailScreen`'s text colour change — finding 4.
- `ContactPickerModal`'s hardcoded header padding — finding 5.

**Small, unblocked:**

- Add a `WARNING` token and move the three amber banners, the pantry-expiry
  colours and `SkyEventsScreen`'s category hexes onto the palette — finding 4.
- Fix the stale glyph references in `ragSearch.ts` — finding 7.
- Wire the `StatusBar` style to the colour scheme — finding 4.

**Deferred to the light/dark polish pass:** finding 13.

**Their own piece of work:** findings 1 and 3.
