# Handoff: ColdBoot native iOS pass (Home, modules, tools, search, settings, alerts)

## Overview

A visual and structural redesign of the ColdBoot shell, aimed at removing the "developer art" read from the current build: theme-aware topic rows, a real tab bar in place of the three-zone footer, SOS as a floating action, and a compact nav-bar header.

Three problems drove it:

1. **Topic cards never changed with the theme.** `CardTopic` paints `COLORS.BRAND_GRADIENT` with `LIGHT_COLORS.PRIMARY_DARK` ink hardcoded, so the same steel-blue gradient tile with near-black text renders in both schemes.
2. **The footer was three unequal zones** (50% notifications / 25% active tool / 25% SOS) with mismatched shapes — a hard-cornered black block beside a red square.
3. **The header spent ~260px** on a date, two icon buttons, a 120px logo circle and a full-width "ColdBoot" bar that was actually the search affordance.

## About the design files

The files in this bundle are **design references authored in HTML** — prototypes of the intended look and behavior, not production code to copy. The work is to **recreate them in the existing React Native codebase** (`Toastbyte-Studios/ColdBoot`, React Native + MobX + `react-navigation`), using its established patterns: `StyleSheet.create`, `useTheme()` for every color, `ScaledText`, `Touchable`, Ionicons via `react-native-vector-icons`.

No new dependency is required by this design except an optional blur view for the tab bar (see _Tab bar_ below), which has a plain-color fallback.

## Fidelity

**High-fidelity.** Colors, type sizes, weights, radii, spacing and copy are final and are listed exactly below. Recreate them faithfully. Every color used already exists in `src/theme/colors.ts` — nothing new was invented.

## Existing files this replaces or changes

| Repo file                                         | Change                                                                                                                                                                           |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/CardTopic.tsx`                    | Replaced by a theme-aware row (`ModuleRow`) inside a grouped list container. Drop `LinearGradient` and the `LIGHT_COLORS` imports.                                               |
| `src/components/ToolList.tsx`                     | Renders rows into one bordered group container instead of free-floating cards; keeps alphabetical sort.                                                                          |
| `src/components/Footer/Footer.tsx`                | Replaced by a bottom tab bar (Home / Modules / Alerts) + a separate `SOSFab`. The notification zone becomes the Alerts tab with a badge.                                         |
| `src/components/Footer/components/SOSTrigger.tsx` | Keeps all hold/vibration/accessibility logic; only the container styling changes (62px circle, see _SOS_).                                                                       |
| `src/components/AppShell.tsx`                     | Header block replaced by a 34px mark + title/date + two 34px icon buttons. `HEADER_PADDING_TOP`/`DATE_TOP`/`SETTINGS_TOP` offsets and the `bottomRule` `HorizontalRule` go away. |
| `src/components/LogoHeader.tsx`                   | Now a 34px tile in the nav bar (size prop 34, radius 10, no 2px border, no `marginBottom`). Use the `-small` asset variants.                                                     |
| `src/components/SectionHeader.tsx`                | The full-width teal search bar is removed. Search becomes a 34px header icon button that navigates to `Search`; screen titles become plain large titles.                         |
| `src/theme/constants.ts`                          | `FOOTER_HEIGHT` 100 → 82 (plus safe-area bottom inset).                                                                                                                          |

## Design tokens

All values come from `src/theme/colors.ts` (and match `assets/coldboot-assets/README.md`). Light / dark:

| Role                             | Light                               | Dark                                |
| -------------------------------- | ----------------------------------- | ----------------------------------- |
| Screen ground (gradient)         | `#F1F7FB → #DCECF7 (52%) → #C9DEEC` | `#1B2F42 → #152532 (46%) → #0B131A` |
| Surface (cards, groups, tab bar) | `#F7FAFC`                           | `#17232E`                           |
| Group border                     | `#A9C5DA`                           | `#2C4256`                           |
| Row separator                    | `#DCECF7`                           | `#22313D`                           |
| Text                             | `#1D1F20`                           | `#DCECF7`                           |
| Muted text                       | `#557286`                           | `#8CA3B4`                           |
| Brand (icons, links, active tab) | `#2F5875`                           | `#8FB6CE`                           |
| Icon tile fill                   | `rgba(47,88,117,0.10)`              | `rgba(143,182,206,0.14)`            |
| Signal / accent                  | `#B45309`                           | `#FFB020`                           |
| Confirmed / teal                 | `#2F6F7A`                           | `#5E9BA8`                           |
| Error (SOS)                      | `#C62828`                           | `#D8352F`                           |
| Chevron                          | `#A9C5DA`                           | `#557286`                           |

