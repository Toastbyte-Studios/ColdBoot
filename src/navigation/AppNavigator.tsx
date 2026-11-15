import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { JSX } from 'react';
import BootSplash from 'react-native-bootsplash';
import AppShell from '../components/AppShell';
import HomeScreen from '../screens/HomeScreen/HomeScreen';
import {
  NavigationHistoryProvider,
  useNavigationHistory,
} from './NavigationHistoryContext';
import { navigationRef } from './navigationRef';
import type { DownloadAreaParams } from '../screens/Map/components/offline/DownloadConfirmScreen';

const Stack = createNativeStackNavigator();

/*
 * Screens load on first use.
 *
 * Every route except Home is registered with `getComponent` and an inline
 * `require`, not a top-level import with `component`. Importing all of them
 * here made launch evaluate every screen's module (and everything each one
 * imports: the map library, the reference data, the audio modules) before
 * Home could draw. Now a screen's code runs the first time something
 * navigates to it.
 *
 * To add a route, follow the same shape:
 *
 *   <Stack.Screen
 *     name="MyTool"
 *     getComponent={() => require('../screens/MyTool/MyToolScreen').default}
 *   />
 *
 * The path must be a string literal: Metro resolves `require` at build time.
 * Home stays a normal import because it is always the first screen.
 */

/**
 * NavigatorContent is the internal component that uses the NavigationHistory context.
 *
 * This component is separated from AppNavigator to allow it to access the NavigationHistory
 * context that is provided by NavigationHistoryProvider.
 *
 * @returns {JSX.Element} The navigation container with the configured stack navigator.
 */
