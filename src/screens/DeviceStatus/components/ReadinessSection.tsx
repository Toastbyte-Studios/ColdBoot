import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import GroupContainer from '../../../components/GroupContainer';
import ModuleRow from '../../../components/ModuleRow';
import SectionEyebrow from '../../../components/SectionEyebrow';
import { useSettingsSheet } from '../../../components/SettingsSheetContext';
import { useTheme } from '../../../hooks/useTheme';
import { SPACING } from '../../../theme';
import { ReadinessAction, ReadinessStatus } from '../readiness';
import { useReadinessItems } from '../useReadinessItems';

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
  const items = useReadinessItems();
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
