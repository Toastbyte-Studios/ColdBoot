import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { Alert } from 'react-native';
import GroupContainer from '../../components/GroupContainer';
import ModuleRow from '../../components/ModuleRow';
import StackScreen from '../../components/StackScreen';
import { useEmergencyPlanStore } from '../../stores';
import { FormButtonRow, FormInput, FormTextArea } from '../Shared/Prepper';
import { FormCard } from '../Shared/Prepper/FormCard';
import { ContactPickerModal, contactsAvailable } from './ContactPickerModal';

/**
 * Screen for adding a new emergency contact.
 *
 * Supports two entry methods:
 * - Manual entry of name, relationship, phone, and notes.
 * - Import from the device's native contacts (pre-fills name and phone).
 *
 * @returns The new emergency contact form screen.
 */
export default observer(function NewEmergencyContactScreen() {
  const navigation = useNavigation();
  const store = useEmergencyPlanStore();

  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    if (!relationship.trim()) {
      Alert.alert('Error', 'Relationship is required');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Error', 'Phone number is required');
      return;
    }

    try {
      await store.createContact(name, relationship, phone, notes || undefined);
      navigation.goBack();
    } catch (error) {
      Alert.alert(
        'Error',
        (error as Error).message || 'Failed to save contact',
      );
    }
  };

  const handleContactSelected = (contactName: string, contactPhone: string) => {
    setName(contactName);
    setPhone(contactPhone);
  };

  return (
    <StackScreen title="New Contact" keyboardShouldPersistTaps="handled">
      {/* Import from device contacts — only shown when the native module is
          available. A row rather than a field: it fills the form in, it is not
          part of it. */}
      {contactsAvailable ? (
        <GroupContainer>
          <ModuleRow
            title="Import from Contacts"
            subtitle="Fills in a name and phone number"
            icon="people-outline"
            variant="tool"
            onPress={() => setPickerVisible(true)}
          />
        </GroupContainer>
      ) : null}

      <FormCard testID="emergency-contact-form">
        <FormInput
          label="Name *"
          placeholder="Enter full name..."
          value={name}
          onChangeText={setName}
          accessibilityLabel="Contact name"
        />
        <FormInput
          label="Relationship *"
          placeholder="e.g. Spouse, Parent, Neighbor..."
          value={relationship}
          onChangeText={setRelationship}
          accessibilityLabel="Relationship"
        />
        <FormInput
          label="Phone Number *"
          placeholder="Enter phone number..."
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          accessibilityLabel="Phone number"
        />
        <FormTextArea
          label="Notes (optional)"
          placeholder="Additional details..."
          value={notes}
          onChangeText={setNotes}
          accessibilityLabel="Notes"
        />
        <FormButtonRow
          onCancel={() => navigation.goBack()}
          onSave={handleSave}
          saveDisabled={!name.trim() || !relationship.trim() || !phone.trim()}
        />
      </FormCard>

      <ContactPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleContactSelected}
      />
    </StackScreen>
  );
});
