# Handoff: ColdBoot Android pass (Material 3)

## Overview

The Android expression of the ColdBoot native redesign. Same information architecture, same brand tokens, Material 3 grammar: flat tonal surfaces instead of gradients and hairline cards, full-bleed list items instead of iOS inset groups, a navigation bar with the pill active-indicator, and SOS as an extended FAB in the error role.

If you are implementing both platforms, read `design_handoff_native_pass/README.md` first — it carries the rationale, the token table and the state map, all of which apply unchanged. This document covers only what differs on Android.

Three problems drove the redesign:

1. **Topic cards never changed with the theme.** `CardTopic` paints `COLORS.BRAND_GRADIENT` with `LIGHT_COLORS.PRIMARY_DARK` ink hardcoded, so the same steel-blue gradient tile with near-black text renders in both schemes.
2. **The footer was three unequal zones** (50% notifications / 25% active tool / 25% SOS) with mismatched shapes.
3. **The header spent ~260px** on a date, two icon buttons, a 120px logo circle and a full-width "ColdBoot" bar that was actually search.

## About the design files

The files in this bundle are **design references authored in HTML** — prototypes of the intended look, not production code to copy. Recreate them in the existing React Native codebase (`Toastbyte-Studios/ColdBoot`, React Native + MobX + `react-navigation`) using its established patterns: `StyleSheet.create`, `useTheme()` for every color, `ScaledText`, `Touchable`, Ionicons via `react-native-vector-icons`.

Because the app is one React Native codebase, the practical shape of this work is **platform branching inside the shared components**, not a parallel component tree. Recommended split:

- `Platform.select` for the handful of values that differ (row padding, corner radius, icon sizes, label weights).
- Separate files only where the structure genuinely diverges: `AppBar.android.tsx` / `AppBar.ios.tsx`, `NavBar.android.tsx` / `TabBar.ios.tsx`, `SosFab.android.tsx` / `SosFab.ios.tsx`.
- Everything else (module rows, tool rows, the solar card, the daylight chart, sheets) shares one component with a small `platformStyles` object.

## Fidelity

**High-fidelity.** Colors, sizes, weights, radii, spacing and copy below are final. Everything is expressed in dp, matching Material 3's grid.

## Material 3 vs. iOS — the差 at a glance

| | iOS pass | Android pass |
| --- | --- | --- |
| Screen ground | 3-stop vertical gradient | Flat `surface` |
| Containers | Hairline-bordered inset cards, radius 18–20 | Flat tonal `surface-container` blocks, radius 12; no border |
| List items | Inset group, 60px rows, chevrons | Full-bleed 72dp items, no chevrons |
| Leading icon | 36×36 rounded square, radius 11 | 40dp circle |
| Separator | 0.5px, inset 63 | 1dp, inset 72 |
| Bottom nav | 82px blurred glass tab bar | 80dp opaque navigation bar with pill indicator |
| SOS | 62px circular FAB | Extended FAB, 56dp tall, radius 16, icon + label |
| Header | 34px mark + title + date + 2 buttons | 64dp top app bar; date drops to a supporting line below |
| Sheets | Grabber, radius 24 | Grabber, radius 28 |
| Press feedback | Background highlight | Ripple (`TouchableNativeFeedback` / `pressColor`) |
| Switch | iOS pill switch | M3 switch (track outline when off, filled thumb when on) |
| Search | Inline field + "Cancel" | Full-screen search view, 56dp search bar at radius 28 |
| Segmented control | iOS sliding segment | M3 outlined segmented button with a check icon on the selected option |

## Design tokens — mapped to Material 3 roles

Every value already exists in `src/theme/colors.ts`. The Material role names below are how to think about them, not new colors to add.

