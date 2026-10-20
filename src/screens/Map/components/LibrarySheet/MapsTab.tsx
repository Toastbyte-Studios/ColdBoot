import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppButton from '../../../../components/AppButton';
import { useTheme } from '../../../../hooks/useTheme';
import {
  useOfflineMapLibraryStore,
  useSettingsStore,
} from '../../../../stores/StoreContext';
import { getValidRegionMetadata } from '../../../../utils/offlinePacks';
import MapPackRow from './MapPackRow';
import type { OfflineMapPack } from '../../../../navigation/services/OfflineMapService';
import type { PackRegion } from '../../../../utils/offlinePacks';

interface MapsTabProps {
  /** Shows a downloaded area on the map. */
  onViewRegion: (region: PackRegion) => void;
  /**
   * Starts the "Download your area" flow. The tab is the only place that
   * offers it: the empty state, or the button after the list.
   */
  onDownload: () => void;
}

/**
 * The Library sheet's Maps tab: the offline areas downloaded on this device,
 * read from OfflineMapLibraryStore.
 */
export default observer(function MapsTab({
  onViewRegion,
  onDownload,
}: MapsTabProps) {
  const COLORS = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const library = useOfflineMapLibraryStore();
  const settingsStore = useSettingsStore();
  const [loadFailed, setLoadFailed] = React.useState(false);

  // Re-read on every visit: a download may have finished since the last one,
  // and the list is a cheap read of MapLibre's local database.
  useEffect(() => {
    let isCurrent = true;
    library.load().catch((error) => {
      console.error('Failed to load offline maps:', error);
      if (isCurrent) {
        setLoadFailed(true);
      }
    });
    return () => {
      isCurrent = false;
    };
  }, [library]);

  const handleView = useCallback(
    (pack: OfflineMapPack) => {
      const region = getValidRegionMetadata(pack);
      if (!region) {
        Alert.alert(
          'Area Unavailable',
          'This offline map is missing the location data needed to reopen it. Delete it and download it again.',
        );
        return;
      }
      onViewRegion(region);
    },
    [onViewRegion],
  );

  const handleRename = useCallback(
    (pack: OfflineMapPack, name: string) => library.renamePack(pack.id, name),
    [library],
  );

  const handleRefresh = useCallback(
    (pack: OfflineMapPack) => {
      const displayName = library.displayName(pack);
      Alert.alert(
        'Refresh Offline Map',
        `Refreshing "${displayName}" downloads it again with fresh tiles, then replaces the existing copy. This re-incurs the download size. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Refresh',
            onPress: async () => {
              try {
                const result = await library.refreshPack(pack, {
                  highDetail: settingsStore.highDetailOffline,
                });
                if (result === 'missing-region') {
                  Alert.alert(
                    'Refresh Unavailable',
                    'This offline map is missing the location data needed to refresh it. Delete it and download it again.',
                  );
                }
              } catch (error) {
                console.error('Failed to refresh offline pack:', error);
                Alert.alert(
                  'Refresh Failed',
                  'Could not refresh this map. Your existing offline map was kept. Please try again.',
                );
              }
            },
          },
        ],
      );
    },
    [library, settingsStore],
  );

  const handleDelete = useCallback(
    (pack: OfflineMapPack) => {
      const displayName = library.displayName(pack);
      Alert.alert(
        'Delete Offline Map',
        `Delete "${displayName}"? This frees up the storage it uses. You can download it again later.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await library.deletePack(pack);
              } catch (error) {
                console.error('Failed to delete offline pack:', error);
                Alert.alert(
                  'Delete Failed',
                  'Could not delete this map. Please try again.',
                );
              }
            },
          },
        ],
      );
    },
    [library],
  );

  // Nothing until the first read settles, so the empty state doesn't flash
  // for someone who has maps.
  if (!library.hasLoaded) {
    return <View style={styles.list} />;
  }

  if (loadFailed) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>
          Could not load offline maps. Close and reopen the Library to try
          again.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.list}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      {library.packs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No offline maps yet. Download your area so the map keeps working
            without a signal.
          </Text>
          <AppButton
            label="Download your area"
            icon="download-outline"
            size="small"
            tint={COLORS.SECONDARY_ACCENT}
            onPress={onDownload}
          />
        </View>
      ) : (
        <>
          {library.packs.map((pack) => (
            <MapPackRow
              key={pack.id}
              pack={pack}
              displayName={library.displayName(pack)}
              isBusy={library.busyPackId === pack.id}
              isAnyBusy={library.isBusy}
              onView={handleView}
              onRename={handleRename}
              onRefresh={handleRefresh}
              onDelete={handleDelete}
            />
          ))}
          <View style={styles.footer}>
            <AppButton
              label="Download another area"
              icon="download-outline"
              size="small"
              variant="plain"
              tint={COLORS.SECONDARY_ACCENT}
              onPress={onDownload}
            />
          </View>
        </>
      )}
    </ScrollView>
  );
});

function makeStyles(colors: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    list: {
      flex: 1,
    },
    emptyState: {
      paddingHorizontal: 24,
      paddingVertical: 32,
      alignItems: 'center',
      gap: 16,
    },
    footer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      alignItems: 'flex-start',
    },
    emptyStateText: {
      fontSize: 14,
      color: colors.SECONDARY_ACCENT,
      textAlign: 'center',
    },
  });
}
