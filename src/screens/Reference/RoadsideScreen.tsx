import React, { JSX } from 'react';
import CategoryList from '../../components/CategoryList';
import data from '../../data/roadside.json';
import { CategoryType } from '../../types/common-types';

const categoryMap: Record<string, string> = {
  TiresAndWheels: 'Tires & Wheels',
  BatteryAndElectrical: 'Battery & Electrical',
  EngineAndFluids: 'Engine & Fluids',
  StuckAndRecovery: 'Stuck & Recovery',
  RoadsideSafety: 'Roadside Safety',
  VehicleKit: 'Vehicle Kit',
};

/** Exported so tests can check every data category has a row here. */
export const roadsideCategories: CategoryType[] = [
  {
    title: 'Tires & Wheels',
    icon: 'disc-outline',
    id: 'roadside_tires_wheels',
    category: categoryMap.TiresAndWheels,
    data: data.entries,
  },
  {
    title: 'Battery & Electrical',
    icon: 'battery-charging-outline',
    id: 'roadside_battery_electrical',
    category: categoryMap.BatteryAndElectrical,
    data: data.entries,
  },
  {
    title: 'Engine & Fluids',
    icon: 'speedometer-outline',
    id: 'roadside_engine_fluids',
    category: categoryMap.EngineAndFluids,
    data: data.entries,
  },
  {
    title: 'Stuck & Recovery',
    icon: 'trail-sign-outline',
    id: 'roadside_stuck_recovery',
    category: categoryMap.StuckAndRecovery,
    data: data.entries,
  },
  {
    title: 'Roadside Safety',
    icon: 'shield-checkmark-outline',
    id: 'roadside_safety',
    category: categoryMap.RoadsideSafety,
    data: data.entries,
  },
  {
    title: 'Vehicle Kit',
    icon: 'briefcase-outline',
    id: 'roadside_vehicle_kit_category',
    category: categoryMap.VehicleKit,
    data: data.entries,
  },
];

/**
 * Renders the Roadside reference screen.
 *
 * @remarks
 * Lists roadside service categories (tires, battery, engine, recovery,
 * safety, vehicle kit) backed by `roadside.json`. Each row opens the shared
 * category screen, and entries render on the shared entry screen.
 *
 * @returns A React element containing the Roadside screen layout.
 */
export default function RoadsideScreen(): JSX.Element {
  const disclaimer: string = data.metadata?.disclaimer ?? '';

  return (
    <CategoryList
      title="Roadside"
      icon="car-outline"
      disclaimer={disclaimer}
      categories={roadsideCategories}
    />
  );
}