| M3 role | Light | Dark | Used for |
| --- | --- | --- | --- |
| `surface` | `#EDF4F9` | `#101B24` | Screen ground |
| `surface-container` | `#DCECF7` | `#17232E` | Solar card, search bar, sheets |
| `surface-container-high` | `#E3EEF6` | `#17232E` | Navigation bar |
| `on-surface` | `#1D1F20` | `#DCECF7` | Primary text, app-bar icons |
| `on-surface-variant` | `#557286` | `#8CA3B4` | Supporting text, inactive nav |
| `outline-variant` | `#D5E4EF` | `#22313D` | 1dp dividers |
| `outline` | `#A9C5DA` | `#2C4256` | Chip and button outlines |
| `primary` | `#2F5875` | `#8FB6CE` | Eyebrows, links, filled buttons |
| `secondary-container` | `#C9DEEC` | `#2F4F6B` | Icon circles, nav pill indicator, selected chips |
| `on-secondary-container` | `#14344B` | `#DCECF7` | Icon glyphs and labels inside those |
| `tertiary-container` | `#CFE6E5` | `#1E4045` | Confirmed states ("GPS locked") |
| `on-tertiary-container` | `#1F4D4F` | `#9CD3D8` | Text on those |
| `accent-container` | `#F5E3D2` | — | Active-tool card, solar alert card |
| `on-accent-container` | `#8A4A0C` | `#FFB020` | Text and glyphs on those |
| `accent` | `#B45309` | `#FFB020` | Sun dot, badges, active-tool tile |
| `error` | `#C62828` | `#D8352F` | SOS FAB |
| `on-error` | `#FFFFFF` | `#FFFFFF` | SOS icon and label |

The three `*-container` tints (`#F5E3D2`, `#CFE6E5`, and their dark partners) are the only values not already literal in `colors.ts` — derive them as tonal steps from the existing accent and teal rather than pasting hexes, or add them to the theme as `ACCENT_CONTAINER` / `TERTIARY_CONTAINER`.

Spacing: 4dp grid. Screen gutter 16dp, text gutter 20dp, list item padding `12 16`, section eyebrow padding `20 20 8`.

Radii: containers and cards 12dp, chips and small buttons 8dp, FAB and large buttons 16dp, icon circles and nav pill full, sheets 28dp top.

Elevation: containers are **flat** — no shadow. Only the FAB carries elevation (`0 4px 8px rgba(29,31,32,.24)` light, `0 4px 10px rgba(0,0,0,.5)` dark), matching M3 level 3.

Type — Bitter for the wordmark and headlines, system sans (Roboto) for everything else:

| M3 role | Font | Size / weight |
| --- | --- | --- |
| Title large (app bar) | Bitter-SemiBold | 21 / 600 |
| Headline (screen title) | Bitter-SemiBold | 30 / 600 |
| Sheet title | Bitter-SemiBold | 24 / 600 |
| Display (hero number) | Bitter-SemiBold | 28–34 / 600 |
| Label small (eyebrow) | Roboto | 11 / 600, +0.1em, uppercase, `primary` |
| Body large (list item) | Roboto | 16 / 500 |
| Body medium (supporting) | Roboto | 14 / 400, `on-surface-variant` |
| Label medium (chip, button) | Roboto | 13–15 / 500–600 |
| Label small (nav) | Roboto | 12 / 500, active 600 |
| Badge | Roboto | 11 / 600 |

Unlike iOS, Android weights are ordinary — no `'590'` problem. Keep `ScaledText` for font scaling.

## Screens

### 1. Home (`2a` light, `2b` dark)

1. **Top app bar** — 64dp, `paddingHorizontal: 12`, row, `gap: 14`, small (not large) app bar.
   - 32dp app mark at radius 9 (`assets/coldboot-assets/png/light/icon-96.png` / `png/dark/icon-96.png`), `marginLeft: 4`.
   - "ColdBoot" — Bitter 21/600 in `on-surface`, `flex: 1`.
   - Two 48dp circular icon buttons (24dp glyphs, `on-surface`): search → `Search` screen; settings → the settings sheet. Ripple, no container fill.
   - The old help button moves into Settings → Help.
