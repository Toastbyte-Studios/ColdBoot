import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import GroupContainer from '../../../components/GroupContainer';
import ModuleRow from '../../../components/ModuleRow';
import SectionEyebrow from '../../../components/SectionEyebrow';
import { useSettingsSheet } from '../../../components/SettingsSheetContext';
import { useTheme } from '../../../hooks/useTheme';
import { LOCATION_PERMISSION_DENIED } from '../../../stores/CoreStore';
import {
  useCoreStore,
  useEmergencyPlanStore,
  useOfflineMapLibraryStore,
  useSettingsStore,
} from '../../../stores/StoreContext';
import { SPACING } from '../../../theme';
import { getValidRegionMetadata } from '../../../utils/offlinePacks';
import { ReadinessAction, readinessItems, ReadinessStatus } from '../readiness';

const STATUS_ICON: Record<ReadinessStatus, string> = {
  ready: 'checkmark-circle-outline',
  attention: 'alert-circle-outline',
  missing: 'close-circle-outline',
  unknown: 'ellipsis-horizontal-circle-outline',
};

/**
 * Off-grid readiness: a short checklist of what to sort out while there is
 * still signal and power. Each item says where it stands and, when it needs
 * attention, opens the place that fixes it.
 */
const ReadinessSection = observer(() => {
  const COLORS = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { openSettings } = useSettingsSheet();
  const core = useCoreStore();
  const maps = useOfflineMapLibraryStore();
  const settings = useSettingsStore();
  const plan = useEmergencyPlanStore();

  useEffect(() => {
    if (!maps.hasLoaded && !maps.loading) {
      maps.load().catch(() => {
        // Left as "Checking…" rather than claiming there are no maps.
      });
    }
  }, [maps]);

  const fix = core.lastFix?.coords ?? null;
  const items = readinessItems({
    fix: fix ? { latitude: fix.latitude, longitude: fix.longitude } : null,
    locationDenied: core.locationError === LOCATION_PERMISSION_DENIED,
    mapsLoaded: maps.hasLoaded && !maps.loadFailed,
    mapsLoadFailed: maps.loadFailed,
    packs: maps.packs
      .filter((pack) => pack.status?.state === 'complete')
      .map((pack) => ({
        name: maps.displayName(pack),
        region: getValidRegionMetadata(pack),
      })),
    lastBackupAt: settings.lastBackupAt,
    plan: {
      contacts: plan.contacts.length,
      rallyPoints: plan.rallyPoints.length,
      hasCommsPlan:
        plan.communicationPlan.updatedAt > 0 &&
        [
          plan.communicationPlan.whoCallsWhom,
          plan.communicationPlan.ifPhonesDown,
          plan.communicationPlan.outOfAreaContact,
          plan.communicationPlan.checkInSchedule,
        ].some((value) => value.trim().length > 0),
    },
  });
  const readyCount = items.filter((item) => item.status === 'ready').length;

  const statusColor: Record<ReadinessStatus, string> = {
    ready: COLORS.SUCCESS,
    attention: COLORS.ACCENT,
    missing: COLORS.ERROR,
    unknown: COLORS.MUTED,
  };

  const run = (action: ReadinessAction) => {
    switch (action) {
      case 'offline-maps':
        navigation.navigate('MapScreen', { library: 'maps' });
        break;
      case 'emergency-plan':
        navigation.navigate('EmergencyPlan');
        break;
      case 'backup':
        openSettings();
        break;
      case 'system-settings':
        Linking.openSettings();
        break;
    }
  };

  return (
    <View style={styles.section}>
      <SectionEyebrow>{`Off-grid readiness · ${readyCount} of ${items.length}`}</SectionEyebrow>
      <GroupContainer>
        {items.map((item, index) => {
          const action = item.action;
          return (
            <ModuleRow
              key={item.id}
              variant="tool"
              title={item.title}
              subtitle={item.detail}
              icon={STATUS_ICON[item.status]}
              iconColor={statusColor[item.status]}
              onPress={action ? () => run(action) : undefined}
              showSeparator={index < items.length - 1}
            />
          );
        })}
      </GroupContainer>
    </View>
  );
});

export default ReadinessSection;

const styles = StyleSheet.create({
  section: {
    marginBottom: SPACING.xl,
  },
});