Spacing: the existing `SPACING` scale (4 / 8 / 12 / 16 / 24) covers everything; row padding is `12 14`, screen gutter `16`.

Radii: group container `18`, feature card `20`, icon tile `11` (34px tiles: `10`), pill/toggle `16`, SOS circle `31`, bottom sheet `24` top corners.

Elevation (iOS): feature card `shadowColor #1D1F20, opacity .05, radius 2, offset {0,1}` plus an ambient `rgba(47,88,117,.07) radius 20 offset {0,8}`; SOS `shadowColor #C62828, opacity .42, radius 18, offset {0,6}`. Dark mode uses `rgba(0,0,0,.28) radius 22 offset {0,8}` on cards. Prefer `--shadow`-equivalent constants over per-component values.

Type — SF (system) for interface, **Bitter** kept for the wordmark, screen titles and hero numbers:

| Use                                           | Font            | Size / weight / tracking             |
| --------------------------------------------- | --------------- | ------------------------------------ |
| Wordmark (nav bar)                            | Bitter-Bold     | 17 / 700 / −0.2                      |
| Nav subtitle (date)                           | System          | 11.5 / 500                           |
| Screen large title                            | Bitter-Bold     | 32 / 700 / −0.7                      |
| Sheet title                                   | Bitter-Bold     | 24 / 700 / −0.4                      |
| Hero number (e.g. "Sunset 7:42 PM", "2h 08m") | Bitter-SemiBold | 27–34 / 600 / −0.5 to −0.8           |
| Section eyebrow                               | System          | 11 / 600 / +0.09em, uppercase, muted |
| Row title                                     | System          | 16.5 / 590 / −0.2                    |
| Row subtitle                                  | System          | 12.5 / 400, muted                    |
| Row value (right side)                        | System          | 13–14 / 400, muted                   |
| List row (settings, sun times)                | System          | 15.5 / 500; value 15.5 / 590         |
| Tab label                                     | System          | 10.5 / 500 (active 590)              |
| Badge                                         | System          | 10.5 / 700                           |

React Native note: `fontWeight: '590'` is not valid — use `'600'` for the 590 entries above, and keep `ScaledText` so Dynamic Type still applies.

## Screens

### 1. Home (`1a` light, `1b` dark)

**Purpose** — pick a module; see the one time-critical fact (next solar event) without navigating.

**Layout**, top to bottom, inside the safe area:

1. **Nav bar** — `paddingTop: insets.top + 14`, `paddingHorizontal: 16`, `paddingBottom: 10`, row, `gap: 11`, `alignItems: center`.
   - 34×34 app mark tile, radius 10 (`assets/coldboot-assets/svg/icon-light-small.svg` / `icon-dark-small.svg`; in RN use `png/light/icon-96.png` / `png/dark/icon-96.png`).
   - Title column, `flex: 1`: "ColdBoot" (Bitter 17/700) over "Friday, September 11 · Offline ready" (11.5/500, muted). Date string keeps the existing `dayjs` format; append the connectivity phrase only if you already know it offline-first.
   - Two 34×34 circular icon buttons, `gap: 8`: **search** (`search-outline`, navigates to `Search`) and **settings** (`settings-outline`, opens `SettingsModal`). Fill `rgba(255,255,255,.72)` light / `rgba(143,182,206,.12)` dark, hairline border `rgba(47,88,117,.18)` / `rgba(143,182,206,.22)`, icon 17px in brand color.
   - The old help (`help-circle-outline`) button moves into Settings → Help; keep the tutorial entry point there.

