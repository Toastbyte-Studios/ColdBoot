import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import AppButton from '../../components/AppButton';
import { Text } from '../../components/ScaledText';
import StackScreen from '../../components/StackScreen';
import { useTheme } from '../../hooks/useTheme';
import { useChecklistStore } from '../../stores';
import { SCREEN_GUTTER, SPACING } from '../../theme';
import { FormInput } from '../Shared/Prepper';

const MAX_CHECKLIST_NAME_LENGTH = 60;
const isAndroid = Platform.OS === 'android';

export default observer(function NewChecklistScreen(): React.JSX.Element {
  const COLORS = useTheme();
  const checklistStore = useChecklistStore();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const trimmedName = name.trim();
  const canCreate = trimmedName.length > 0 && !isSaving;
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const handleCreate = async () => {
    if (!trimmedName || isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      const created = await checklistStore.createChecklist(trimmedName);
      navigation.replace('ChecklistEntry', { checklist: created });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to create checklist',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <StackScreen title="New Checklist">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <FormInput
            label="Name"
            placeholder="e.g. Winter car kit"
            value={name}
            onChangeText={(nextName) => {
              setName(nextName);
              if (errorMessage) {
                setErrorMessage(null);
              }
            }}
            maxLength={MAX_CHECKLIST_NAME_LENGTH}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
            blurOnSubmit={false}
          />
          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
          <AppButton
            label="Create checklist"
            onPress={handleCreate}
            disabled={!canCreate}
            loading={isSaving}
            fullWidth
          />
        </View>
      </KeyboardAvoidingView>
    </StackScreen>
  );
});

const makeStyles = (COLORS: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    content: {
      marginTop: SPACING.md,
      marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
      marginBottom: SPACING.md,
      gap: SPACING.sm,
    },
    errorText: {
      color: COLORS.ERROR,
      fontSize: 13,
      lineHeight: 18,
      marginTop: -SPACING.xs,
    },
  });
