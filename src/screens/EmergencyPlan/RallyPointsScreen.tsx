import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { Alert, Platform, StyleSheet } from 'react-native';
import GroupContainer from '../../components/GroupContainer';
import IconButton from '../../components/IconButton';
import ModuleRow from '../../components/ModuleRow';
import { Text } from '../../components/ScaledText';
import StackScreen from '../../components/StackScreen';
import { useTheme } from '../../hooks/useTheme';
import { useEmergencyPlanStore } from '../../stores';
import { TEXT_GUTTER } from '../../theme';
import { ImportModal } from './ImportModal';
import { parseSharedRallyPoints, shareRallyPoints } from './shareUtils';

const isAndroid = Platform.OS === 'android';

/**
 * Lists all rally points with options to add, share, or import them.
 *
 * Share exports all rally points as JSON via the native share sheet.
 * Import accepts the same JSON string pasted from a recipient.
 *
 * @returns The rally points list screen.
 */
export default observer(function RallyPointsScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const store = useEmergencyPlanStore();
  const COLORS = useTheme();
  const [importVisible, setImportVisible] = useState(false);

  const rallyPoints = store.rallyPoints;

  const handleShare = async () => {
    if (store.rallyPoints.length === 0) {
      Alert.alert('Nothing to share', 'Add at least one rally point first.');
      return;
    }
    try {
      await shareRallyPoints(store.rallyPoints);
    } catch {
      // User cancelled or share failed — no-op
    }
  };

  const handleImport = async (raw: string) => {
    const points = parseSharedRallyPoints(raw);
    if (!points || points.length === 0) {
      Alert.alert(
        'Invalid data',
        'The pasted text is not a valid Cold Boot rally-points share.',
      );
      return;
    }
    let added = 0;
    for (const point of points) {
      try {
        await store.createRallyPoint(
          point.name,
          point.description,
          point.coordinates,
        );
        added++;
      } catch {
        // Skip duplicates or invalid entries
      }
    }
    setImportVisible(false);
    if (added === 0) {
      Alert.alert(
        'Import failed',
        'The data was valid but could not be saved. Please try again.',
      );
    } else {
      Alert.alert(
        'Import complete',
        `${added} rally point${added !== 1 ? 's' : ''} imported.`,
      );
    }
  };

  return (
    <StackScreen
      title="Rally Points"
      subtitle={`${rallyPoints.length} location${rallyPoints.length === 1 ? '' : 's'}`}
      trailing={
        <>
          <IconButton
            name="download-outline"
            size={22}
            accessibilityLabel="Import rally points"
            onPress={() => setImportVisible(true)}
          />
          <IconButton
            name="share-outline"
            size={22}
            accessibilityLabel="Share rally points"
            onPress={handleShare}
          />
          <IconButton
            name="add-circle-outline"
            size={22}
            accessibilityLabel="Add rally point"
            onPress={() => navigation.navigate('NewRallyPoint')}
          />
        </>
      }
    >
      {rallyPoints.length === 0 ? (
        <Text
          style={[
            styles.emptyText,
            { color: isAndroid ? COLORS.MUTED : COLORS.MUTED_ON_GROUND },
          ]}
        >
          No rally points yet. Add a meeting location to get started.
        </Text>
      ) : (
        <GroupContainer>
          {rallyPoints.map((point, index) => (
            <ModuleRow
              key={point.id}
              title={point.name}
              icon="location-outline"
              subtitle={
                point.coordinates
                  ? `${point.description}. ${point.coordinates}`
                  : point.description
              }
              variant="tool"
              showSeparator={index < rallyPoints.length - 1}
              onPress={() =>
                navigation.navigate('EditRallyPoint', { rallyPoint: point })
              }
            />
          ))}
        </GroupContainer>
      )}

      <ImportModal
        visible={importVisible}
        title="Import Rally Points"
        hint="Paste the share code received from another Cold Boot user."
        onClose={() => setImportVisible(false)}
        onImport={handleImport}
      />
    </StackScreen>
  );
});

const styles = StyleSheet.create({
  emptyText: {
    fontSize: 16,
    paddingHorizontal: isAndroid ? TEXT_GUTTER : 0,
  },
});