2. **Feature card** (Solar cycle) — surface fill, 1px border, radius 20, padding `15 17 13`.
   - Eyebrow "SOLAR CYCLE" (11/600, +0.09em, muted).
   - "Sunset 7:42 PM" — Bitter 27/600, −0.5; the " PM" span drops to 15.
   - "in 2h 08m · golden hour from 6:55" — 13/500, muted.
   - Right: a 78×54 sun-arc figure — dashed horizon arc in border color, solid traversed arc in brand at 2px, a 5.5r dot in the accent at the sun's current position, 1.5px ground line. Drive the dot from the same data as `SolarCycleNotification`.
   - Full-bleed 1px divider (negative horizontal margin), then three stats in a row with 1px vertical rules and 18px gaps: PRESSURE `30.08 in ↓` (from `BarometerStore`), MOON `Waxing 78%` (`lunarPhase`), FIX `GPS locked` in the teal role. Eyebrows 10/600 +0.07em muted; values 14/600.

3. **"MODULES" eyebrow**, then the **module group**: surface fill, 1px border, radius 18, `overflow: hidden`. Six rows in the existing `MODULES` order from `constants.ts`, each:
   - `flexDirection: row`, `alignItems: center`, `gap: 13`, padding `12 14`, min height 60.
   - 36×36 icon tile, radius 11, tile fill, Ionicons glyph at 20px in the brand color — `chatbubbles-outline`, `pulse-outline`, `earth-outline`, `compass-outline`, `shield-checkmark-outline`, `book-outline`.
   - Title 16.5/600 −0.2 in text color; subtitle 12.5/400 muted: Comms "Morse · whistle · frequencies", Core "Flashlight · notepad · status", Earth "Sun · moon · pressure · sky", Navigation "Offline maps · grid · star map", Prepper "Pantry · inventory · planning", Reference "Health · survival · weather".
   - 8×14 chevron in the chevron color, 2px stroke.
   - Separator: 0.5px in the separator color, `marginLeft: 63` (aligns to the title, iOS grouped-list convention).
   - Press state: background `rgba(47,88,117,.06)` light / `rgba(143,182,206,.08)` dark for the row only. **Remove the 0.94 scale bounce** from `CardTopic` — it reads as a toy; a highlight is the native behavior. If you want motion, `Animated.timing` opacity 1 → 0.6 over 90ms on press-in and back on press-out.

**Do not** carry over: the per-card gradient, the 1px `SECONDARY_ACCENT` border on every card, the drop shadow under each card, and the hardcoded `LIGHT_COLORS.PRIMARY_DARK` label color.

### 2. Tab bar + SOS (all screens)

- Container: 82px tall plus `insets.bottom`, pinned bottom. Fill `rgba(247,250,252,.82)` light / `rgba(16,27,36,.8)` dark, top hairline `rgba(47,88,117,.2)` / `rgba(143,182,206,.2)`, `paddingTop: 9`.
  - Blur is the intended finish (`blur(18px) saturate(180%)`). In RN use `@react-native-community/blur` `BlurView` (`blurType: 'light' | 'dark'`, amount 18) behind the row; if you'd rather not add the dependency, use the flat surface color at full opacity — the design still reads correctly.
- Three tabs, each `flex: 1`, column, `gap: 3`: 25px Ionicons glyph over a 10.5 label. Active is brand-colored with the 590 weight; inactive muted. Home `home-outline`, Modules `grid-outline`, Alerts `notifications-outline`.
- A 4th `width: 84` spacer reserves the SOS corner — do not let a tab sit under it.
- Alerts badge: min 17×17, radius 9, accent fill, count text 10.5/700 (`#fff` on light's `#B45309`, `#1D1F20` on dark's `#FFB020`), positioned `top: -2, right: calc(50% - 22px)`. Count comes from the existing `useVisibleNotificationCount()`.
- Implementation: `createBottomTabNavigator` with a custom `tabBar` is the cleanest fit, but the existing `AppShell` can keep rendering it as an absolute view if you'd rather not restructure navigation now. Screens need `paddingBottom: 82 + insets.bottom`.

