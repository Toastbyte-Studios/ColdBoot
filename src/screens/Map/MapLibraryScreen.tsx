import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import AppButton from '../../components/AppButton';
import GroupContainer from '../../components/GroupContainer';
import IconButton from '../../components/IconButton';
import ModuleRow from '../../components/ModuleRow';
import { Text } from '../../components/ScaledText';
import StackScreen from '../../components/StackScreen';
import { useTheme } from '../../hooks/useTheme';
import { type OfflineMapPack } from '../../navigation/services/OfflineMapService';
import { formatBytes } from '../../navigation/utils/formatBytes';
import { useOfflineMapLibraryStore, useSettingsStore } from '../../stores';
import { withAlpha } from '../../theme/colorUtils';
import {
  describePackStatus,
  formatPackDownloadedDate,
  getValidRegionMetadata,
} from '../../utils/offlinePacks';

type RenameState = {
  packId: string;
  value: string;
};

type MapLibraryRoutes = {
  MapScreen:
    | {
        center: { latitude: number; longitude: number };
        radiusMiles: number;
      }
    | undefined;
  DownloadArea: undefined;
};

type MapLibraryNavigationProp = NativeStackNavigationProp<MapLibraryRoutes>;

function makeStyles(COLORS: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    content: {
      gap: 12,
      paddingBottom: 12,
    },
    actions: {
      flexDirection: 'row',
      // Icons sit at the trailing edge: the row's title is the subject, and
      // these act on it, so they read as its controls rather than as a menu.
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingBottom: 12,
      gap: 4,
    },
    busyIndicator: {
      // Matches IconButton's touch target so nothing shifts while busy.
      width: Platform.OS === 'ios' ? 44 : 48,
      height: Platform.OS === 'ios' ? 44 : 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyCard: {
      borderWidth: 1,
      borderColor: COLORS.BORDER,
      borderRadius: 12,
      backgroundColor: COLORS.SURFACE,
      padding: 16,
      gap: 12,
      alignItems: 'flex-start',
    },
    emptyTitle: {
      color: COLORS.PRIMARY_DARK,
      fontSize: 16,
      fontWeight: '700',
    },
    emptyBody: {
      color: COLORS.MUTED,
      lineHeight: 20,
    },
    renameOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: withAlpha(COLORS.PRIMARY_DARK, 0.45),
      padding: 20,
    },
    renameCard: {
      width: '100%',
      maxWidth: 420,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.BORDER,
      backgroundColor: COLORS.BACKGROUND,
      padding: 16,
      gap: 12,
    },
    renameTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: COLORS.PRIMARY_DARK,
    },
    renameInput: {
      borderWidth: 1,
      borderColor: COLORS.BORDER,
      borderRadius: 8,
      color: COLORS.PRIMARY_DARK,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    renameActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
    },
  });
}

