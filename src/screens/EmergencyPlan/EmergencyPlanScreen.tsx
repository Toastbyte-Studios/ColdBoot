import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React from 'react';
import GroupContainer from '../../components/GroupContainer';
import ModuleRow from '../../components/ModuleRow';
import StackScreen from '../../components/StackScreen';
import { useEmergencyPlanStore } from '../../stores';

/**
 * Emergency Contact & Rally Point Planner landing screen.
 *
 * Presents the three planning sections:
 * - Emergency Contacts
 * - Rally Points
 * - Communication Plan
 *
 * @returns A screen layout with navigation rows for each section.
 */
export default observer(function EmergencyPlanScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const store = useEmergencyPlanStore();

  const sections = [
    {
      title: 'Emergency Contacts',
      subtitle: `${store.contacts.length} contact${store.contacts.length !== 1 ? 's' : ''}`,
      icon: 'people-outline',
      screen: 'EmergencyContacts',
    },
    {
      title: 'Rally Points',
      subtitle: `${store.rallyPoints.length} location${store.rallyPoints.length !== 1 ? 's' : ''}`,
      icon: 'location-outline',
      screen: 'RallyPoints',
    },
    {
      title: 'Communication Plan',
      subtitle: 'Who calls whom, fallback plan',
      icon: 'chatbubbles-outline',
      screen: 'CommunicationPlan',
    },
  ];

  return (
    <StackScreen title="Emergency Planner" subtitle="Stored offline">
      <GroupContainer>
        {sections.map((section, index) => (
          <ModuleRow
            key={section.screen}
            title={section.title}
            subtitle={section.subtitle}
            icon={section.icon}
            variant="tool"
            showSeparator={index < sections.length - 1}
            onPress={() => navigation.navigate(section.screen)}
          />
        ))}
      </GroupContainer>
    </StackScreen>
  );
});