2. **Supporting line** — "Friday, September 11 · Offline ready", 14/400 `on-surface-variant`, padding `2 20 10`. This is the M3 equivalent of the iOS nav subtitle: it lives in the content, not the bar, so it scrolls away.
3. **Solar card** — `surface-container`, radius 12, **no border, no shadow**, margin 16, padding `16 18 14`.
   - Eyebrow "SOLAR CYCLE" 11/600 +0.1em in `primary`.
   - "Sunset 7:42 PM" — Bitter 28/600 (" PM" at 16).
   - "in 2h 08m · golden hour from 6:55" — 14/400 `on-surface-variant`.
   - 80×56 sun-arc figure on the right: dashed horizon arc in `outline`, traversed arc in `primary` at 2dp, 5.5r `accent` dot at the sun's current position, 1.5dp ground line. Drive from `SolarCycleNotificationStore`.
   - Below, a row of three **stat chips**, `gap: 6`, min height 32dp, radius 8, horizontal padding 10 — this is where Android diverges most from iOS's divided stat row. Two outlined chips (1dp `outline`, 7dp dot + label 13/500): "30.08 in ↓", "Moon 78%". One filled `tertiary-container` chip with a 14dp check: "GPS locked". Chips are read-only; if you want them tappable, route each to its tool.
   - The row must be a **horizontal `ScrollView`** (`horizontal`, `showsHorizontalScrollIndicator={false}`) with each chip at `flexShrink: 0` and its label `numberOfLines={1}`. Three chips only just fit a 412dp screen, and a longer stat string or a larger font scale will overflow — let the row scroll rather than letting labels wrap. Use `minHeight`, never a fixed `height`.
4. **"MODULES" eyebrow** (11/600 +0.1em `primary`, padding `20 20 8`), then six **full-bleed list items** in the `MODULES` order from `constants.ts`:
   - Row: `padding: 12 16`, `gap: 16`, min height 72dp.
   - 40dp circle in `secondary-container`, 22dp Ionicon in `on-secondary-container` — `chatbubbles-outline`, `pulse-outline`, `earth-outline`, `compass-outline`, `shield-checkmark-outline`, `book-outline`.
   - Headline 16/500 `on-surface`; supporting 14/400 `on-surface-variant` — Comms "Morse · whistle · frequencies", Core "Flashlight · notepad · status", Earth "Sun · moon · pressure · sky", Navigation "Offline maps · grid · star map", Prepper "Pantry · inventory · planning", Reference "Health · survival · weather".
   - Trailing: tool **count** 13/400 `on-surface-variant` (6, 6, 5, 4, 6, 5). **No chevron** — Android list items don't carry one.
   - Divider: 1dp `outline-variant`, `marginLeft: 72`.
   - Press: ripple via `TouchableNativeFeedback` (or `Pressable` with `android_ripple={{ color: rippleColor }}`). **Remove the 0.94 scale bounce** from `CardTopic`.

**Do not** carry over: the per-card gradient, the `SECONDARY_ACCENT` border, the per-card shadow, or the hardcoded `LIGHT_COLORS.PRIMARY_DARK` label color.

### 2. Navigation bar + SOS (all screens)

