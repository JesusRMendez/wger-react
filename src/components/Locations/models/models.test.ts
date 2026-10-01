import { LocationZone, LocationZoneAdapter } from "@/components/Locations/models/LocationZone";
import { TrainingLocationAdapter } from "@/components/Locations/models/TrainingLocation";
import { zoneOrderFromJson } from "@/components/Locations/models/ZoneOrder";

describe('training location models', () => {
    test('parses and serializes a location', () => {
        const adapter = new TrainingLocationAdapter();
        const location = adapter.fromJson({ id: 3, name: 'Gym centro', is_default: true, equipment: [1, 8], available_minutes: 45 });

        expect(location).toMatchObject({ id: 3, name: 'Gym centro', isDefault: true, equipment: [1, 8], availableMinutes: 45 });
        expect(adapter.toJson(location)).toEqual({
            name: 'Gym centro', is_default: true, equipment: [1, 8], available_minutes: 45
        });
    });

    test('a location without minutes or equipment', () => {
        const location = new TrainingLocationAdapter().fromJson({ id: 1, name: 'Home', is_default: false });

        expect(location.availableMinutes).toBeNull();
        expect(location.equipment).toEqual([]);
    });

    test('parses and serializes a zone', () => {
        const adapter = new LocationZoneAdapter();
        const zone = adapter.fromJson({ id: 5, location: 3, name: 'Racks', order: 2, equipment: [8] });

        expect(zone).toEqual(new LocationZone(5, 3, 'Racks', 2, [8]));
        expect(adapter.toJson(zone)).toEqual({ location: 3, name: 'Racks', order: 2, equipment: [8] });
    });

    test('parses the zone order of the contract', () => {
        const order = zoneOrderFromJson({
            location: 3,
            location_name: 'Gym centro',
            items: [{ slot_id: 10, slot_entry_id: 22, exercise_id: 192, zone_id: 5, zone_name: 'Rack', planned_index: 0 }],
            zone_changes_planned: 4,
            zone_changes_suggested: 2,
            missing_equipment: [{ exercise_id: 88, equipment: [{ id: 8, name: 'Bench' }] }],
        });

        expect(order).toEqual({
            locationId: 3,
            locationName: 'Gym centro',
            items: [{ slotId: 10, slotEntryId: 22, exerciseId: 192, zoneId: 5, zoneName: 'Rack', plannedIndex: 0 }],
            zoneChangesPlanned: 4,
            zoneChangesSuggested: 2,
            missingEquipment: [{ exerciseId: 88, equipment: [{ id: 8, name: 'Bench' }] }],
        });
    });

    test('zone order tolerates missing optional parts', () => {
        const order = zoneOrderFromJson({ items: [{ slot_id: 1, slot_entry_id: 2, exercise_id: 3, planned_index: 0 }] });

        expect(order.locationId).toBeNull();
        expect(order.items[0].zoneName).toBeNull();
        expect(order.missingEquipment).toEqual([]);
    });
});