function NavigatorContent(): JSX.Element {
  const navigationHistory = useNavigationHistory();

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={async () => {
        try {
          await BootSplash.hide({ fade: true });
        } catch (error) {
          console.warn('Failed to hide BootSplash', error);
        }
      }}
      onStateChange={() => navigationHistory.onNavigationStateChange()}
    >
      <AppShell>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: 'transparent',
            },
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          {/* Modules */}
          <Stack.Screen
            name="CoreModule"
            getComponent={() => require('../modules/Core/CoreModule').default}
          />
          <Stack.Screen
            name="NavigationModule"
            getComponent={() =>
              require('../modules/Navigation/NavigationModule').default
            }
          />
          <Stack.Screen
            name="ReferenceModule"
            getComponent={() =>
              require('../modules/Reference/ReferenceModule').default
            }
          />
          <Stack.Screen
            name="CommunicationsModule"
            getComponent={() =>
              require('../modules/Communications/CommunicationsModule').default
            }
          />
          <Stack.Screen
            name="PrepperModule"
            getComponent={() =>
              require('../modules/Prepper/PrepperModule').default
            }
          />
          <Stack.Screen
            name="EarthModule"
            getComponent={() => require('../modules/Earth/EarthModule').default}
          />
          {/* Navigation Module Screens */}
          <Stack.Screen
            name="MapScreen"
            getComponent={() => require('../screens/Map/MapScreen').default}
          />
          <Stack.Screen
            name="StarMap"
            getComponent={() =>
              require('../screens/StarMap/StarMapScreen').default
            }
          />
          <Stack.Screen
            name="GridReference"
            getComponent={() =>
              require('../screens/GridReference/GridReferenceScreen').default
            }
          />
          <Stack.Screen
            name="DownloadArea"
            options={{
              presentation: 'modal',
              gestureEnabled: true,
              gestureDirection: 'vertical',
            }}
          >
            {({ navigation, route }) => {
              // Loaded on first use, like the other screens; see `lazy`
              // note above the navigator.
              const DownloadConfirmScreen =
                require('../screens/Map/components/offline/DownloadConfirmScreen').default;
              return (
                <DownloadConfirmScreen
                  {...(route.params as DownloadAreaParams | undefined)}
                  onDismiss={() => navigation.goBack()}
                />
              );
            }}
          </Stack.Screen>
          {/* Shared */}
          <Stack.Screen
            name="Search"
            getComponent={() =>
              require('../screens/Common/SearchScreen').default
            }
          />
          {/* Communications Module */}
          <Stack.Screen
            name="MorseCode"
            getComponent={() =>
              require('../screens/MorseCode/MorseCodeScreen').default
            }
          />
          <Stack.Screen
            name="AlphaToMorse"
            getComponent={() =>
              require('../screens/MorseCode/AlphaToMorseScreen').default
            }
          />
          <Stack.Screen
            name="MorseToAlpha"
            getComponent={() =>
              require('../screens/MorseCode/MorseToAlphaScreen').default
            }
          />
          <Stack.Screen
            name="MorseCodeCheatSheet"
            getComponent={() =>
              require('../screens/MorseCode/MorseCodeCheatSheet').default
            }
          />
          <Stack.Screen
            name="MorseTrainer"
            getComponent={() =>
              require('../screens/MorseCode/MorseTrainerScreen').default
            }
          />
          <Stack.Screen
            name="MorseTrainerLevel"
            getComponent={() =>
              require('../screens/MorseCode/MorseTrainerLevelScreen').default
            }
          />
          <Stack.Screen
            name="NatoPhonetic"
            getComponent={() =>
              require('../screens/MorseCode/NatoPhoneticScreen').default
            }
          />
          <Stack.Screen
            name="RadioFrequencies"
            getComponent={() =>
              require('../screens/RadioFrequencies/RadioFrequenciesScreen')
                .default
            }
          />
          <Stack.Screen
            name="RadioFrequencyDetail"
            getComponent={() =>
              require('../screens/RadioFrequencies/RadioFrequencyDetailScreen')
                .default
            }
          />
          <Stack.Screen
            name="RepeaterBook"
            getComponent={() =>
              require('../screens/RepeaterBook/RepeaterBookScreen').default
            }
          />
          <Stack.Screen
            name="RepeaterDetail"
            getComponent={() =>
              require('../screens/RepeaterBook/RepeaterDetailScreen').default
            }
          />
          <Stack.Screen
            name="AddCustomRepeater"
            getComponent={() =>
              require('../screens/RepeaterBook/AddCustomRepeaterScreen').default
            }
          />
          <Stack.Screen
            name="DecibelMeter"
            getComponent={() =>
              require('../screens/DecibelMeter/DecibelMeterScreen').default
            }
          />
          <Stack.Screen
            name="DigitalWhistle"
            getComponent={() =>
              require('../screens/DigitalWhistle/DigitalWhistleScreen').default
            }
          />
          <Stack.Screen
            name="GroundToAirSignals"
            getComponent={() =>
              require('../screens/SignalMirror/GroundToAirSignalsScreen')
                .default
            }
          />
          {/* Core Module */}
          <Stack.Screen
            name="ColdWeather"
            getComponent={() =>
              require('../screens/ColdWeather/ColdWeatherScreen').default
            }
          />
          <Stack.Screen
            name="DeviceStatus"
            getComponent={() =>
              require('../screens/DeviceStatus/DeviceStatusScreen').default
            }
          />
          <Stack.Screen
            name="Flashlight"
            getComponent={() =>
              require('../screens/Flashlight/FlashlightScreen').default
            }
          />
          <Stack.Screen
            name="Nightvision"
            getComponent={() =>
              require('../screens/Flashlight/NightvisionScreen').default
            }
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="VoiceLog"
            getComponent={() =>
              require('../screens/VoiceLog/VoiceLogScreen').default
            }
          />
          <Stack.Screen
            name="NewNote"
            getComponent={() =>
              require('../screens/Notepad/NewNoteScreen').default
            }
          />
          <Stack.Screen
            name="EditNote"
            getComponent={() =>
              require('../screens/Notepad/EditNoteScreen').default
            }
          />
          <Stack.Screen
            name="Notepad"
            getComponent={() =>
              require('../screens/Notepad/NotepadScreen').default
            }
          />
          <Stack.Screen
            name="NoteCategory"
            getComponent={() =>
              require('../screens/Notepad/Shared/NoteCategoryScreen').default
            }
          />
          <Stack.Screen
            name="NoteEntry"
            getComponent={() =>
              require('../screens/Notepad/Shared/NoteEntryScreen').default
            }
          />
          <Stack.Screen
            name="RecentNotes"
            getComponent={() =>
              require('../screens/Notepad/RecentNotesScreen').default
            }
          />
          <Stack.Screen
            name="BookmarkedNotes"
            getComponent={() =>
              require('../screens/Notepad/BookmarkedNotesScreen').default
            }
          />
          <Stack.Screen
            name="ManageCategories"
            getComponent={() =>
              require('../screens/Notepad/ManageCategoriesScreen').default
            }
          />
          <Stack.Screen
            name="Checklist"
            getComponent={() =>
              require('../screens/Checklist/ChecklistScreen').default
            }
          />
          <Stack.Screen
            name="NewChecklist"
            getComponent={() =>
              require('../screens/Checklist/NewChecklistScreen').default
            }
          />
          <Stack.Screen
            name="ChecklistEntry"
            getComponent={() =>
              require('../screens/Checklist/ChecklistEntryScreen').default
            }
          />
          {/* Earth Module */}
          <Stack.Screen
            name="SunTime"
            getComponent={() =>
              require('../screens/SunTime/SunTimeScreen').default
            }
          />
          <Stack.Screen
            name="LunarCycles"
            getComponent={() =>
              require('../screens/LunarCycles/LunarCyclesScreen').default
            }
          />
          <Stack.Screen
            name="BarometricPressure"
            getComponent={() =>
              require('../screens/BarometricPressure/BarometricPressureScreen')
                .default
            }
          />
          <Stack.Screen
            name="SeasonalOutlook"
            getComponent={() =>
              require('../screens/SeasonalOutlook/SeasonalOutlookScreen')
                .default
            }
          />
          <Stack.Screen
            name="SkyEvents"
            getComponent={() =>
              require('../screens/SkyEvents/SkyEventsScreen').default
            }
          />
          {/* Unit Conversion */}
          <Stack.Screen
            name="UnitConversion"
            getComponent={() =>
              require('../screens/UnitConversion/UnitConversionScreen').default
            }
          />
          <Stack.Screen
            name="ConversionCategory"
            getComponent={() =>
              require('../screens/UnitConversion/ConversionCategoryScreen')
                .default
            }
            options={{
              presentation: 'modal',
              gestureEnabled: true,
              gestureDirection: 'vertical',
            }}
          />
          {/* Inventory */}
          <Stack.Screen
            name="Inventory"
            getComponent={() =>
              require('../screens/Inventory/InventoryScreen').default
            }
          />
          <Stack.Screen
            name="InventoryCategory"
            getComponent={() =>
              require('../screens/Inventory/InventoryCategoryScreen').default
            }
          />
          <Stack.Screen
            name="InventoryAllItems"
            getComponent={() =>
              require('../screens/Inventory/InventoryAllItemsScreen').default
            }
          />
          <Stack.Screen
            name="ManageInventoryCategories"
            getComponent={() =>
              require('../screens/Inventory/ManageInventoryCategoriesScreen')
                .default
            }
          />
          <Stack.Screen
            name="NewInventoryItem"
            getComponent={() =>
              require('../screens/Inventory/NewInventoryItemScreen').default
            }
          />
          <Stack.Screen
            name="EditInventoryItem"
            getComponent={() =>
              require('../screens/Inventory/EditInventoryItemScreen').default
            }
          />
          {/* Pantry */}
          <Stack.Screen
            name="Pantry"
            getComponent={() =>
              require('../screens/Pantry/PantryScreen').default
            }
          />
          <Stack.Screen
            name="PantryCategory"
            getComponent={() =>
              require('../screens/Pantry/PantryCategoryScreen').default
            }
          />
          <Stack.Screen
            name="PantryAllItems"
            getComponent={() =>
              require('../screens/Pantry/PantryAllItemsScreen').default
            }
          />
          <Stack.Screen
            name="PantryExpirationTracker"
            getComponent={() =>
              require('../screens/Pantry/PantryExpirationTrackerScreen').default
            }
          />
          <Stack.Screen
            name="ManagePantryCategories"
            getComponent={() =>
              require('../screens/Pantry/ManagePantryCategoriesScreen').default
            }
          />
          <Stack.Screen
            name="NewPantryItem"
            getComponent={() =>
              require('../screens/Pantry/NewPantryItemScreen').default
            }
          />
          <Stack.Screen
            name="EditPantryItem"
            getComponent={() =>
              require('../screens/Pantry/EditPantryItemScreen').default
            }
          />
          {/* Prepper Module */}
          <Stack.Screen
            name="DepletionCalculator"
            getComponent={() =>
              require('../screens/DepletionCalculator/DepletionCalculatorScreen')
                .default
            }
          />
          <Stack.Screen
            name="BarterEstimator"
            getComponent={() =>
              require('../screens/BarterEstimator/BarterEstimatorScreen')
                .default
            }
          />
          {/* Reference Module */}
          <Stack.Screen
            name="Bookmark"
            getComponent={() =>
              require('../screens/Reference/BookmarkScreen').default
            }
          />
          <Stack.Screen
            name="Category"
            getComponent={() =>
              require('../screens/Reference/Shared/CategoryScreen').default
            }
          />
          <Stack.Screen
            name="Entry"
            getComponent={() =>
              require('../screens/Reference/Shared/EntryScreen').default
            }
          />
          <Stack.Screen
            name="Health"
            getComponent={() =>
              require('../screens/Reference/HealthScreen').default
            }
          />
          <Stack.Screen
            name="Survival"
            getComponent={() =>
              require('../screens/Reference/SurvivalScreen').default
            }
          />
          <Stack.Screen
            name="Weather"
            getComponent={() =>
              require('../screens/Reference/WeatherScreen').default
            }
          />
          <Stack.Screen
            name="ToolsAndKnots"
            getComponent={() =>
              require('../screens/Reference/ToolsAndKnotsScreen').default
            }
          />
          <Stack.Screen
            name="Emergency"
            getComponent={() =>
              require('../screens/Reference/EmergencyScreen').default
            }
          />
          <Stack.Screen
            name="Roadside"
            getComponent={() =>
              require('../screens/Reference/RoadsideScreen').default
            }
          />
          <Stack.Screen
            name="HomePrep"
            getComponent={() =>
              require('../screens/Reference/HomePrepScreen').default
            }
          />
          {/* Scenario Cards */}
          <Stack.Screen
            name="ScenarioCards"
            getComponent={() =>
              require('../screens/ScenarioCards/ScenarioCardsScreen').default
            }
          />
          <Stack.Screen
            name="ScenarioCategory"
            getComponent={() =>
              require('../screens/ScenarioCards/ScenarioCategoryScreen').default
            }
          />
          <Stack.Screen
            name="ScenarioDetail"
            getComponent={() =>
              require('../screens/ScenarioCards/ScenarioDetailScreen').default
            }
          />
          <Stack.Screen
            name="ScenarioBookmarks"
            getComponent={() =>
              require('../screens/ScenarioCards/ScenarioBookmarksScreen')
                .default
            }
          />
          {/* Emergency Planner */}
          <Stack.Screen
            name="EmergencyPlan"
            getComponent={() =>
              require('../screens/EmergencyPlan/EmergencyPlanScreen').default
            }
          />
          <Stack.Screen
            name="EmergencyContacts"
            getComponent={() =>
              require('../screens/EmergencyPlan/EmergencyContactsScreen')
                .default
            }
          />
          <Stack.Screen
            name="NewEmergencyContact"
            getComponent={() =>
              require('../screens/EmergencyPlan/NewEmergencyContactScreen')
                .default
            }
          />
          <Stack.Screen
            name="EditEmergencyContact"
            getComponent={() =>
              require('../screens/EmergencyPlan/EditEmergencyContactScreen')
                .default
            }
          />
          <Stack.Screen
            name="RallyPoints"
            getComponent={() =>
              require('../screens/EmergencyPlan/RallyPointsScreen').default
            }
          />
          <Stack.Screen
            name="NewRallyPoint"
            getComponent={() =>
              require('../screens/EmergencyPlan/NewRallyPointScreen').default
            }
          />
          <Stack.Screen
            name="EditRallyPoint"
            getComponent={() =>
              require('../screens/EmergencyPlan/EditRallyPointScreen').default
            }
          />
          <Stack.Screen
            name="CommunicationPlan"
            getComponent={() =>
              require('../screens/EmergencyPlan/CommunicationPlanScreen')
                .default
            }
          />
        </Stack.Navigator>
      </AppShell>
    </NavigationContainer>
  );
}

/**
 * AppNavigator is the root navigation component for the application.
 *
 * It sets up the main navigation stack using React Navigation, defining all the primary screens and modules
 * available in the app. The navigator is wrapped in a `NavigationContainer` and uses a stack-based navigation pattern.
 *
 * @returns {JSX.Element} The navigation container with the configured stack navigator.
 *
 * @remarks
 * - The initial route is set to "Home".
 * - The header is hidden for all screens by default.
 * - Screens are grouped by modules (Core, Navigation, Reference, Communications) and shared screens.
 * - NavigationHistory is provided via context for proper state management.
 *
 * @example
 * ```tsx
 * <AppNavigator />
 * ```
 */
export default function AppNavigator(): JSX.Element {
  return (
    <NavigationHistoryProvider>
      <NavigatorContent />
    </NavigationHistoryProvider>
  );
}