**SOS** — `right: 18`, `bottom: 24 + insets.bottom`, 62×62 circle, radius 31, fill `#C62828` light / `#D8352F` dark, 2px `rgba(255,255,255,.34)` inner border, red-tinted shadow. Contents: 20px `warning-outline` in white over "SOS" at 10/800 +0.06em. Keep **all** existing `SOSTrigger` behavior unchanged: 1s hold, `Vibration.vibrate(50)` on press-in and `200` on fire, the progress `Animated.Value`, and the `activate` accessibility action with its confirm dialog. Render the 1s progress as a white arc stroking clockwise around the circle's edge (or, simplest, an `Animated` ring inset 2px scaling opacity) rather than the old left-to-right fill across the notification zone.

### 3. Module screen — Core (`1d`)

- Back affordance: chevron + "Home" at 17/400 in brand (standard iOS back), search icon button on the right. No large logo.
- Title block, padding `6 20 16`: "Core" Bitter 32/700 −0.7, "Six tools · all offline" 13.5/400 muted, with the module's Ionicon at 30px on the right at 100% opacity.
- **Active-tool card** (only when something is running — this replaces the footer's `ActiveItemButton`): surface, 1px border, radius 18, padding `13 15`, row. 38×38 accent-filled tile (radius 12) with the tool glyph in white, "Flashlight · strobe" 16/600 over "Running · 4m 12s" 12.5/400 in the accent, and a 51×31 iOS switch (on = accent). Tapping the card opens the tool; the switch stops it.
- "TOOLS" eyebrow, then the same group container and row spec as Home, one row per tool from `CORE_TOOLS`, alphabetical as today. 34×34 tiles, radius 10. Right-side values where a store already has the number: Device Status "72%", Notepad "12". Separator `marginLeft: 61`.
- Reuse this screen verbatim for Comms, Earth, Navigation, Prepper, Reference — only the title, subtitle, glyph and tool array change.

### 4. Leaf tool — Sun Times (`1e`)

- Back chevron + "Earth"; trailing 32px icon button with a download/export glyph (the existing screen's action — swap for whatever that screen really offers).
- Title "Sun Times" Bitter 32/700, subtitle "44.9778° N, 93.2650° W · local" 13.5/400 muted (from the location store).
- **Daylight card**: surface, border, radius 20, `overflow: hidden`. Eyebrow "DAYLIGHT REMAINING", value "2h 08m" Bitter 34/600 −0.8, then a full-width 132px chart: accent day-arc at 2px over a vertical accent gradient fill at 22% → 0, 1.5px horizon rule in border color, dashed "now" line, and a 7r accent dot with a 13r 20%-opacity halo. Below the chart, a three-cell row divided by 1px rules: DAWN 6:07 AM / SOLAR NOON 1:12 PM / DUSK 8:14 PM (eyebrow 9.5/600, value 15/600).
- **Event list** group: four rows, each an 8px color dot + label 15.5/500 + value 15.5/600 — Sunrise (accent), Golden hour (`#B45309`), Sunset (teal), Day length (muted). Separator `marginLeft: 35`.
- **Actions row**: primary `Alert me at dusk` — 46px tall, radius 14, brand fill, label 16/600 in `PRIMARY_LIGHT` (light) / `#101B24` (dark), with a 17px bell glyph; beside it a 46×46 secondary icon button (map pin) in the tinted fill. This is the `filled` and `tinted` pair from the existing `AppButton`, at `large` size — extend `AppButton` rather than hand-rolling.

### 5. Search (`1f`)

- Replaces the teal `SectionHeader` bar. Top row: 38px field, radius 12, surface fill, 1px border, 16px magnifier in muted, query text 16.5/400, caret; "Cancel" 17/400 in brand to dismiss.
- Scope chips row, `gap: 7`, 30px tall, radius 15: active chip = brand fill with `#F7FAFC` label 13/600; inactive = `rgba(255,255,255,.7)` with hairline border and brand label 13/500. Labels carry counts: "All 14", "Reference 9", "Tools 3", "Notes 2" — wire to `searchData`/`ragSearch` result groups.
- Result group: surface, border, radius 18. Each result is padding `12 15`: title 15.5/600 plus a source tag 11/500 +0.06em muted uppercase ("SURVIVAL", "HEALTH", "PREPPER"), and a 2-line snippet 13/400 muted. Separator 0.5px, `marginLeft: 15`.
- "RECENT" eyebrow, then recent queries as 15/400 rows with a 15px clock glyph, `gap: 9`.
- Keyboard is the system keyboard; the screen must lift with it — the existing `useKeyboardStatus` translate in `AppShell` already does this.

### 6. Settings (`1g`)

Presented as a sheet from the top inset + 52px, `#101B24` (dark) / `#F7FAFC` (light), 24px top corners, 40×5 grabber, hairline top border.

- Header row: "Settings" Bitter 24/700 and a 30×30 close button (tinted circle, 14px ×).
- **APPEARANCE** group (surface, border, radius 16, padding `12 14`, `gap: 11`):
  - Segmented control Light / Dark / System — track `rgba(143,182,206,.10)`, 2px inset, 30px options at radius 7; selected option `#2C4256` (dark) / `#FFFFFF` (light) with a 1px 2%-black shadow and a 14/600 label; unselected 14/500 muted. Bind to `SettingsStore.themeMode`.
  - "Night vision tint" with subtitle "Red-shift the whole interface" + switch (off state shown).
  - "Larger text" + switch (on = teal `#5E9BA8`).
- **OFFLINE DATA** group: "Offline maps" with value "3 areas · 412 MB" + chevron (opens `ManageOfflineMapsModal`), "Backup & restore" + chevron, "Units" with value "Imperial" + chevron. Rows padding `13 14`, separator `marginLeft: 14`.
- **EMERGENCY** group: "SOS hold duration" with subtitle "Guards against accidental triggers" and value "1.0s"; "Reset all data" in the error color.
- Footer line: "ColdBoot 1.4.0 · Toastbyte Studios" 11.5/400, centered, in the chevron/muted color.

### 7. Alerts (`1h`)

Sheet from 150px (light shown), `#F7FAFC`, 24px top corners, `0 -12px 40px rgba(29,31,32,.18)` shadow, grabber, header "Alerts" Bitter 24/700 with "Clear all" 15.5/400 in brand.

- Each notification is a card: `#fff` fill, 1px border, **3px left border in the role color**, radius 14, padding `13 15`, row with `gap: 12`. 21px glyph, then a title 15.5/600 with a relative timestamp 12/400 muted beside it, and a body line 13/400 muted.
  - Solar → accent `#B45309`, sun glyph, "Sunset in 2h 08m" / "Golden hour begins 6:55 PM. Headlamp check before dusk."
  - Barometric → teal `#2F6F7A`, gauge glyph, "Pressure falling fast" / "−0.06 in over 3 hours. Weather likely deteriorating."
  - Prepper → muted `#557286`, shield glyph, "Pantry: 3 items expiring" / "Rotate within 14 days. Review in Prepper → Pantry."
- A centered "ALWAYS ON" rule, then the explanatory line: "Sunrise and sunset alerts cannot be turned off — they are the app's one guaranteed signal. Everything else here is dismissible." (12.5/400 muted). This documents the existing always-on behavior in `SolarCycleNotificationStore`.
- Swipe-to-dismiss maps to `NotificationsStore.isHidden` / hide, as `NotificationsModal` does today.

## Interactions & behavior

- **Row press**: background highlight in, highlight out on release, then navigate. 90ms, no scale.
- **Tab switch**: instant; no cross-fade. Icon and label both change color.
- **SOS**: press-in → haptic 50ms, progress ring animates 0→1 over 1000ms; on completion → `setSosWithTone(true)`, `setFlashlightMode(SOS)`, haptic 200ms. Release before 1s cancels and resets the ring.
- **Sheets**: standard iOS sheet presentation (slide up, backdrop `rgba(29,31,32,.28)` light / `rgba(0,0,0,.45)` dark), grabber drags to dismiss.
- **Theme switch**: takes effect immediately, as today. Because every surface now reads from `useTheme()`, verify there are no remaining `LIGHT_COLORS` imports outside `src/theme/fixedSurfaces.ts` (`SketchCanvas`, `KnotStepCarousel`, `MoonPhaseGlyph` are the legitimate exceptions).
- **Gesture navigation**: the existing `PanResponder` swipe-back/forward in `AppShell` is unchanged. Watch for conflict with horizontal swipe-to-dismiss on alert cards — gate the card swipe to start only after 10px of horizontal movement inside the sheet.
- **Dynamic Type**: all text stays in `ScaledText`. Rows must grow rather than truncate; the 60px row min-height is a minimum, not a fixed height.
- **Accessibility**: every row is one `accessibilityRole="button"` with the title as its label (today `CardTopic` wraps an inner `accessible={false}` view — keep that pattern). Tab bar items get `accessibilityRole="tab"` and `selected` state. SOS keeps its custom `activate` action.

## State

Nothing new. The design consumes state that already exists:

| UI                                     | Source                                               |
| -------------------------------------- | ---------------------------------------------------- |
| Solar card, sunset countdown           | `SolarCycleNotificationStore`, `AstronomyEventStore` |
| Pressure stat                          | `BarometerStore`                                     |
| Moon stat                              | `utils/lunarPhase`                                   |
| GPS fix                                | `useDeviceStatus`                                    |
| Alerts list + badge count              | `useAllNotifications`, `NotificationsStore`          |
| Active-tool card                       | `SignalingStore` (flashlight mode, decibel meter)    |
| Theme segmented control                | `SettingsStore.themeMode`                            |
| Search results and counts              | `utils/searchData`, `utils/ragSearch`                |
| Tool row values (notes count, battery) | `NotesStore`, `useDeviceStatus`                      |

One new local UI state: which tab is selected (or the navigator's own state if you adopt `createBottomTabNavigator`).

## Assets

- App mark: `assets/coldboot-assets/svg/icon-light-small.svg` and `icon-dark-small.svg` (already in the repo; the `-small` three-chevron variants are correct at 34px per the brand README). The prototype inlines those exact paths — see `assets/` in this bundle. For RN, `assets/coldboot-assets/png/light/icon-96.png` / `png/dark/icon-96.png`.
- Icons: Ionicons via `react-native-vector-icons`, the names already declared in `constants.ts`. The prototype's glyphs are hand-drawn stand-ins because Ionicons isn't vendored in the repo — **use the real Ionicons, not the prototype SVGs**.
- The sun-arc and daylight charts are drawn with `react-native-svg`, which the app already depends on.

## Files in this bundle

- `ColdBoot Redesign.dc.html` — the design reference. Open in a browser; it shows all seven screens side by side (`1a`, `1b` = Home light/dark, `1d`–`1h` = the flow). `1c` was an explored direction the team rejected; it is not in the file.
- `ios-frame.jsx` — the device bezel the prototype renders inside. Presentation only; nothing to port.
- `assets/coldboot-assets/svg/*.svg` — the brand marks referenced above, copied from the repo for convenience.

## Out of scope / open questions

- The Modules tab itself (the grid icon in the tab bar) is not designed yet — currently it would repeat Home's module list.
- Comms, Earth, Navigation, Prepper and Reference module screens follow the Core spec exactly; only content changes.
- The map, morse and other tool screens were not touched.
- The prototype's copy for stat values ("30.08 in", "Waxing 78%", "72%") is placeholder data — read from the stores.
