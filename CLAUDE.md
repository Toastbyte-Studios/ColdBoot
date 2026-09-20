# ColdBoot — Claude Code Instructions

ColdBoot is a fully **offline-first** React Native app for iOS and Android.

---

## Stack

| Concern     | Library                                                |
| ----------- | ------------------------------------------------------ |
| Framework   | React Native 0.84 / React 19                           |
| Language    | TypeScript 5.8 strict                                  |
| State       | MobX 6 + mobx-react-lite                               |
| Navigation  | @react-navigation/native-stack                         |
| Validation  | Zod 4                                                  |
| Persistence | react-native-sqlite-storage + AsyncStorage             |
| Icons       | react-native-vector-icons (Ionicons, outline variants) |
| Testing     | Jest 29 (React Native preset)                          |

---

## Key Commands

```bash
npm run ios           # Run on iOS simulator
npm run android       # Run on Android emulator
npm run lint          # ESLint check
npm run format        # Prettier format
npm run typecheck     # tsc --noEmit
npm test              # Jest
npm run cleanup       # format + lint + typecheck + test
```

CI (`.github/workflows/ci.yml`) runs `npm run lint`, `npx prettier --check .`,
`npm run typecheck` and `npm test -- --ci`. Run the same checks before opening
a PR.

---

## Project Structure

```text
src/
  components/     # Shared UI components (ScreenBody, CardTopic, Grid, etc.)
  hooks/          # Custom hooks (useTheme, useDeviceStatus, etc.)
  modules/        # Module-level screens (CoreModule, PrepperModule, etc.)
  navigation/     # AppNavigator, navigationRef, NavigationHistoryContext
  screens/        # Feature screens grouped by domain
  stores/         # MobX stores (RootStore + 15 domain stores)
  theme/          # Color schemes, spacing constants, gradient definitions
  types/          # TypeScript type definitions
  utils/          # Pure utility functions
  data/           # Static JSON data files (health, survival, weather, etc.)
```

---

## Architecture Patterns

### Screens

