import React, { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import GroupContainer from '../../../components/GroupContainer';
import SectionEyebrow from '../../../components/SectionEyebrow';
import { SPACING } from '../../../theme';

type Props = {
  title: string;
};

/**
 * A titled group of status rows. Owns the gap to the next section: the eyebrow
 * only spaces itself from what follows it, so stacked groups need it here.
 */
export default function StatusSection({
  title,
  children,
}: PropsWithChildren<Props>) {
  return (
    <View style={styles.section}>
      <SectionEyebrow>{title}</SectionEyebrow>
      <GroupContainer>{children}</GroupContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: SPACING.xl,
  },
});
