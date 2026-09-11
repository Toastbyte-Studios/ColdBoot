import React, { ReactNode, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../hooks/useTheme';
import { ColorScheme } from '../../../theme/colors';

type InfoBoxProps = {
  icon: string;
  children: ReactNode;
};

export default function InfoBox({ icon, children }: InfoBoxProps) {
  const COLORS = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={COLORS.BRAND_GRADIENT}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={styles.background}
      />
      <Icon name={icon} size={20} color={COLORS.PRIMARY_DARK} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const makeStyles = (COLORS: ColorScheme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: COLORS.SECONDARY_ACCENT,
      padding: 12,
      marginBottom: 40,
      width: '100%',
      overflow: 'hidden',
    },
    background: {
      ...StyleSheet.absoluteFillObject,
    },
    content: {
      flex: 1,
      marginLeft: 8,
    },
  });