- Each screen lives at `src/screens/<Feature>/<FeatureScreen>.tsx`
- Screens are always wrapped with `observer()` from `mobx-react-lite`
- Screens access state via store hooks, not raw context
- Screens pushed below a module should use `StackScreen` for the shared page frame (back control, large title, subtitle/note, Android bleed, footer clearance)
- Lists of tappable tools/items should use `GroupContainer` + `ModuleRow variant="tool"`
- Card content should use `cardSurface(COLORS)` and carry its own `SCREEN_GUTTER` on Android
- Use `SectionEyebrow` for labels inside a screen; `SectionHeader` is the page title owned by `StackScreen`
- A screen with steps of its own (Voice Log's record and playback modes) passes
  `StackScreen`'s `onBack` so its back control returns to its own starting
  point rather than popping the screen
- Two screens deliberately keep their own frame, each explained in a comment on
  the file: `Map/MapScreen` and `UnitConversion/ConversionCategoryScreen`. Both
  fill the remaining height with something that must not scroll (a map, a
  keypad), so they take the headline row alone. A modal like
  `ConversionCategoryScreen` gets a close button there, not a back chevron.

Before building a screen part from scratch, check whether one of these already
covers it:

| Need                              | Use                                                         |
| --------------------------------- | ----------------------------------------------------------- |
| A form on a card, keyboard-aware  | `screens/Shared/Prepper/FormCard`                           |
| A "manage categories" row         | `components/CategoryManagerRow`                             |
| A titled block of prose and lists | `components/EntrySection` (`EntrySection`, `EntryItemList`) |
| A lookup table (morse, NATO)      | `components/ReferenceTable`                                 |
| A note composer                   | `screens/Notepad/Shared/NoteEditor`                         |
| Pantry/Inventory row copy         | `screens/Shared/Prepper/itemRowFormatters`                  |

```tsx
import { observer } from 'mobx-react-lite';
import GroupContainer from '../../components/GroupContainer';
import ModuleRow from '../../components/ModuleRow';
import StackScreen from '../../components/StackScreen';
import { useCoreStore } from '../../stores/StoreContext';

const MyScreen = observer(() => {
  const core = useCoreStore();
  return (
    <StackScreen title="My Feature" subtitle={`${core.tools.length} tools`}>
      <GroupContainer>
        <ModuleRow
          title="Example tool"
          icon="construct-outline"
          variant="tool"
        />
      </GroupContainer>
    </StackScreen>
  );
});

export default MyScreen;
```

### State (MobX)

- `RootStore` owns all stores; accessed via `StoreProvider` + `useStores()` or per-store hooks
- Always call `makeAutoObservable(this, {}, { autoBind: true })` in store constructors
- Wrap async state updates in `runInAction()`
- Store hooks: `useCoreStore()`, `useInventoryStore()`, `usePantryStore()`, `useSettingsStore()`, etc.
- New stores must be added to `RootStore` and exported from `StoreContext`

### Theming

- **In screen components**: use the `useTheme()` hook — it returns `ColorScheme` and responds to system/dark/light mode
- **In containers (non-component files)**: import `COLORS` as a constant from `../../../theme` — do **not** use `useTheme()` here
- Never hardcode color values; always reference the theme
- Spacing constants: `SPACING.xs/sm/md/lg/xl` (4/8/12/16/24) and `FOOTER_HEIGHT`, `SCROLL_PADDING` from `src/theme/constants.ts`

### Navigation

- All routes are defined in `src/navigation/AppNavigator.tsx` (native stack, headers hidden by default)
- Route names use PascalCase matching their screen filename (e.g., `"DepletionCalculator"`)
- Navigate via `useNavigation()` hook inside components
- Register new routes in `AppNavigator.tsx` and add the tool entry to the relevant `*_TOOLS` constant in `constants.ts`

### New Features / Tools

When adding a new tool:

1. Create `src/screens/<Feature>/<FeatureScreen>.tsx`
2. Add a route to `AppNavigator.tsx`
3. Add the tool entry to the appropriate `*_TOOLS` constant in `constants.ts` (with an Ionicons `*-outline` icon name)
4. If it needs state, create `src/stores/<Domain>Store.ts` and wire it into `RootStore`

---

## Code Conventions

### TypeScript

- Strict mode is on — no implicit `any`, no non-null assertions without justification
- Use Zod for runtime validation at data boundaries (SQLite, AsyncStorage, JSON files)
- Type files live in `src/types/<domain>-types.ts`

### ESLint / Prettier

- Import order is **enforced**: builtin → external → internal → parent → sibling → index (alphabetical within each group)
- Prettier: 80-char width, 2-space indent, single quotes, trailing commas, no semicolons override (default on)
- Run `npm run lint` before committing; violations block CI

### Icons

- Always use Ionicons **outline** variants (e.g., `"flashlight-outline"`, not `"flashlight"`)

### Styles

- Define styles with `StyleSheet.create()` at the bottom of each file
- Don't share StyleSheet objects across files; co-locate styles with their component
- At no point should the content ever bleed into the bottom tab bar (`TabBar`, height `FOOTER_HEIGHT`). Wrap screen content in `ScreenBody` for consistent layout, but do not assume it automatically applies tab-bar-height bottom padding; add the required bottom spacing explicitly on screens that render above the tab bar.

---

## Testing

- Test files: `<name>.test.ts` or `<name>.test.tsx`, co-located or in `__mocks__/`
- Mocks for native modules live in `__mocks__/` at the repo root
- Transform ignore patterns cover: `uuid`, `react-native-sensors`, `react-native-maps`, `astronomia`
- Don't mock SQLite stores in integration tests — the prior approach caused prod/mock divergence

---

## Known Pre-existing Issues

None currently tracked. `npm run typecheck` passes with zero errors — keep it
that way, and add an entry here if you knowingly leave one behind.

---

## What NOT to Do

- Do not make network requests — this app is fully offline
- Do not use `useTheme()` inside containers or non-component utility code; use the `COLORS` constant
- Do not recreate service/repo/store instances on each render — use `useMemo` in containers
- Do not add `makeObservable` manual decorators; use `makeAutoObservable`
- Do not hardcode colors, spacing, or font sizes — use theme/constants