- **Navigation bar**: 80dp tall, `surface-container-high`, opaque (no blur — Android doesn't use it here), `paddingTop: 12`. Three destinations, each `flex: 1`, column, `gap: 4`.
  - Active destination: a 64×32dp pill in `secondary-container` behind the 24dp icon, icon and 12/600 label in `on-secondary-container`.
  - Inactive: no pill, icon and 12/500 label in `on-surface-variant`.
  - Home `home-outline`, Modules `grid-outline`, Alerts `notifications-outline`.
  - **No spacer cell** — unlike the iOS tab bar, the FAB floats above the bar rather than inside it, so all three destinations are evenly spaced.
  - Animate the pill: `Animated` width/opacity over 150ms on switch. `createBottomTabNavigator` with a custom `tabBar` is the cleanest fit.
- **Alerts badge**: min 16dp, radius 8, `accent` fill, 11/600 count, positioned `top: 2, right: 14` on the icon cell. From `useVisibleNotificationCount()`.
- **SOS — extended FAB**: `right: 16`, `bottom: navBarHeight + 14`, 56dp tall, `paddingHorizontal: 20`, radius 16, `error` fill, 24dp warning glyph + "SOS" 15/600 in `on-error`, M3 level-3 shadow. Extended (icon + label) rather than a circle, because Android FABs carry their label when the action is critical and infrequent.
  - Keep **all** existing `SOSTrigger` behavior: 1s hold, `Vibration.vibrate(50)` on press-in and `200` on fire, the progress `Animated.Value`, and the `activate` accessibility action with its confirm dialog.
  - Render the 1s progress as a white overlay filling the FAB left-to-right at 24% opacity (`Animated` width), which suits the extended shape better than the iOS ring.
  - Screens need `paddingBottom: 80 + insets.bottom`.

### 3. Module screen — Core (`2c`)

- App bar: 48dp back icon button (left **arrow**, not a chevron — `arrow-back`), trailing 48dp search button. No title in the bar.
- Headline block, padding `4 20 18`: "Core" Bitter 30/600, "Six tools · all offline" 14/400 `on-surface-variant`, module glyph 30dp on the right in `primary`.
- **Active-tool card** (only when a tool is running; replaces the footer's `ActiveItemButton`): `accent-container` fill, radius 12, margin `0 16 6`, padding `14 16`, row `gap: 16`. 40dp `accent` circle with the tool glyph in white, "Flashlight · strobe" 16/500 over "Running · 4m 12s" 13.5/400 in `on-accent-container`, and an M3 switch (52×32, 24dp thumb, `accent` track when on). Card opens the tool; switch stops it.
- "TOOLS" eyebrow, then the same full-bleed list-item spec as Home, one per tool from `CORE_TOOLS`, alphabetical as today. Trailing values where a store has one: Checklist "4 open", Device Status "72%", Notepad "12", Voice Log "3".
- Reuse this screen verbatim for Comms, Earth, Navigation, Prepper, Reference — only the headline, supporting line, glyph and tool array change.

### 4. Leaf tool — Sun Times (`2d`)

- App bar: back arrow, trailing **overflow** (three-dot) button rather than iOS's single export icon — Android puts secondary actions in a menu.
- Headline "Sun Times" Bitter 30/600; supporting "44.9778° N, 93.2650° W · local" 14/400.
- **Daylight card**: `surface-container`, radius 12, `overflow: hidden`, margin 16. Eyebrow "DAYLIGHT REMAINING", value "2h 08m" Bitter 34/600, then a full-bleed 132dp chart (`react-native-svg`, already a dependency): `accent` day-arc at 2dp over a vertical `accent` gradient fill 22% → 0, 1.5dp horizon in `outline`, dashed "now" line, 7r `accent` dot with a 13r 20%-opacity halo. Below, a three-cell row divided by 1dp rules: DAWN 6:07 AM / SOLAR NOON 1:12 PM / DUSK 8:14 PM (label 10.5/600, value 15/500).
- **Event list**: four full-bleed rows, padding `13 20`, `gap: 16`, each a 10dp color dot + label 16/400 + value 16/500 — Sunrise (`accent`), Golden hour (`#B45309`), Sunset (teal), Day length (`on-surface-variant`). Divider inset 46.
- **Actions**: filled button "Alert me at dusk" — `flex: 1`, 56dp, radius 16, `primary` fill, 20dp bell + label 15/600 in the on-primary color; beside it a 56dp outlined icon button (1dp `outline`, map-pin glyph in `primary`). Extend `AppButton` with `filled` and `outlined` variants rather than hand-rolling.

### 5. Search (`2e`)

Android uses a **full-screen search view**, not an inline field with a Cancel affordance.

- 56dp search bar, radius 28, `surface-container`, margin `10 12 6`, padding `0 8 0 14`: 24dp back arrow (dismisses), query text 16/400 with caret, 48dp clear (×) button on the right.
- Filter chips row, `gap: 8`, 32dp, radius 8: selected chip = `secondary-container` fill with a 16dp **leading check** and label 13/500 in `on-secondary-container`; unselected = 1dp `outline` with `on-surface` label. Labels carry counts: "All 14", "Reference 9", "Tools 3", "Notes 2" — from `searchData` / `ragSearch` result groups.
- Results are **full-bleed**, not a card: padding `10 20 8`, headline 16/500 with a source tag 11/500 +0.08em in `primary` ("SURVIVAL", "HEALTH", "PREPPER"), 2-line snippet 14/400 `on-surface-variant`, 1dp divider inset 20.
- Recent queries follow the same row pattern with a 16dp clock glyph.
- No bottom nav on this screen — the search view is a full-screen destination.

### 6. Settings (`2f`)

A **bottom sheet** (`@gorhom/bottom-sheet` or a modal with a drag handle), `surface-container`, 28dp top corners, 32×4 grabber.

- Title "Settings" Bitter 24/600, padding `10 24 18`. **No close button** — back gesture and drag-down dismiss it.
- **APPEARANCE**
  - M3 **outlined segmented button**: one 40dp row, radius 20, 1dp `outline`, three equal segments divided by 1dp rules. Selected segment = `secondary-container` fill with a 16dp leading check and 14/600 label; unselected = transparent, 14/500. Bind to `SettingsStore.themeMode`.
  - "Night vision tint" / "Red-shift the whole interface" + M3 switch **off** state: 52×32 track with a 2dp `outline` border, transparent fill, 16dp thumb in `on-surface-variant`.
  - "Larger text" + switch **on** state: filled teal track, 24dp thumb in the dark on-color.
- **OFFLINE DATA** — full-bleed rows, padding `12 24`, dividers inset 24: "Offline maps" with supporting "3 areas · 412 MB" (opens `ManageOfflineMapsModal`), "Backup & restore", "Units" with trailing "Imperial". No chevrons.
- **EMERGENCY** — "SOS hold duration" / "Guards against accidental triggers" with trailing "1.0s"; "Reset all data" in `error`.
- Footer: "ColdBoot 1.4.0 · Toastbyte Studios" 12.5/400 centered.

### 7. Alerts (`2g`)

Bottom sheet from 160dp, `#F7FAFC` (light), 28dp top corners, grabber. Header "Alerts" Bitter 24/600 with an **outlined "Clear all" button** (40dp, radius 20, 1dp `outline`, label 14/500 in `primary`) — a real button, not iOS's bare text link.

- Each notification is a **tonal card** — the color lives in the fill, not a left border stripe (the iOS pass's 3px accent edge is not an Android pattern):
  - Solar → `accent-container` `#F5E3D2`, sun glyph and timestamp in `#8A4A0C`, body in `#5B4327`. "Sunset in 2h 08m" / "Golden hour begins 6:55 PM. Headlamp check before dusk."
  - Barometric → `#DCECF7`, glyph in `#14344B`, timestamp in `primary`, body in `#3C5468`. "Pressure falling fast" / "−0.06 in over 3 hours. Weather likely deteriorating."
  - Prepper → neutral `#E4EBF0`, glyph and body in `#3C5468`. "Pantry: 3 items expiring" / "Rotate within 14 days. Review in Prepper → Pantry."
  - Card: radius 12, padding `14 16`, row `gap: 14`, 22dp glyph, headline 16/500, timestamp 12.5/400 beside it, body 14/400.
- Centered "ALWAYS ON" rule, then: "Sunrise and sunset alerts cannot be turned off — they are the app's one guaranteed signal. Everything else here is dismissible." (13.5/400 `on-surface-variant`). Documents the existing `SolarCycleNotificationStore` behavior.
- Swipe-to-dismiss maps to `NotificationsStore.isHidden` / hide, as `NotificationsModal` does today.

## Interactions & behavior

- **Ripple everywhere.** Every list item, chip, icon button and card uses `Pressable` + `android_ripple` (bounded for rows and cards, borderless with a 24dp radius for icon buttons). Ripple color: `rgba(47,88,117,.12)` light, `rgba(143,182,206,.14)` dark.
- **Motion** follows M3 easing (`emphasized` — roughly `cubic-bezier(0.2, 0, 0, 1)`): nav pill 150ms, sheet entry 300ms, FAB progress 1000ms linear.
- **Back handling**: hardware/gesture back must pop the module and tool screens and dismiss the sheets and the search view. Register `BackHandler` where the existing `PanResponder` swipe-back logic lives, and confirm that logic doesn't swallow the system back gesture — the app's horizontal `PanResponder` is the most likely source of a conflict with Android 13+ predictive back. Gate the alert-card swipe to start only after 10dp of horizontal movement inside the sheet.
- **Status and navigation bars**: edge-to-edge. Set the status bar translucent with `on-surface`-matched icon contrast, and let the nav bar sit under the navigation bar with `insets.bottom` padding.
- **Theme switch** is immediate. Because every surface reads from `useTheme()`, verify no `LIGHT_COLORS` imports remain outside `src/theme/fixedSurfaces.ts` (`SketchCanvas`, `KnotStepCarousel`, `MoonPhaseGlyph` are the legitimate exceptions).
- **Dynamic type**: keep `ScaledText`; rows grow rather than truncate. 72dp is a minimum, not a fixed height.
- **Accessibility**: each list item is one `accessibilityRole="button"` with the headline as label (keep `CardTopic`'s existing inner `accessible={false}` pattern). Nav destinations get `accessibilityRole="tab"` + `selected`. The FAB keeps its custom `activate` action and its confirm dialog.
- **Material You (optional)**: if you want dynamic color on Android 12+, map the user's wallpaper palette onto `primary` / `secondary-container` only, and keep `error`, `accent` and the brand mark fixed — the SOS red and the solar amber are functional colors, not decorative.

## State

Nothing new — identical to the iOS pass:

| UI | Source |
| --- | --- |
| Solar card, sunset countdown | `SolarCycleNotificationStore`, `AstronomyEventStore` |
| Pressure chip | `BarometerStore` |
| Moon chip | `utils/lunarPhase` |
| GPS chip | `useDeviceStatus` |
| Alerts list + badge count | `useAllNotifications`, `NotificationsStore` |
| Active-tool card | `SignalingStore` |
| Theme segmented button | `SettingsStore.themeMode` |
| Search results and counts | `utils/searchData`, `utils/ragSearch` |
| Tool row values | `NotesStore`, `useDeviceStatus` |

Plus one local UI state: the selected navigation destination (or the navigator's own).

## Assets

- App mark: `assets/coldboot-assets/png/light/icon-96.png` / `png/dark/icon-96.png` at 32dp (SVG sources in this bundle for reference). Also ship the adaptive-icon foreground/background pair if the repo's Android manifest expects one.
- Icons: real Ionicons via `react-native-vector-icons`, names already in `constants.ts`. The prototype's glyphs are hand-drawn stand-ins — **do not port them**.
- Charts: `react-native-svg`, already a dependency.

## Files in this bundle

- `ColdBoot Redesign.dc.html` — the design reference, both platforms. Open in a browser. **Turn 2 (`2a`–`2g`) is the Android board** described here; turn 1 (`1a`, `1b`, `1d`–`1h`) is the iOS pass.
- `android-frame.jsx`, `ios-frame.jsx` — device bezels. Presentation only; nothing to port.
- `assets/coldboot-assets/svg/*.svg` — the brand marks, copied from the repo.

## Out of scope / open questions

- The Modules destination (the grid icon) is not designed yet — today it would repeat Home's list. On Android this is the natural home for a 2-column tile grid if you want the two destinations to feel distinct.
- Comms, Earth, Navigation, Prepper and Reference follow the Core spec exactly; only content changes.
- Tablet and foldable layouts (M3 expanded window class, navigation rail instead of a bottom bar) are untouched.
- Home-screen widgets and the Quick Settings tile are an obvious Android-only opportunity for the SOS and flashlight actions, and are not designed.
- Stat values in the prototype ("30.08 in", "Moon 78%", "72%") are placeholders — read from the stores.
