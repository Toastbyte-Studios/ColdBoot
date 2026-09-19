import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import GroupContainer from '../../components/GroupContainer';
import IconButton from '../../components/IconButton';
import ModuleRow from '../../components/ModuleRow';
import { Text } from '../../components/ScaledText';
import StackScreen from '../../components/StackScreen';
import { useTheme } from '../../hooks/useTheme';
import { useEmergencyPlanStore } from '../../stores';
import { TEXT_GUTTER } from '../../theme';

const isAndroid = Platform.OS === 'android';

/**
 * Lists all emergency contacts with options to add or edit them.
 *
 * @returns The emergency contacts list screen.
 */
export default observer(function EmergencyContactsScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const store = useEmergencyPlanStore();
  const COLORS = useTheme();

  const contacts = store.contacts;

  return (
    <StackScreen
      title="Emergency Contacts"
      subtitle={`${contacts.length} contact${contacts.length === 1 ? '' : 's'}`}
      trailing={
        <IconButton
          name="add-circle-outline"
          size={22}
          accessibilityLabel="Add contact"
          onPress={() => navigation.navigate('NewEmergencyContact')}
        />
      }
    >
      {contacts.length === 0 ? (
        <Text
          style={[
            styles.emptyText,
            { color: isAndroid ? COLORS.MUTED : COLORS.MUTED_ON_GROUND },
          ]}
        >
          No contacts yet. Add a contact to get started.
        </Text>
      ) : (
        <GroupContainer>
          {contacts.map((contact, index) => (
            <ModuleRow
              key={contact.id}
              title={contact.name}
              icon="person-outline"
              subtitle={
                contact.notes
                  ? `${contact.relationship} · ${contact.phone}. ${contact.notes}`
                  : `${contact.relationship} · ${contact.phone}`
              }
              variant="tool"
              showSeparator={index < contacts.length - 1}
              onPress={() =>
                navigation.navigate('EditEmergencyContact', { contact })
              }
            />
          ))}
        </GroupContainer>
      )}
    </StackScreen>
  );
});

const styles = StyleSheet.create({
  emptyText: {
    fontSize: 16,
    paddingHorizontal: isAndroid ? TEXT_GUTTER : 0,
  },
});