function MapLibraryScreen() {
  const navigation = useNavigation<MapLibraryNavigationProp>();
  const COLORS = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const settingsStore = useSettingsStore();
  const library = useOfflineMapLibraryStore();

  const [refreshing, setRefreshing] = useState(false);
  const [renameState, setRenameState] = useState<RenameState | null>(null);

  useEffect(() => {
    let cancelled = false;
    library.load().catch((error) => {
      console.error('Failed to load map library:', error);
      if (!cancelled) {
        Alert.alert(
          'Could Not Load Maps',
          'Something went wrong reading your downloaded maps. Please try again.',
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [library]);

  const { packs } = library;

  const subtitle = useMemo(() => {
    const label = `${packs.length} area${packs.length === 1 ? '' : 's'}`;
    return `${label} · ${formatBytes(library.totalBytes)}`;
  }, [packs.length, library.totalBytes]);

  const handleRefreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await library.load();
    } finally {
      setRefreshing(false);
    }
  }, [library]);

  const performDelete = useCallback(
    async (pack: OfflineMapPack) => {
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
    [library],
  );

  const confirmDelete = useCallback(
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
            onPress: () => performDelete(pack),
          },
        ],
      );
    },
    [library, performDelete],
  );

  const performRefresh = useCallback(
    async (pack: OfflineMapPack) => {
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
    [library, settingsStore.highDetailOffline],
  );

  const confirmRefresh = useCallback(
    (pack: OfflineMapPack) => {
      const displayName = library.displayName(pack);
      Alert.alert(
        'Refresh Offline Map',
        `Refreshing "${displayName}" downloads it again with fresh tiles, then replaces the existing copy. This re-incurs the download size. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Refresh',
            onPress: () => performRefresh(pack),
          },
        ],
      );
    },
    [library, performRefresh],
  );

  const openRename = useCallback(
    (pack: OfflineMapPack) => {
      setRenameState({ packId: pack.id, value: library.displayName(pack) });
    },
    [library],
  );

  const cancelRename = useCallback(() => {
    setRenameState(null);
  }, []);

  const saveRename = useCallback(async () => {
    if (!renameState) {
      return;
    }
    try {
      await library.renamePack(renameState.packId, renameState.value);
      setRenameState(null);
    } catch (error) {
      console.error('Failed to rename offline pack:', error);
      Alert.alert(
        'Rename Failed',
        'Could not rename this map. Please try again.',
      );
    }
  }, [library, renameState]);

  return (
    <StackScreen title="Map Library" subtitle={subtitle}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefreshAll}
            tintColor={COLORS.PRIMARY_DARK}
          />
        }
      >
        {!library.hasLoaded ? null : packs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No offline areas yet</Text>
            <Text style={styles.emptyBody}>
              Download your area so the map keeps working without a signal.
            </Text>
            <AppButton
              label="Download your area"
              icon="download-outline"
              onPress={() => navigation.navigate('DownloadArea')}
            />
          </View>
        ) : (
          packs.map((pack) => {
            const displayName = library.displayName(pack);
            const isBusy = library.busyPackId === pack.id;
            const isAnyBusy = library.isBusy;
            const sizeText = formatBytes(
              pack.status?.completedResourceSize ?? 0,
            );
            const status = describePackStatus(pack);
            const subtitleParts = [
              `~${pack.metadata.radiusMiles} mi radius`,
              sizeText,
              `downloaded ${formatPackDownloadedDate(pack.metadata.createdAt)}`,
              status,
            ].filter(Boolean);

            return (
              <GroupContainer key={pack.id}>
                <ModuleRow
                  variant="tool"
                  icon="albums-outline"
                  title={displayName}
                  subtitle={subtitleParts.join(' · ')}
                  showSeparator={false}
                  onPress={() => {
                    const regionMetadata = getValidRegionMetadata(pack);
                    if (!regionMetadata) {
                      Alert.alert(
                        'Area Unavailable',
                        'This offline map is missing the location data needed to reopen it. Delete it and download it again.',
                      );
                      return;
                    }
                    navigation.navigate('MapScreen', regionMetadata);
                  }}
                />
                <View style={styles.actions}>
                  <IconButton
                    name="create-outline"
                    accessibilityLabel={`Rename ${displayName}`}
                    onPress={() => openRename(pack)}
                    disabled={isAnyBusy}
                  />
                  {/* The spinner replaces the glyph in place, so the row of
                      actions keeps its width while a refresh runs. */}
                  {isBusy ? (
                    <View
                      style={styles.busyIndicator}
                      accessible
                      accessibilityRole="progressbar"
                      accessibilityLabel={`Refreshing ${displayName}`}
                      accessibilityState={{ busy: true }}
                    >
                      <ActivityIndicator size="small" color={COLORS.BRAND} />
                    </View>
                  ) : (
                    <IconButton
                      name="refresh-outline"
                      accessibilityLabel={`Refresh ${displayName}`}
                      onPress={() => confirmRefresh(pack)}
                      disabled={isAnyBusy}
                    />
                  )}
                  <IconButton
                    name="trash-outline"
                    color={COLORS.ERROR}
                    accessibilityLabel={`Delete ${displayName}`}
                    onPress={() => confirmDelete(pack)}
                    disabled={isAnyBusy}
                  />
                </View>
              </GroupContainer>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={renameState !== null}
        transparent
        animationType="fade"
        onRequestClose={cancelRename}
      >
        <View style={styles.renameOverlay}>
          <View style={styles.renameCard}>
            <Text style={styles.renameTitle}>Rename Area</Text>
            <TextInput
              value={renameState?.value ?? ''}
              onChangeText={(value) =>
                setRenameState((current) =>
                  current ? { ...current, value } : current,
                )
              }
              style={styles.renameInput}
              maxLength={40}
              autoFocus
              accessibilityLabel="Offline area name"
              placeholder="Area name"
              placeholderTextColor={COLORS.MUTED}
            />
            <View style={styles.renameActions}>
              <AppButton
                label="Cancel"
                variant="plain"
                onPress={cancelRename}
              />
              <AppButton label="Save" onPress={saveRename} />
            </View>
          </View>
        </View>
      </Modal>
    </StackScreen>
  );
}

export default observer(MapLibraryScreen);
