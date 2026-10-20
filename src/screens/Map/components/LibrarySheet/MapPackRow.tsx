import { MenuView } from '@react-native-menu/menu';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AppButton from '../../../../components/AppButton';
import { useTheme } from '../../../../hooks/useTheme';
import { formatBytes } from '../../../../navigation/utils/formatBytes';
import { DARK_COLORS } from '../../../../theme/colors';
import {
  describePackStatus,
  formatPackDownloadedDate,
} from '../../../../utils/offlinePacks';
import type { OfflineMapPack } from '../../../../navigation/services/OfflineMapService';

/** Matches IconButton's touch target so the row keeps its shape while busy. */
const TARGET = Platform.OS === 'ios' ? 44 : 48;

type PackAction = 'rename' | 'refresh' | 'delete';

interface MapPackRowProps {
  pack: OfflineMapPack;
  displayName: string;
  /** This row's refresh or delete is running. */
  isBusy: boolean;
  /** Any row's refresh or delete is running; the store runs one at a time. */
  isAnyBusy: boolean;
  onView: (pack: OfflineMapPack) => void;
  onRename: (pack: OfflineMapPack, name: string) => Promise<void>;
  onRefresh: (pack: OfflineMapPack) => void;
  onDelete: (pack: OfflineMapPack) => void;
}

/**
 * One downloaded offline area in the Library sheet's Maps tab. Laid out like
 * TrackRow (name, one line of detail, a View button) with the less frequent
 * actions behind a native overflow menu so the row stays on one line.
 */
export default function MapPackRow({
  pack,
  displayName,
  isBusy,
  isAnyBusy,
  onView,
  onRename,
  onRefresh,
  onDelete,
}: MapPackRowProps) {
  const COLORS = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  // Rename edits in place: Android has no text-input alert, and a modal over
  // a sheet over the map is one layer too many.
  const [draftName, setDraftName] = useState<string | null>(null);

  const meta = [
    `~${pack.metadata.radiusMiles} mi`,
    formatBytes(pack.status?.completedResourceSize ?? 0),
    formatPackDownloadedDate(pack.metadata.createdAt),
    describePackStatus(pack),
  ]
    .filter(Boolean)
    .join(' · ');

  // Renaming is local, so it stays available while another area is being
  // refreshed or deleted; those two wait, since the store runs one at a time.
  const actions = useMemo(
    () => [
      { id: 'rename', title: 'Rename', image: 'pencil' },
      {
        id: 'refresh',
        title: 'Download again',
        image: 'arrow.clockwise',
        attributes: { disabled: isAnyBusy },
      },
      {
        id: 'delete',
        title: 'Delete',
        image: 'trash',
        attributes: { destructive: true, disabled: isAnyBusy },
      },
    ],
    [isAnyBusy],
  );

  const handleAction = (action: PackAction) => {
    switch (action) {
      case 'rename':
        setDraftName(displayName);
        break;
      case 'refresh':
        onRefresh(pack);
        break;
      case 'delete':
        onDelete(pack);
        break;
    }
  };

  const saveName = async () => {
    if (draftName === null) {
      return;
    }
    try {
      await onRename(pack, draftName);
      setDraftName(null);
    } catch {
      Alert.alert(
        'Rename Failed',
        'Could not rename this map. Please try again.',
      );
    }
  };

  if (draftName !== null) {
    return (
      <View style={styles.row}>
        <TextInput
          value={draftName}
          onChangeText={setDraftName}
          onSubmitEditing={saveName}
          style={styles.input}
          maxLength={40}
          autoFocus
          selectTextOnFocus
          returnKeyType="done"
          accessibilityLabel="Offline area name"
          placeholder="Area name"
          placeholderTextColor={COLORS.MUTED}
        />
        <AppButton
          label="Cancel"
          size="small"
          variant="plain"
          onPress={() => setDraftName(null)}
          style={styles.action}
        />
        <AppButton
          label="Save"
          size="small"
          tint={COLORS.SECONDARY_ACCENT}
          onPress={saveName}
          style={styles.action}
        />
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <AppButton
        label="View"
        size="small"
        tint={COLORS.SECONDARY_ACCENT}
        onPress={() => onView(pack)}
        accessibilityLabel={`View ${displayName} on map`}
        style={styles.action}
      />
      {isBusy ? (
        <View
          style={styles.trailing}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`Updating ${displayName}`}
          accessibilityState={{ busy: true }}
        >
          <ActivityIndicator size="small" color={COLORS.BRAND} />
        </View>
      ) : (
        <MenuView
          title={displayName}
          actions={actions}
          onPressAction={({ nativeEvent }) =>
            handleAction(nativeEvent.event as PackAction)
          }
          themeVariant={COLORS === DARK_COLORS ? 'dark' : 'light'}
        >
          {/* Not a Touchable: the native menu owns the tap. */}
          <View
            style={styles.trailing}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`More actions for ${displayName}`}
            accessibilityHint="Opens a menu"
          >
            <Icon
              name="ellipsis-horizontal-circle-outline"
              size={22}
              color={COLORS.SECONDARY_ACCENT}
            />
          </View>
        </MenuView>
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingLeft: 16,
      paddingRight: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.SECONDARY_ACCENT,
    },
    info: {
      flex: 1,
      marginRight: 8,
    },
    name: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.PRIMARY_DARK,
    },
    meta: {
      fontSize: 12,
      color: colors.SECONDARY_ACCENT,
      marginTop: 2,
    },
    action: {
      marginLeft: 6,
    },
    trailing: {
      width: TARGET,
      height: TARGET,
      alignItems: 'center',
      justifyContent: 'center',
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.BORDER,
      borderRadius: 8,
      color: colors.PRIMARY_DARK,
      paddingHorizontal: 10,
      paddingVertical: 6,
      fontSize: 14,
    },
  });
}
