import React, { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../hooks/useTheme';
import { cardSurface } from '../../../theme/cardSurface';

type InfoBoxProps = {
  icon: string;
  children: ReactNode;
};

export default function InfoBox({ icon, children }: InfoBoxProps) {
  const COLORS = useTheme();

  return (
    <View style={[styles.container, cardSurface(COLORS)]}>
      <Icon name={icon} size={20} color={COLORS.PRIMARY_DARK} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    marginBottom: 40,
    width: '100%',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    marginLeft: 8,
  },
});
