import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import AppButton from '../../components/AppButton';
import GroupContainer from '../../components/GroupContainer';
import ModuleRow from '../../components/ModuleRow';
import { Text } from '../../components/ScaledText';
import StackScreen from '../../components/StackScreen';
import { useTheme } from '../../hooks/useTheme';
import {
  DEFAULT_OFFLINE_ZOOM,
  HIGH_DETAIL_OFFLINE_ZOOM,
  OfflineMapService,
  type OfflineMapPack,
} from '../../navigation/services/OfflineMapService';
import { boundsFromRadius } from '../../navigation/utils/boundsFromRadius';
import { formatBytes } from '../../navigation/utils/formatBytes';
import { useSettingsStore } from '../../stores';
import {
  clearPackNameOverride,
  getPackDisplayName,
  loadPackNameOverrides,
  setPackNameOverride,
  transferPackNameOverride,
} from '../../utils/offlinePackNames';

type RenameState = {
  packId: string;
  value: string;
  original: string;
};

function formatDownloadedDate(createdAt: string): string {
  const date = new Date(createdAt);
  if (isNaN(date.getTime())) {
    return 'unknown';
  }
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

function describeStatus(pack: OfflineMapPack): string | null {
  const required = pack.status.requiredResourceCount ?? 0;
  const completed = pack.status.completedResourceCount ?? 0;

  if (pack.status.state === 'active') {
    const pct = required > 0 ? Math.round((completed / required) * 100) : 0;
    return `downloading ${pct}%`;
  }

  if (pack.status.state === 'complete') {
    return null;
  }

  if (required > 0 && completed < required) {
    const pct = Math.round((completed / required) * 100);
    return `incomplete ${pct}%`;
  }

  return 'failed';
}

function makeStyles(COLORS: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    content: {
      gap: 12,
      paddingBottom: 12,
    },
    actions: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingBottom: 12,
      gap: 8,
    },
    actionButton: {
      flex: 1,
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
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
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
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const COLORS = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const settingsStore = useSettingsStore();

  const [packs, setPacks] = useState<OfflineMapPack[]>([]);
  const [packNameOverrides, setPackNameOverrides] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyPackId, setBusyPackId] = useState<string | null>(null);
  const [renameState, setRenameState] = useState<RenameState | null>(null);

  const loadData = useCallback(async () => {
    const [nextPacks, overrides] = await Promise.all([
      OfflineMapService.listPacks(),
      loadPackNameOverrides(),
    ]);
    setPacks(nextPacks);
    setPackNameOverrides(overrides);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadData()
      .catch((error) => {
        console.error('Failed to load map library:', error);
        if (!cancelled) {
          Alert.alert(
            'Could Not Load Maps',
            'Something went wrong reading your downloaded maps. Please try again.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadData]);

  const totalBytes = useMemo(
    () =>
      packs.reduce((sum, p) => sum + (p.status?.completedResourceSize ?? 0), 0),
    [packs],
  );

  const subtitle = useMemo(() => {
    const label = `${packs.length} area${packs.length === 1 ? '' : 's'}`;
    return `${label} · ${formatBytes(totalBytes)}`;
  }, [packs.length, totalBytes]);

  const handleRefreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const performDelete = useCallback(
    async (pack: OfflineMapPack) => {
      setBusyPackId(pack.id);
      try {
        await OfflineMapService.deletePack(pack.id);
        await clearPackNameOverride(pack.id);
        await loadData();
      } catch (error) {
        console.error('Failed to delete offline pack:', error);
        Alert.alert(
          'Delete Failed',
          'Could not delete this map. Please try again.',
        );
      } finally {
        setBusyPackId(null);
      }
    },
    [loadData],
  );

  const confirmDelete = useCallback(
    (pack: OfflineMapPack) => {
      const displayName = getPackDisplayName(pack, packNameOverrides);
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
    [packNameOverrides, performDelete],
  );

  const performRefresh = useCallback(
    async (pack: OfflineMapPack) => {
      setBusyPackId(pack.id);
      try {
        const displayName = getPackDisplayName(pack, packNameOverrides);
        const { centerLng, centerLat, radiusMiles } = pack.metadata;
        const bounds = boundsFromRadius(
          { longitude: centerLng, latitude: centerLat },
          radiusMiles,
        );
        const zoomRange = settingsStore.highDetailOffline
          ? HIGH_DETAIL_OFFLINE_ZOOM
          : DEFAULT_OFFLINE_ZOOM;

        const replacementPack = await OfflineMapService.downloadRegion({
          bounds,
          metadata: {
            ...pack.metadata,
            name: displayName,
            createdAt: new Date().toISOString(),
          },
          zoomRange,
        });

        await transferPackNameOverride(pack.id, replacementPack.id);
        await OfflineMapService.deletePack(pack.id);
        await loadData();
      } catch (error) {
        console.error('Failed to refresh offline pack:', error);
        Alert.alert(
          'Refresh Failed',
          'Could not refresh this map. Your existing offline map was kept. Please try again.',
        );
      } finally {
        setBusyPackId(null);
      }
    },
    [loadData, packNameOverrides, settingsStore.highDetailOffline],
  );

  const confirmRefresh = useCallback(
    (pack: OfflineMapPack) => {
      const displayName = getPackDisplayName(pack, packNameOverrides);
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
    [packNameOverrides, performRefresh],
  );

  const openRename = useCallback(
    (pack: OfflineMapPack) => {
      setRenameState({
        packId: pack.id,
        value: getPackDisplayName(pack, packNameOverrides),
        original: getPackDisplayName(pack, packNameOverrides),
      });
    },
    [packNameOverrides],
  );

  const cancelRename = useCallback(() => {
    setRenameState(null);
  }, []);

  const saveRename = useCallback(async () => {
    if (!renameState) {
      return;
    }

    const trimmed = renameState.value.trim();
    const nextName = trimmed || renameState.original;

    await setPackNameOverride(renameState.packId, nextName);
    setPackNameOverrides((prev) => ({
      ...prev,
      [renameState.packId]: nextName,
    }));
    setRenameState(null);
  }, [renameState]);

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
        {loading ? null : packs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No offline areas yet</Text>
            <Text style={styles.emptyBody}>
              Download your area so the map keeps working without a signal.
            </Text>
            <AppButton
              label="Download your area"
              icon="download-outline"
              onPress={() => navigation.navigate('MapScreen')}
            />
          </View>
        ) : (
          packs.map((pack) => {
            const displayName = getPackDisplayName(pack, packNameOverrides);
            const isBusy = busyPackId === pack.id;
            const isAnyBusy = busyPackId !== null;
            const sizeText = formatBytes(
              pack.status?.completedResourceSize ?? 0,
            );
            const status = describeStatus(pack);
            const subtitleParts = [
              `~${pack.metadata.radiusMiles} mi radius`,
              sizeText,
              `downloaded ${formatDownloadedDate(pack.metadata.createdAt)}`,
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
                    navigation.navigate('MapScreen', {
                      center: {
                        latitude: pack.metadata.centerLat,
                        longitude: pack.metadata.centerLng,
                      },
                      radiusMiles: pack.metadata.radiusMiles,
                    });
                  }}
                />
                <View style={styles.actions}>
                  <AppButton
                    label="Rename"
                    icon="create-outline"
                    variant="tinted"
                    onPress={() => openRename(pack)}
                    disabled={isAnyBusy}
                    style={styles.actionButton}
                  />
                  <AppButton
                    label="Refresh"
                    icon="refresh-outline"
                    variant="tinted"
                    onPress={() => confirmRefresh(pack)}
                    disabled={isAnyBusy}
                    loading={isBusy}
                    style={styles.actionButton}
                  />
                  <AppButton
                    label="Delete"
                    icon="trash-outline"
                    variant="tinted"
                    onPress={() => confirmDelete(pack)}
                    disabled={isAnyBusy}
                    style={styles.actionButton}
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
