/*
 * The answer of `routine/{id}/zone-order/`: the exercises of a day in the
 * order that minimises the walks between the zones of a location.
 */

export interface ZoneOrderItem {
    slotId: number,
    slotEntryId: number,
    exerciseId: number,
    zoneId: number | null,
    zoneName: string | null,
    plannedIndex: number,
}

export interface MissingEquipment {
    exerciseId: number,
    equipment: { id: number, name: string }[],
}

export interface ZoneOrder {
    locationId: number | null,
    locationName: string,
    items: ZoneOrderItem[],
    zoneChangesPlanned: number,
    zoneChangesSuggested: number,
    missingEquipment: MissingEquipment[],
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function zoneOrderFromJson(json: any): ZoneOrder {
    return {
        locationId: json.location ?? null,
        locationName: json.location_name ?? '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: (json.items ?? []).map((item: any): ZoneOrderItem => ({
            slotId: item.slot_id,
            slotEntryId: item.slot_entry_id,
            exerciseId: item.exercise_id,
            zoneId: item.zone_id ?? null,
            zoneName: item.zone_name ?? null,
            plannedIndex: item.planned_index,
        })),
        zoneChangesPlanned: json.zone_changes_planned ?? 0,
        zoneChangesSuggested: json.zone_changes_suggested ?? 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        missingEquipment: (json.missing_equipment ?? []).map((m: any): MissingEquipment => ({
            exerciseId: m.exercise_id,
            equipment: m.equipment ?? [],
        })),
    };
}
