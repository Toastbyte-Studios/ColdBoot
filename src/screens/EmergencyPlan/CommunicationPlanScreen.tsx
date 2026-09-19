import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import IconButton from '../../components/IconButton';
import StackScreen from '../../components/StackScreen';
import { useEmergencyPlanStore } from '../../stores';
import { FormButtonRow, FormTextArea } from '../Shared/Prepper';
import { FormCard } from '../Shared/Prepper/FormCard';
import { ImportModal } from './ImportModal';
import {
  parseSharedCommunicationPlan,
  shareCommunicationPlan,
} from './shareUtils';

/**
 * Structured communication plan template screen.
 *
 * Allows users to record:
 * - Who calls whom
 * - What to do if phones are down
 * - Out-of-area contact
 * - Check-in schedule
 *
 * Share exports the plan via the native share sheet; Import accepts a
 * paste of the same format from another ColdBoot user.
 *
 * @returns The communication plan screen.
 */
export default observer(function CommunicationPlanScreen() {
  const navigation = useNavigation();
  const store = useEmergencyPlanStore();

  const plan = store.communicationPlan;
  const [whoCallsWhom, setWhoCallsWhom] = useState(plan.whoCallsWhom);
  const [ifPhonesDown, setIfPhonesDown] = useState(plan.ifPhonesDown);
  const [outOfAreaContact, setOutOfAreaContact] = useState(
    plan.outOfAreaContact,
  );
  const [checkInSchedule, setCheckInSchedule] = useState(plan.checkInSchedule);
  const [isDirty, setIsDirty] = useState(false);
  const [importVisible, setImportVisible] = useState(false);

  // Sync form fields when the store's plan loads asynchronously (e.g. on first
  // mount before SQLite has finished reading). Only apply if the form is clean
  // so we don't overwrite unsaved edits the user has already made.
  useEffect(() => {
    if (!isDirty) {
      setWhoCallsWhom(store.communicationPlan.whoCallsWhom);
      setIfPhonesDown(store.communicationPlan.ifPhonesDown);
      setOutOfAreaContact(store.communicationPlan.outOfAreaContact);
      setCheckInSchedule(store.communicationPlan.checkInSchedule);
    }
  }, [store.communicationPlan, isDirty]);

  const markDirty = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setIsDirty(true);
  };

  const handleSave = async () => {
    try {
      await store.saveCommunicationPlan({
        whoCallsWhom,
        ifPhonesDown,
        outOfAreaContact,
        checkInSchedule,
      });
      setIsDirty(false);
      Alert.alert('Saved', 'Communication plan saved.');
    } catch (error) {
      Alert.alert('Error', (error as Error).message || 'Failed to save plan');
    }
  };

  const handleShare = async () => {
    try {
      await shareCommunicationPlan(store.communicationPlan);
    } catch {
      // User cancelled or share failed — no-op
    }
  };

  const handleImport = async (raw: string) => {
    const data = parseSharedCommunicationPlan(raw);
    if (!data) {
      Alert.alert(
        'Invalid data',
        'The pasted text is not a valid Cold Boot communication plan.',
      );
      return;
    }
    setWhoCallsWhom(data.whoCallsWhom);
    setIfPhonesDown(data.ifPhonesDown);
    setOutOfAreaContact(data.outOfAreaContact);
    setCheckInSchedule(data.checkInSchedule);
    setIsDirty(true);
    setImportVisible(false);
    Alert.alert(
      'Plan imported',
      'Review the imported plan and tap "Save Plan" to save it.',
    );
  };

  return (
    <StackScreen
      title="Communication Plan"
      note="Record your family communication plan below. It is stored offline on your device."
      keyboardShouldPersistTaps="handled"
      trailing={
        <>
          <IconButton
            name="download-outline"
            size={22}
            accessibilityLabel="Import communication plan"
            onPress={() => setImportVisible(true)}
          />
          <IconButton
            name="share-outline"
            size={22}
            accessibilityLabel="Share communication plan"
            onPress={handleShare}
          />
        </>
      }
    >
      <FormCard testID="communication-plan-form">
        <FormTextArea
          label="Who calls whom?"
          placeholder="e.g. Dad calls Mom, Mom calls kids, eldest child calls neighbors..."
          value={whoCallsWhom}
          onChangeText={markDirty(setWhoCallsWhom)}
          accessibilityLabel="Who calls whom"
        />

        <FormTextArea
          label="If phones are down…"
          placeholder="e.g. Meet at rally point A within 2 hours, leave note on door..."
          value={ifPhonesDown}
          onChangeText={markDirty(setIfPhonesDown)}
          accessibilityLabel="If phones are down"
        />

        <FormTextArea
          label="Out-of-area contact"
          placeholder="e.g. Aunt Jane in Denver: (555) 123-4567 — all family members will check in with her..."
          value={outOfAreaContact}
          onChangeText={markDirty(setOutOfAreaContact)}
          accessibilityLabel="Out of area contact"
        />

        <FormTextArea
          label="Check-in schedule"
          placeholder="e.g. Check in every 6 hours at 6am, 12pm, 6pm, midnight..."
          value={checkInSchedule}
          onChangeText={markDirty(setCheckInSchedule)}
          accessibilityLabel="Check in schedule"
        />

        <FormButtonRow
          onCancel={() => navigation.goBack()}
          onSave={handleSave}
          saveDisabled={!isDirty}
          saveLabel="Save Plan"
          cancelLabel="Back"
        />
      </FormCard>

      <ImportModal
        visible={importVisible}
        title="Import Communication Plan"
        hint="Paste the share code received from another Cold Boot user. Existing content will be replaced."
        onClose={() => setImportVisible(false)}
        onImport={handleImport}
      />
    </StackScreen>
  );
});
